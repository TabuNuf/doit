// Mailroom: the mail facade the interfaces use. Drafts from templates, approve and send under a daily cap,
// and the sweep that files replies. It knows the rules; the database, SMTP and IMAP are ports.
//
// Ports: drafts (all(filter), get, insert, update, remove, sentOn(day)), the ContactBook, templates (list, read),
// account (async read() -> {address, name, password, dailyCap} | null), sender (async send(account, {from, to, text}) ->
// {ok, error?}), mailbox (async session(account, fn) -> {ok, value} | {ok: false, error}), a clock and a random id function.

import { MailError, parseTemplate, fillTemplate, makeDraft, editDraft, approveDraft, markSent, markFailed, composeMail } from "./mail.js";

const MARKETING = "Marketing";
const DEFAULT_CAP = 20;
const pad = n => String(n).padStart(2, "0");
const dayOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = d => `${dayOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export class Mailroom {
  constructor({ drafts, book, templates, account, sender, mailbox, now = () => new Date(), random = () => Math.random().toString(36).slice(2, 12) }) {
    this.store = drafts;
    this.book = book;
    this.shelf = templates;
    this.account = account;
    this.sender = sender;
    this.mailbox = mailbox;
    this.now = now;
    this.random = random;
    this.sending = new Set();
    this.running = null;
  }

  templates() { return this.shelf.list(); }

  /** A draft for `contact` (an id) from `template`, filled for `game` (a profile's file name) and the personal lines. */
  draft({ contact, template, game, personal = "" } = {}) {
    const c = this.book.get(contact);
    if (!String(c.email).trim()) throw new MailError(`${c.name} has no email`);
    const profile = this.book.profiles().find(p => p.game === String(game ?? "").trim());
    if (!profile) throw new MailError(`No profile for game "${game}"`);
    const text = this.shelf.read(String(template ?? ""));
    if (text === null) throw new MailError(`No template "${template}"`, 404);
    const filled = fillTemplate(parseTemplate(template, text), { name: c.name, personal, game: profile.name });
    const id = this.store.insert(makeDraft({ contact: c.id, game: profile.game, template, personal, ...filled, created: stamp(this.now()) }));
    return this.getDraft(id);
  }

  /** Newest first; `state` and `contact` are optional filters. */
  drafts({ state, contact } = {}) { return this.store.all({ state: state || undefined, contact }).map(d => this.#view(d)); }

  getDraft(id) { return this.#view(this.#get(id)); }

  /** Changes subject, body or the personal lines. New personal lines alone refill the template. */
  edit(id, { subject, body, personal } = {}) {
    const d = this.#get(id);
    let changes = { subject, body, personal };
    if (personal !== undefined && subject === undefined && body === undefined && d.template) {
      const text = this.shelf.read(d.template);
      const c = this.book.get(d.contact);
      const profile = this.book.profiles().find(p => p.game === d.game);
      if (text !== null && profile) changes = { personal, ...fillTemplate(parseTemplate(d.template, text), { name: c.name, personal, game: profile.name }) };
    }
    this.store.update(d.id, editDraft(d, changes));
    return this.getDraft(d.id);
  }

  discard(id) {
    const d = this.#get(id);
    if (d.state === "sent") throw new MailError("A sent mail cannot be discarded");
    this.store.remove(d.id);
  }

  /** Approves a draft (or takes an approved one that waited) and sends it. Returns the draft; `approved` afterwards means it waits for the cap. */
  async approveAndSend(id) {
    const d = this.#get(id);
    if (d.state === "approved") return this.send(id);
    this.store.update(d.id, approveDraft(d));
    return this.send(id);
  }

  async send(id) {
    const d = this.#get(id);
    if (d.state !== "approved") throw new MailError(`Only an approved draft can be sent; this one is ${d.state}`);
    if (this.sending.has(d.id)) throw new MailError("This mail is being sent");
    const account = await this.account.read();
    if (!account) throw new MailError("Mail is not set up");
    const now = this.now();
    if (this.store.sentOn(dayOf(now)) >= (account.dailyCap || DEFAULT_CAP)) return this.getDraft(d.id);
    this.sending.add(d.id);
    try { return await this.#deliver(d, account, now); } finally { this.sending.delete(d.id); }
  }

  /** One IMAP session: retry the Marketing copy of sent mail, then log replies from contacts as touches and move them to Marketing. */
  sweep() {
    if (!this.running) this.running = this.#sweep().finally(() => { this.running = null; });
    return this.running;
  }

  async status() {
    const account = await this.account.read();
    return { ready: Boolean(account), address: account?.address ?? "", sentToday: this.store.sentOn(dayOf(this.now())), cap: account?.dailyCap ?? DEFAULT_CAP };
  }

  async #deliver(d, account, now) {
    const c = this.book.get(d.contact);
    let mail;
    try { mail = composeMail(d, c, account, now, this.random()); } catch (e) {
      if (!(e instanceof MailError)) throw e;
      this.store.update(d.id, markFailed(d, e.message));
      return this.getDraft(d.id);
    }
    const r = await this.sender.send(account, { from: mail.from, to: mail.to, text: mail.text });
    if (!r.ok) {
      this.store.update(d.id, markFailed(d, r.error));
      return this.getDraft(d.id);
    }
    this.store.update(d.id, markSent(d, stamp(now), mail.messageId));
    this.book.addTouch(c.id, { kind: "mail", game: d.game, date: dayOf(now), note: d.subject, ref: mail.messageId });
    const copy = await this.mailbox.session(account, async box => {
      const sent = await box.sentMailbox();
      return sent ? box.copyByMessageId(sent, mail.messageId, MARKETING) : false;
    });
    if (copy.ok && copy.value) this.store.update(d.id, { ...this.#get(d.id), labeled: true });
    return this.getDraft(d.id);
  }

  async #sweep() {
    const account = await this.account.read();
    if (!account) return { ok: false, skipped: "Mail is not set up" };
    const byMail = new Map(this.book.list().filter(c => c.email).map(c => [c.email.trim().toLowerCase(), c]));
    const replies = [];
    let labeled = 0;
    const r = await this.mailbox.session(account, async box => {
      const open = this.store.all({ state: "sent" }).filter(d => !d.labeled && d.messageId);
      if (open.length) {
        const sent = await box.sentMailbox();
        for (const d of sent ? open : []) {
          if (!await box.copyByMessageId(sent, d.messageId, MARKETING)) continue;
          this.store.update(d.id, { ...d, labeled: true });
          labeled++;
        }
      }
      if (!byMail.size) return;
      await box.select("INBOX");
      const uids = await box.searchFrom([...byMail.keys()]);
      if (!uids.length) return;
      const moved = [];
      for (const h of await box.headers(uids)) {
        const c = byMail.get(h.from.trim().toLowerCase());
        if (!c) continue;
        this.book.addTouch(c.id, { kind: "reply", game: this.#replyGame(c, h), date: h.date ? dayOf(new Date(h.date)) : undefined, note: h.subject, ref: h.messageId });
        replies.push({ contact: c.name, subject: h.subject });
        moved.push(h.uid);
      }
      if (moved.length) await box.move(moved, MARKETING);
    });
    return r.ok ? { ok: true, replies, labeled } : { ok: false, replies, labeled, error: r.error };
  }

  /** The game of the draft this mail answers, else of the contact's latest sent draft, else none. */
  #replyGame(contact, h) {
    const sent = this.store.all({ state: "sent", contact: contact.id });
    const hit = (h.inReplyTo && sent.find(d => d.messageId === h.inReplyTo)) || sent.toSorted((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
    return hit && this.book.profiles().some(p => p.game === hit.game) ? hit.game : "";
  }

  #get(id) {
    const n = Number(id);
    const d = Number.isInteger(n) ? this.store.get(n) : null;
    if (!d) throw new MailError(`No draft ${id}`, 404);
    return d;
  }

  #view(d) {
    let c = null;
    try { c = this.book.get(d.contact); } catch { /* the contact is gone */ }
    return { ...d, contactName: c?.name ?? "", to: c?.email ?? "" };
  }
}
