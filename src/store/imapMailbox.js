// ImapMailbox: a minimal IMAP client over implicit TLS (port 993), written for Gmail. Doit selects only INBOX, the
// Marketing label and the Sent mailbox, reads only a few header fields, never fetches a body and never creates a mailbox.
// `session` never throws for login, mailbox or network failures: it returns {ok, value} or {ok: false, error}.

import tls from "node:tls";
import { parseMessageHeaders } from "../domain/mail.js";

const TIMEOUT_MS = 30000;
const FIELDS = "FROM SUBJECT DATE MESSAGE-ID IN-REPLY-TO";

class ImapError extends Error {}

const quote = s => {
  if (/[\r\n\0]/.test(s)) throw new ImapError("Not usable in a mail command");
  return `"${s.replace(/[\\"]/g, "\\$&")}"`;
};
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** The server's side of one connection: logical responses (a line with its `{n}` literals) and tagged commands. */
class Conn {
  constructor(socket, timeoutMs) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.buffer = "";
    this.queue = [];
    this.waiter = null;
    this.error = null;
    this.tag = 0;
    socket.on("data", d => { this.buffer += d.toString("latin1"); this.#parse(); });
    socket.on("error", e => this.#fail(new ImapError(`Could not reach the mail server: ${e.code ?? e.message}`)));
    socket.on("close", () => this.#fail(new ImapError("Mail server closed the connection")));
  }

  #fail(e) {
    this.error ??= e;
    this.waiter?.reject(this.error);
  }

  /** Splits the buffer into responses; a literal `{n}` at a line end takes the next n bytes and the line goes on after them. */
  #parse() {
    for (;;) {
      let p = 0, text = "";
      const literals = [];
      for (;;) {
        const i = this.buffer.indexOf("\r\n", p);
        if (i < 0) return;
        const line = this.buffer.slice(p, i);
        const m = line.match(/\{(\d+)\+?\}$/);
        if (!m) { text += line; p = i + 2; break; }
        const n = Number(m[1]);
        if (this.buffer.length < i + 2 + n) return;
        text += line.slice(0, m.index) + `\0${literals.length}\0`;
        literals.push(this.buffer.slice(i + 2, i + 2 + n));
        p = i + 2 + n;
      }
      this.buffer = this.buffer.slice(p);
      const r = { text, literals };
      if (this.waiter) this.waiter.resolve(r); else this.queue.push(r);
    }
  }

  read() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiter = null; reject(new ImapError("Mail server timed out")); }, this.timeoutMs);
      const done = f => v => { clearTimeout(timer); this.waiter = null; f(v); };
      this.waiter = { resolve: done(resolve), reject: done(reject) };
    });
  }

  /** Sends one command and returns {status, text, untagged} when its tagged reply arrives. */
  async command(text) {
    const tag = `D${++this.tag}`;
    this.socket.write(`${tag} ${text}\r\n`);
    const untagged = [];
    for (;;) {
      const r = await this.read();
      if (r.text.startsWith(`${tag} `)) {
        const [, status, rest] = r.text.match(/^\S+ (\w+) ?(.*)$/) ?? [];
        return { status, text: rest ?? "", untagged };
      }
      untagged.push(r);
    }
  }
}

/** What a session's callback gets: the commands Doit uses, each throwing ImapError on a refusal. */
class Box {
  constructor(conn) { this.conn = conn; }

  async #ok(command, refusal) {
    const r = await this.conn.command(command);
    if (r.status !== "OK") throw new ImapError(typeof refusal === "function" ? refusal(r) : refusal ?? `Mail server refused: ${r.text}`);
    return r;
  }

  async select(name) {
    await this.#ok(`SELECT ${quote(name)}`, r => /nonexistent|unknown mailbox|not found|doesn.t exist/i.test(r.text) ? `Mailbox ${name} not found` : `Could not open ${name}: ${r.text}`);
  }

  /** UIDs of mail from any of `addresses` in the selected mailbox, 20 addresses to a search. */
  async searchFrom(addresses) {
    const found = new Set();
    for (const part of chunks(addresses.filter(a => a && !/["\\\r\n]/.test(a)), 20)) {
      const keys = part.map(a => `FROM ${quote(a)}`);
      const expr = keys.reduceRight((rest, k) => (rest === null ? k : `OR ${k} ${rest}`), null);
      const r = await this.#ok(`UID SEARCH ${expr}`);
      for (const u of r.untagged) if (u.text.startsWith("* SEARCH")) for (const n of u.text.slice(8).trim().split(/\s+/).filter(Boolean)) found.add(Number(n));
    }
    return [...found].sort((a, b) => a - b);
  }

  /** From, subject, date, Message-ID and In-Reply-To of each UID; never the body. */
  async headers(uids) {
    const out = [];
    for (const part of chunks(uids, 100)) {
      const r = await this.#ok(`UID FETCH ${part.join(",")} (BODY.PEEK[HEADER.FIELDS (${FIELDS})])`);
      for (const u of r.untagged) {
        const uid = u.text.match(/\bUID (\d+)/)?.[1];
        if (!uid || !u.literals.length) continue;
        out.push({ uid: Number(uid), ...parseMessageHeaders(Buffer.from(u.literals[0], "latin1").toString("utf8")) });
      }
    }
    return out;
  }

  async move(uids, target) {
    for (const part of chunks(uids, 100)) await this.#ok(`UID MOVE ${part.join(",")} ${quote(target)}`, r => /nonexistent|unknown mailbox|not found|trycreate/i.test(r.text) ? `Mailbox ${target} not found` : `Could not move mail: ${r.text}`);
  }

  /** The mailbox with the \Sent attribute, or null. */
  async sentMailbox() {
    const r = await this.#ok('LIST "" "*"');
    for (const u of r.untagged) {
      const m = u.text.match(/^\* LIST \(([^)]*)\) (?:"(?:[^"\\]|\\.)*"|NIL) (?:"((?:[^"\\]|\\.)*)"|\0(\d)\0|(\S+))$/i);
      if (m && /(^|\s)\\Sent(\s|$)/i.test(m[1])) return m[2]?.replace(/\\(.)/g, "$1") ?? (m[3] !== undefined ? u.literals[m[3]] : m[4]);
    }
    return null;
  }

  /** Copies the mail with this Message-ID from `from` to `target`; false when `from` has no such mail. */
  async copyByMessageId(from, messageId, target) {
    await this.select(from);
    const r = await this.#ok(`UID SEARCH HEADER Message-ID ${quote(messageId)}`);
    const hit = r.untagged.find(u => u.text.startsWith("* SEARCH"))?.text.slice(8).trim().split(/\s+/).filter(Boolean)[0];
    if (!hit) return false;
    await this.#ok(`UID COPY ${Number(hit)} ${quote(target)}`, x => /nonexistent|unknown mailbox|not found|trycreate/i.test(x.text) ? `Mailbox ${target} not found` : `Could not copy mail: ${x.text}`);
    return true;
  }
}

export class ImapMailbox {
  constructor({ host = "imap.gmail.com", port = 993, connect = tls.connect, timeoutMs = TIMEOUT_MS } = {}) {
    this.host = host;
    this.port = port;
    this.connect = connect;
    this.timeoutMs = timeoutMs;
  }

  /** Connects, logs in, runs `fn(box)`, logs out and closes. Returns {ok: true, value} or {ok: false, error}. */
  async session(account, fn) {
    let socket;
    try {
      socket = this.connect({ host: this.host, port: this.port, servername: this.host });
      const conn = new Conn(socket, this.timeoutMs);
      const hello = await conn.read();
      if (!/^\* (OK|PREAUTH)/i.test(hello.text)) throw new ImapError("The mail server did not greet");
      const login = await conn.command(`LOGIN ${quote(account.address)} ${quote(account.password)}`);
      if (login.status !== "OK") throw new ImapError("Login refused: check the app password");
      const value = await fn(new Box(conn));
      await Promise.race([conn.command("LOGOUT").catch(() => {}), new Promise(r => setTimeout(r, 1000).unref())]);
      return { ok: true, value };
    } catch (e) {
      if (e instanceof ImapError) return { ok: false, error: e.message };
      throw e;
    } finally {
      socket?.destroy();
    }
  }
}
