// The mail commands of the doit CLI, over the Mailroom. Nothing here approves or sends: that stays in the page.

const USAGE = {
  add: "doit draft add <contact id> --template <name> --game <game> --personal <text>",
  show: "doit draft show <id> [--json]",
  drafts: "doit drafts [--state draft|approved|sent|failed] [--json]",
};

const need = (v, usage) => { if (v === undefined || v === "") throw new Error(`Usage: ${usage}`); return v; };

export class MailCli {
  constructor(mailroom, print) {
    this.mailroom = mailroom;
    this.print = print;
  }

  templates() {
    const list = this.mailroom.templates();
    if (!list.length) return this.print("No templates.");
    for (const name of list) this.print(name);
  }

  draft(pos, flags) {
    const [sub, id] = pos;
    if (sub === "add") {
      const d = this.mailroom.draft({ contact: need(id, USAGE.add), template: need(flags.template, USAGE.add), game: need(flags.game, USAGE.add), personal: flags.personal });
      this.print(`Draft ${d.id}`);
      return this.#mail(d);
    }
    if (sub === "show") {
      const d = this.mailroom.getDraft(need(id, USAGE.show));
      return flags.json ? this.print(JSON.stringify(d, null, 1)) : this.#mail(d, true);
    }
    throw new Error(`Usage: ${USAGE.add}\n       ${USAGE.show}`);
  }

  drafts(pos, flags) {
    const list = this.mailroom.drafts({ state: flags.state });
    if (flags.json) return this.print(JSON.stringify(list, null, 1));
    if (!list.length) return this.print("No drafts.");
    for (const d of list) this.print(`${d.id}  ${d.state}  ${d.contactName}  ${d.game}  ${d.subject}${d.error ? `  (${d.error})` : ""}`);
  }

  /** `mail sweep`: replies from contacts are logged as touches and moved to Marketing. */
  async mail(pos) {
    if (pos[0] !== "sweep") throw new Error("Usage: doit mail sweep");
    const r = await this.mailroom.sweep();
    if (r.skipped) return this.print(r.skipped);
    if (!r.ok) throw new Error(r.error);
    for (const x of r.replies) this.print(`Reply from ${x.contact}: ${x.subject}`);
    this.print(`Swept: ${r.replies.length} replies, ${r.labeled} sent mails labeled`);
  }

  #mail(d, head = false) {
    if (head) this.print(`Draft ${d.id}  ${d.state}  ${d.game}${d.sentAt ? `  sent ${d.sentAt}${d.labeled ? ", labeled" : ""}` : ""}${d.error ? `  error: ${d.error}` : ""}`);
    this.print(`To: ${d.contactName} <${d.to}>`);
    this.print(`Subject: ${d.subject}`);
    this.print(`\n${d.body}`);
  }
}
