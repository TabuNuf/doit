// HttpServer: the board page's JSON API and its static files. Local only (127.0.0.1).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { contactRoutes } from "./contactRoutes.js";
import { mailRoutes } from "./mailRoutes.js";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

export class HttpServer {
  /** `commit` is the git commit the process started from (null when unknown); GET /api/version reports it.
   *  `changes` is a port, `subscribe(listener) -> unsubscribe` (and optionally `close()`), that fires when files change.
   *  `contacts` is the ContactBook behind `/api/contacts` and `/api/profiles`; `mailroom` is the Mailroom behind `/api/drafts` and `/api/mail`. A handler may be async. */
  constructor(board, webDir, commit = null, docs = null, claude = null, changes = null, contacts = null, mailroom = null) {
    this.changes = changes;
    this.streams = new Map();
    this.board = board;
    this.claude = claude;
    this.docs = docs;
    this.commit = commit;
    this.webDir = path.resolve(webDir);
    this.server = http.createServer((req, res) => this.#handle(req, res));
    this.routes = [
      ["GET", /^\/api\/version$/, () => ({ commit: this.commit })],
      ["GET", /^\/api\/board$/, (q) => this.board.view({ project: q.get("project") || "all", archived: q.get("archived") === "1" })],
      ["POST", /^\/api\/projects$/, (q, b) => this.board.addProject(b)],
      ["PATCH", /^\/api\/projects\/([^/]+)$/, (q, b, m) => this.board.starProject(m[1], b.starred)],
      ["GET", /^\/api\/epics\/([^/]+)\/([^/]+)$/, (q, b, m) => this.board.epicDocument(m[1], m[2])],
      ["POST", /^\/api\/epics$/, (q, b) => ({ id: this.board.addEpic(b.project, b.name, b.status || "Planned") })],
      ["POST", /^\/api\/epics\/([^/]+)\/([^/]+)\/move$/, (q, b, m) => this.board.moveEpic(m[1], m[2], b.to)],
      ["POST", /^\/api\/tasks$/, (q, b) => this.board.addTask(b)],
      ["PATCH", /^\/api\/tasks\/([^/]+)\/([^/]+)$/, (q, b, m) => this.board.update(`${m[1]}/${m[2]}`, b)],
      ["POST", /^\/api\/tasks\/([^/]+)\/([^/]+)\/move$/, (q, b, m) => this.board.move(`${m[1]}/${m[2]}`, b)],
      ["POST", /^\/api\/tasks\/([^/]+)\/([^/]+)\/comments$/, (q, b, m) => this.board.comment(`${m[1]}/${m[2]}`, b.who || "human", b.text)],
      ["GET", /^\/api\/docs\/tree$/, q => this.docs.tree(q.get("project"))],
      ["GET", /^\/api\/docs\/file$/, q => this.docs.read(q.get("project"), q.get("path"))],
      ["PUT", /^\/api\/docs\/file$/, (q, b) => this.docs.save(q.get("project"), q.get("path"), b.text)],
      ["GET", /^\/api\/docs\/linked$/, q => this.docs.linked(q.get("project"), q.get("path"))],
      ["GET", /^\/api\/claude$/, q => this.claude.panes(q.get("project") || "all")],
      ["PUT", /^\/api\/settings$/, (q, b) => { this.board.setKeepDays(b.keepCompletedDays); return this.board.settings(); }],
      ...(contacts ? contactRoutes(contacts) : []),
      ...(mailroom ? mailRoutes(mailroom) : []),
    ];
  }

  listen(port, host = "127.0.0.1") {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(port, host, () => resolve(this.server.address().port));
    });
  }

  close() {
    // Open event streams would keep server.close waiting, so end them first.
    for (const [res, off] of this.streams) { off(); res.end(); }
    this.streams.clear();
    this.changes?.close?.();
    return new Promise(resolve => this.server.close(() => resolve()));
  }

  /** GET /api/events: `changed` now (a reconnecting page reloads) and on every change. */
  #events(req, res) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "Connection": "keep-alive" });
    const off = this.changes?.subscribe(() => res.write("data: changed\n\n")) ?? (() => {});
    this.streams.set(res, off);
    req.on("close", () => { off(); this.streams.delete(res); });
    res.write("data: changed\n\n");
  }

  async #handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return this.#api(req, res, url);
    if (req.method !== "GET") return send(res, 405, "text/plain", "Method not allowed");
    this.#static(res, url.pathname);
  }

  async #api(req, res, url) {
    if (!sameSite(req)) return json(res, 403, { error: "Refused: request from another site" });
    const path_ = decodeURIComponent(url.pathname);
    if (req.method === "GET" && path_ === "/api/events") return this.#events(req, res);
    for (const [method, re, fn] of this.routes) {
      const m = re.exec(path_);
      if (!m || method !== req.method) continue;
      try {
        const body = method === "GET" ? {} : await readJson(req);
        return json(res, 200, await fn(url.searchParams, body, m));
      } catch (e) {
        return json(res, e.status || 400, { error: e.message });
      }
    }
    json(res, 404, { error: "No such API route" });
  }

  #static(res, pathname) {
    const rel = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = path.resolve(this.webDir, rel);
    if (!file.startsWith(this.webDir + path.sep)) return send(res, 403, "text/plain", "Forbidden");
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, "text/plain", "Not found");
      send(res, 200, TYPES[path.extname(file)] || "application/octet-stream", data);
    });
  }
}

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** A write must come from the page itself: another site's page in the same browser could otherwise send mail or edit tasks.
 *  The Host check stops DNS rebinding; the Origin check stops a cross-site form or fetch. */
export function sameSite(req) {
  const host = req.headers.host ?? "";
  if (!LOCAL.test(host)) return false;
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.origin;
  return !origin || origin === `http://${host}`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 1e6) reject(new Error("Body too large")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Body is not JSON")); } });
    req.on("error", reject);
  });
}

function json(res, status, data) { send(res, status, "application/json; charset=utf-8", JSON.stringify(data)); }

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}
