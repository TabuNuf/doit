// Fake mail ports for tests: sender, mailbox (scripted inbox and Sent), account and templates.

export class FakeSender {
  constructor() { this.sent = []; this.fail = null; }
  async send(account, message) {
    if (this.fail) return { ok: false, error: this.fail };
    this.sent.push({ account: account.address, ...message });
    return { ok: true };
  }
}

/** `inbox` is [{uid, from, subject, date, messageId, inReplyTo}]; `sentIds` the Message-IDs the Sent mailbox holds. */
export class FakeMailbox {
  constructor() { this.inbox = []; this.sentIds = new Set(); this.marketing = []; this.moved = []; this.sessions = 0; this.error = null; this.noSent = false; }
  async session(account, fn) {
    this.sessions++;
    if (this.error) return { ok: false, error: this.error };
    const me = this;
    const box = {
      async select() {},
      async searchFrom(addresses) {
        const set = new Set(addresses.map(a => a.toLowerCase()));
        return me.inbox.filter(m => set.has(m.from.toLowerCase())).map(m => m.uid);
      },
      async headers(uids) { return me.inbox.filter(m => uids.includes(m.uid)).map(m => ({ inReplyTo: "", ...m })); },
      async move(uids) { me.moved.push(...uids); me.inbox = me.inbox.filter(m => !uids.includes(m.uid)); },
      async sentMailbox() { return me.noSent ? null : "[Gmail]/Sent Mail"; },
      async copyByMessageId(from, id) { if (!me.sentIds.has(id)) return false; me.marketing.push(id); return true; },
    };
    return { ok: true, value: await fn(box) };
  }
}

export class FakeAccount {
  constructor(account = { address: "me@example.com", name: "Me", password: "pw", dailyCap: 20 }) { this.account = account; }
  async read() { return this.account; }
}

export class FakeTemplates {
  constructor(files = {}) { this.files = files; }
  list() { return Object.keys(this.files).sort(); }
  read(name) { return this.files[name] ?? null; }
}
