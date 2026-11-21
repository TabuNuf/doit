import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { ImapMailbox } from "../src/store/imapMailbox.js";
import { decodeHeader, parseMessageHeaders } from "../src/domain/mail.js";

const ACCOUNT = { address: "me@example.com", password: "app-pass-123" };

/** A scripted IMAP server on 127.0.0.1 answering in Gmail's format. `script(verb, args, tag)` returns the untagged
 *  text and optional tagged status for a command; `received` is each command line without its tag. */
async function fakeServer(script) {
  const received = [];
  const sockets = [];
  const server = net.createServer(sock => {
    sockets.push(sock);
    let buf = "";
    sock.write("* OK Gmail IMAP4rev1 Realtime 1234 - gsmtp\r\n");
    sock.on("data", d => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const [tag, ...rest] = line.split(" ");
        const cmd = rest.join(" ");
        received.push(cmd);
        const verb = /^UID /.test(cmd) ? rest.slice(0, 2).join(" ") : rest[0];
        const r = script[verb]?.(cmd) ?? {};
        sock.write((r.untagged ?? "") + `${tag} ${r.status ?? "OK"} ${r.text ?? `${verb} completed`}\r\n`);
        if (verb === "LOGOUT") sock.end();
      }
    });
    sock.on("error", () => {});
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return { received, port: server.address().port, close: () => { sockets.forEach(s => s.destroy()); server.close(); } };
}

const mailbox = srv => new ImapMailbox({ connect: () => net.connect(srv.port, "127.0.0.1"), timeoutMs: 2000 });

const header = (from, subject, date, id, reply = "") =>
  `From: ${from}\r\nSubject: ${subject}\r\nDate: ${date}\r\nMessage-ID: ${id}\r\n${reply ? `In-Reply-To: ${reply}\r\n` : ""}\r\n`;
const fetchLine = (n, uid, text) =>
  `* ${n} FETCH (UID ${uid} BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID IN-REPLY-TO)] {${Buffer.byteLength(text)}}\r\n${text})\r\n`;

const H1 = header('"Ada Plays" <Ada@Example.com>', "=?UTF-8?B?UmU6IEjDpmxsbw==?=", "Fri, 20 Nov 2026 09:15:00 +0100", "<r1@mail.example.com>", "<doit-7-abc@example.com> <older@example.com>");
const H2 = header("bob@example.org", "=?ISO-8859-1?Q?Hej_=E5ngest?=\r\n =?UTF-8?Q?_and_=C3=B8l?=", "Fri, 20 Nov 2026 10:00:00 +0000", "<r2@mail.example.com>");

const GMAIL = {
  LOGIN: () => ({ text: "me@example.com authenticated (Success)" }),
  SELECT: cmd => cmd === 'SELECT "Marketing"'
    ? { status: "NO", text: "[NONEXISTENT] Unknown Mailbox: Marketing (now in authenticated state) (Failure)" }
    : { untagged: "* FLAGS (\\Answered \\Flagged \\Draft \\Deleted \\Seen $Phishing)\r\n* 3 EXISTS\r\n", text: "[READ-WRITE] INBOX selected. (Success)" },
  "UID SEARCH": () => ({ untagged: "* SEARCH 4 9\r\n" }),
  "UID FETCH": () => ({ untagged: fetchLine(1, 4, H1) + fetchLine(2, 9, H2) }),
  "UID MOVE": () => ({ untagged: "* OK [COPYUID 1 4,9 11,12]\r\n* 1 EXPUNGE\r\n* 1 EXPUNGE\r\n" }),
  LIST: () => ({ untagged: '* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST (\\HasNoChildren) "/" "Marketing"\r\n* LIST (\\HasNoChildren \\Sent) "/" "[Gmail]/Sent Mail"\r\n' }),
  "UID COPY": () => ({ untagged: "* OK [COPYUID 2 20 33]\r\n" }),
  LOGOUT: () => ({ untagged: "* BYE LOGOUT Requested\r\n" }),
};

test("a contact's mail is found in Inbox, read by header and moved to Marketing", async t => {
  const srv = await fakeServer(GMAIL);
  t.after(srv.close);
  const r = await mailbox(srv).session(ACCOUNT, async box => {
    await box.select("INBOX");
    const uids = await box.searchFrom(["ada@example.com", "bob@example.org"]);
    const mails = await box.headers(uids);
    await box.move(uids, "Marketing");
    return { uids, mails };
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.uids, [4, 9]);
  assert.deepEqual(r.value.mails, [
    { uid: 4, from: "Ada@Example.com", subject: "Re: Hællo", date: "2026-11-20T08:15:00.000Z", messageId: "<r1@mail.example.com>", inReplyTo: "<doit-7-abc@example.com>" },
    { uid: 9, from: "bob@example.org", subject: "Hej ångest and øl", date: "2026-11-20T10:00:00.000Z", messageId: "<r2@mail.example.com>", inReplyTo: "" },
  ]);
  assert.deepEqual(srv.received, [
    'LOGIN "me@example.com" "app-pass-123"',
    'SELECT "INBOX"',
    'UID SEARCH OR FROM "ada@example.com" FROM "bob@example.org"',
    "UID FETCH 4,9 (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID IN-REPLY-TO)])",
    'UID MOVE 4,9 "Marketing"',
    "LOGOUT",
  ]);
});

test("more than 20 addresses are searched in chunks of 20 and the results joined", async t => {
  let n = 0;
  const srv = await fakeServer({ ...GMAIL, "UID SEARCH": () => ({ untagged: `* SEARCH ${++n === 1 ? "5 3" : "3 8"}\r\n` }) });
  t.after(srv.close);
  const addrs = Array.from({ length: 45 }, (_, i) => `p${i}@example.com`);
  const r = await mailbox(srv).session(ACCOUNT, box => box.searchFrom(addrs));
  assert.deepEqual(r.value, [3, 5, 8]);
  const searches = srv.received.filter(c => c.startsWith("UID SEARCH"));
  assert.equal(searches.length, 3);
  assert.equal(searches[0].match(/FROM/g).length, 20);
  assert.equal(searches[2].match(/FROM/g).length, 5);
  assert.equal(searches[0].match(/OR/g).length, 19);
});

test("the Sent mailbox is the one with the Sent attribute, and a mail is copied from it by Message-ID", async t => {
  const srv = await fakeServer({ ...GMAIL, "UID SEARCH": () => ({ untagged: "* SEARCH 20\r\n" }) });
  t.after(srv.close);
  const r = await mailbox(srv).session(ACCOUNT, async box => {
    const sent = await box.sentMailbox();
    return { sent, found: await box.copyByMessageId(sent, "<doit-7-abc@example.com>", "Marketing") };
  });
  assert.deepEqual(r.value, { sent: "[Gmail]/Sent Mail", found: true });
  assert.deepEqual(srv.received.slice(1, -1), [
    'LIST "" "*"', 'SELECT "[Gmail]/Sent Mail"', 'UID SEARCH HEADER Message-ID "<doit-7-abc@example.com>"', 'UID COPY 20 "Marketing"',
  ]);
});

test("copyByMessageId reports a mail it does not find and copies nothing", async t => {
  const srv = await fakeServer({ ...GMAIL, "UID SEARCH": () => ({ untagged: "* SEARCH\r\n" }) });
  t.after(srv.close);
  const r = await mailbox(srv).session(ACCOUNT, box => box.copyByMessageId("INBOX", "<none@example.com>", "Marketing"));
  assert.deepEqual(r, { ok: true, value: false });
  assert.ok(!srv.received.some(c => c.startsWith("UID COPY")));
});

test("a refused login, a missing Marketing mailbox and a closed port are results, never thrown", async t => {
  const bad = await fakeServer({ LOGIN: () => ({ status: "NO", text: "[AUTHENTICATIONFAILED] Invalid credentials (Failure)" }) });
  t.after(bad.close);
  const login = await mailbox(bad).session(ACCOUNT, async () => assert.fail("must not run"));
  assert.deepEqual(login, { ok: false, error: "Login refused: check the app password" });
  assert.ok(!JSON.stringify(login).includes("app-pass-123"));

  const srv = await fakeServer(GMAIL);
  t.after(srv.close);
  const missing = await mailbox(srv).session(ACCOUNT, box => box.select("Marketing"));
  assert.deepEqual(missing, { ok: false, error: "Mailbox Marketing not found" });

  const closed = await new ImapMailbox({ connect: () => net.connect(1, "127.0.0.1") }).session(ACCOUNT, async () => {});
  assert.equal(closed.ok, false);
  assert.match(closed.error, /Could not reach/);

  const silent = net.createServer(() => {});
  await new Promise(r => silent.listen(0, "127.0.0.1", r));
  t.after(() => silent.close());
  const slow = await new ImapMailbox({ timeoutMs: 100, connect: () => net.connect(silent.address().port, "127.0.0.1") }).session(ACCOUNT, async () => {});
  assert.match(slow.error, /timed out/);
});

test("encoded words are decoded: B and Q, UTF-8 and ISO-8859-1, adjacent words joined", () => {
  assert.equal(decodeHeader("=?utf-8?B?w5hsIGZyYSBBw6U=?="), "Øl fra Aå");
  assert.equal(decodeHeader("=?iso-8859-1?q?F=F8rste_mail?= to you"), "Første mail to you");
  assert.equal(decodeHeader("plain =?UTF-8?Q?x=C3=A6?= =?UTF-8?Q?y?= end"), "plain xæy end");
  assert.equal(decodeHeader("no words"), "no words");
});

test("header parsing unfolds lines, takes the address from From and tolerates a bad date", () => {
  const h = parseMessageHeaders("From: =?UTF-8?Q?=C3=85se?= <ase@example.com>\r\nSubject: a\r\n long one\r\nDate: nonsense\r\nMessage-ID: <x@example.com>\r\n\r\n");
  assert.deepEqual(h, { from: "ase@example.com", subject: "a long one", date: "", messageId: "<x@example.com>", inReplyTo: "" });
});
