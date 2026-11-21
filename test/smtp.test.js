import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { SmtpSender } from "../src/store/smtpSender.js";
import { MailAccount } from "../src/store/mailAccount.js";
import { SettingsFile } from "../src/store/settings.js";
import { composeMail, makeDraft } from "../src/domain/mail.js";

const ACCOUNT = { address: "me@example.com", name: "Me", password: "app-pass-123" };

/** A scripted SMTP server on 127.0.0.1: `reply(line, state)` answers each command; `received` is everything it was sent. */
async function fakeServer(script) {
  const received = [];
  let sockets = [];
  const server = net.createServer(sock => {
    sockets.push(sock);
    let buffer = "";
    let inData = false;
    sock.write("220 smtp.example.com ESMTP ready\r\n");
    sock.on("data", d => {
      buffer += d;
      let i;
      while ((i = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        received.push(line);
        if (inData) { if (line === ".") { inData = false; sock.write(script.end ?? "250 2.0.0 OK queued\r\n"); } continue; }
        const cmd = line.split(" ")[0];
        const out = script[cmd]?.(line) ?? "250 OK\r\n";
        if (cmd === "DATA" && out.startsWith("354")) inData = true;
        sock.write(out);
        if (cmd === "QUIT") sock.end();
      }
    });
    sock.on("error", () => {});
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return {
    received,
    port: server.address().port,
    close: () => { sockets.forEach(s => s.destroy()); server.close(); },
  };
}

const sender = srv => new SmtpSender({ port: srv.port, connect: ({ port }) => net.connect(port, "127.0.0.1") });

const EHLO = "250-smtp.example.com at your service\r\n250-SIZE 35882577\r\n250-AUTH LOGIN PLAIN\r\n250 8BITMIME\r\n";
const happy = { QUIT: () => "221 2.0.0 closing\r\n", EHLO: () => EHLO, AUTH: () => "235 2.7.0 Accepted\r\n", DATA: () => "354 Go ahead\r\n" };

const draft = makeDraft({ id: 7, contact: 1, game: "good-box", template: "pitch", subject: "Hej Åse", body: "Hi Ada\n.dot line\n\nBye", created: "x" });
const NOW = new Date(2026, 10, 21, 10, 5, 9);

test("composeMail builds the headers, an encoded subject and a base64 body", () => {
  const m = composeMail(draft, { email: "ada@example.com" }, { address: "me@example.com", name: "Me" }, NOW, "abc123");
  assert.equal(m.messageId, "<doit-7-abc123@example.com>");
  const [head, body] = m.text.split("\r\n\r\n");
  const lines = head.split("\r\n");
  assert.equal(lines[0], 'From: "Me" <me@example.com>');
  assert.equal(lines[1], "To: ada@example.com");
  assert.match(lines[2], /^Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
  assert.match(lines[3], /^Date: Sat, 21 Nov 2026 10:05:09 [+-]\d{4}$/);
  assert.ok(lines.includes("Message-ID: <doit-7-abc123@example.com>"));
  assert.ok(lines.includes("MIME-Version: 1.0") && lines.includes("Content-Transfer-Encoding: base64") && lines.includes("Content-Type: text/plain; charset=utf-8"));
  assert.equal(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString(), "Hi Ada\r\n.dot line\r\n\r\nBye");
  assert.ok(m.text.endsWith("\r\n"));
  assert.ok(body.split("\r\n").every(l => l.length <= 76));
  assert.equal(composeMail(draft, { email: "a@example.com" }, { address: "me@example.com", name: "" }, NOW, "x").text.split("\r\n")[0], "From: me@example.com");
});

test("a mail is sent with exactly this dialogue", async t => {
  const srv = await fakeServer(happy);
  t.after(srv.close);
  const mail = composeMail(draft, { email: "ada@example.com" }, ACCOUNT, NOW, "r1");
  const r = await sender(srv).send(ACCOUNT, mail);
  assert.deepEqual(r, { ok: true });
  const auth = Buffer.from(`\0me@example.com\0app-pass-123`).toString("base64");
  const body = mail.text.split("\r\n").slice(0, -1);
  assert.deepEqual(srv.received.slice(0, 5), ["EHLO doit.local", `AUTH PLAIN ${auth}`, "MAIL FROM:<me@example.com>", "RCPT TO:<ada@example.com>", "DATA"]);
  assert.deepEqual(srv.received.slice(5, 5 + body.length), body);
  assert.deepEqual(srv.received.slice(-2), [".", "QUIT"]);
});

test("a line that starts with a dot is stuffed", async t => {
  const srv = await fakeServer(happy);
  t.after(srv.close);
  await sender(srv).send(ACCOUNT, { from: "me@example.com", to: "a@example.com", text: "Subject: x\r\n\r\n.hidden\r\nend\r\n" });
  assert.ok(srv.received.includes("..hidden"));
});

test("a wrong password is reported, not thrown, and the password is not in the message", async t => {
  const srv = await fakeServer({ ...happy, AUTH: () => "535-5.7.8 Username and Password not accepted.\r\n535 5.7.8 Learn more\r\n" });
  t.after(srv.close);
  const r = await sender(srv).send(ACCOUNT, { from: "me@example.com", to: "a@example.com", text: "x\r\n" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Login refused: check the app password/);
  assert.ok(!r.error.includes("app-pass-123"));
  assert.ok(!srv.received.includes("MAIL FROM:<me@example.com>"));
});

test("a refused recipient, a closed port and a silent server are results too", async t => {
  const srv = await fakeServer({ ...happy, RCPT: () => "550 5.1.1 No such user\r\n" });
  t.after(srv.close);
  const r = await sender(srv).send(ACCOUNT, { from: "me@example.com", to: "gone@example.com", text: "x\r\n" });
  assert.deepEqual([r.ok, /550/.test(r.error)], [false, true]);
  const closed = await new SmtpSender({ connect: () => net.connect(1, "127.0.0.1") }).send(ACCOUNT, { from: "a@example.com", to: "b@example.com", text: "x" });
  assert.equal(closed.ok, false);
  assert.match(closed.error, /Could not reach/);
  const silent = net.createServer(() => {});
  await new Promise(r => silent.listen(0, "127.0.0.1", r));
  t.after(() => silent.close());
  const slow = await new SmtpSender({ timeoutMs: 100, connect: () => net.connect(silent.address().port, "127.0.0.1") }).send(ACCOUNT, { from: "a@example.com", to: "b@example.com", text: "x" });
  assert.match(slow.error, /timed out/);
});

function settings(mail) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doit-mailacct-"));
  const file = new SettingsFile(dir);
  file.write({ projects: [], ...(mail ? { mail } : {}) });
  return file;
}

test("the account is the settings plus the Keychain password, read without a shell", async () => {
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, args]); return "secret\n"; };
  const acct = await new MailAccount(settings({ address: "me@example.com", name: "Me", dailyCap: 5 }), run).read();
  assert.deepEqual(acct, { address: "me@example.com", name: "Me", password: "secret", dailyCap: 5 });
  assert.deepEqual(calls, [["security", ["find-generic-password", "-s", "doit-mail", "-a", "me@example.com", "-w"]]]);
  const dflt = await new MailAccount(settings({ address: "me@example.com" }), run).read();
  assert.deepEqual([dflt.dailyCap, dflt.name], [20, ""]);
});

test("no mail setting or no Keychain item means no account", async () => {
  assert.equal(await new MailAccount(settings(null), async () => "x").read(), null);
  assert.equal(await new MailAccount(settings({ address: "me@example.com" }), async () => null).read(), null);
  assert.equal(await new MailAccount(settings({ address: "me@example.com" }), async () => "\n").read(), null);
});
