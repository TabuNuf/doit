// SmtpSender: a minimal SMTP client over implicit TLS (port 465). One mail per connection.
// `send` never throws: it returns {ok: true} or {ok: false, error}. The password is never put in an error.

import tls from "node:tls";

const TIMEOUT_MS = 30000;

class Refused extends Error {}

export class SmtpSender {
  constructor({ host = "smtp.gmail.com", port = 465, connect = tls.connect, timeoutMs = TIMEOUT_MS } = {}) {
    this.host = host;
    this.port = port;
    this.connect = connect;
    this.timeoutMs = timeoutMs;
  }

  /** `message` is {from, to, text}: the envelope addresses and the whole mail text with CRLF line ends (see `composeMail`). */
  async send(account, message) {
    let socket;
    let timer;
    try {
      socket = this.connect({ host: this.host, port: this.port, servername: this.host });
      const lines = new Replies(socket);
      const expire = new Promise((_, reject) => { timer = setTimeout(() => reject(new Refused("Mail server timed out")), this.timeoutMs); });
      const run = async () => {
        const talk = async (command, ok, fail) => {
          if (command !== null) socket.write(command + "\r\n");
          const r = await lines.next();
          if (!ok.includes(r.code)) throw new Refused(fail?.[r.code] ?? `Mail server said: ${r.code} ${r.text}`);
          return r;
        };
        await talk(null, [220]);
        await talk("EHLO doit.local", [250]);
        const plain = Buffer.from(`\0${account.address}\0${account.password}`).toString("base64");
        await talk(`AUTH PLAIN ${plain}`, [235], { 535: "Login refused: check the app password" });
        await talk(`MAIL FROM:<${message.from}>`, [250]);
        await talk(`RCPT TO:<${message.to}>`, [250, 251]);
        await talk("DATA", [354]);
        socket.write(dotStuff(message.text) + ".\r\n");
        await talk(null, [250]);
      };
      await Promise.race([run(), expire, lines.failed]);
      await quit(socket, lines);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Refused ? e.message : `Could not reach the mail server: ${e.code ?? e.message}` };
    } finally {
      clearTimeout(timer);
      socket?.destroy();
    }
  }
}

/** Says goodbye and waits briefly for the reply; the mail is already accepted, so nothing here can fail the send. */
async function quit(socket, lines) {
  try {
    socket.write("QUIT\r\n");
    await Promise.race([lines.next(), lines.failed, new Promise(r => setTimeout(r, 1000).unref())]);
  } catch { /* the mail is accepted */ }
}

/** Lines starting with a dot get another one, and the text ends with CRLF. */
function dotStuff(text) {
  const t = text.endsWith("\r\n") ? text : text + "\r\n";
  return t.replace(/^\./gm, "..");
}

/** Server replies from a socket: `next()` resolves with {code, text} once the last line of a reply (`NNN `) has arrived. */
class Replies {
  constructor(socket) {
    this.buffer = "";
    this.queue = [];
    this.waiting = [];
    this.ended = null;
    this.failed = new Promise((_, reject) => { this.fail = reject; });
    this.failed.catch(() => {});
    socket.setEncoding?.("utf8");
    socket.on("data", chunk => { this.buffer += chunk; this.#parse(); });
    socket.on("error", e => { this.ended = e; this.fail(e); });
    socket.on("close", () => { this.ended ??= new Refused("Mail server closed the connection"); this.fail(this.ended); });
  }

  #parse() {
    let i;
    while ((i = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, i).replace(/\r$/, "");
      this.buffer = this.buffer.slice(i + 1);
      const m = line.match(/^(\d{3})([ -])(.*)$/);
      if (!m) continue;
      this.pending = [...(this.pending ?? []), m[3]];
      if (m[2] === " ") {
        const reply = { code: Number(m[1]), text: this.pending.join(" ") };
        this.pending = null;
        const w = this.waiting.shift();
        if (w) w(reply); else this.queue.push(reply);
      }
    }
  }

  next() {
    const r = this.queue.shift();
    return r ? Promise.resolve(r) : new Promise(resolve => this.waiting.push(resolve));
  }
}
