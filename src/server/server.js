// HttpServer: the board page's JSON API and its static files. Local only (127.0.0.1).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

export class HttpServer {
  /** `commit` is the git commit the process started from (null when unknown); GET /api/version reports it. */
  constructor(board, webDir, commit = null, docs = null, claude = null) {
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
    ];
  }

  listen(port, host = "127.0.0.1") {
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(port, host, () => resolve(this.server.address().port));
    });
  }

  close() { return new Promise(resolve => this.server.close(() => resolve())); }

  async #handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return this.#api(req, res, url);
    if (req.method !== "GET") return send(res, 405, "text/plain", "Method not allowed");
    this.#static(res, url.pathname);
  }

  async #api(req, res, url) {
    const path_ = decodeURIComponent(url.pathname);
    for (const [method, re, fn] of this.routes) {
      const m = re.exec(path_);
      if (!m || method !== req.method) continue;
      try {
        const body = method === "GET" ? {} : await readJson(req);
        return json(res, 200, fn(url.searchParams, body, m));
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
