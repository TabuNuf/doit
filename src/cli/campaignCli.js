// The campaign and outreach commands of the doit CLI, over Outreach.

const USAGE = {
  add: "doit campaign add <project> <name> [--game <game[,game...]>] [--event <festival id|YYYY-MM-DD>]",
  contacts: "doit campaign contacts <project> <EPIC-nnn> [--limit n]",
};

const need = (v, usage) => { if (v === undefined || v === "") throw new Error(`Usage: ${usage}`); return v; };

export class CampaignCli {
  constructor(outreach, print, book = null) {
    this.outreach = outreach;
    this.print = print;
    this.book = book;
  }

  campaign(pos, flags) {
    const [sub, ...rest] = pos;
    if (sub === "add") {
      const id = this.outreach.addCampaign(need(rest[0], USAGE.add), need(rest.slice(1).join(" "), USAGE.add), { game: flags.game, event: flags.event });
      return this.print(id);
    }
    if (sub === "contacts") {
      const project = need(rest[0], USAGE.contacts);
      const refs = this.outreach.addContacts(project, need(rest[1], USAGE.contacts), flags.limit === undefined ? 10 : flags.limit);
      if (!refs.length) return this.print("No contacts to add.");
      for (const ref of refs) this.print(`${ref}  ${this.#who(ref)}`);
      return;
    }
    throw new Error(`Usage: ${USAGE.add}\n       ${USAGE.contacts}`);
  }

  outreachPlan(pos, flags) {
    const plan = this.outreach.week();
    if (flags.json) return this.print(JSON.stringify(plan, null, 1));
    this.print(`Contacts (${plan.contacts.length})`);
    for (const c of plan.contacts) this.print(`  ${c.id}  ${c.name}  ${c.game || "-"}  ${c.why}${c.ref ? "  " + c.ref : ""}`);
    this.print(`Festival deadlines within 14 days (${plan.festivals.length})`);
    for (const f of plan.festivals) this.print(`  ${f.id}  ${f.name} ${f.year}  deadline ${f.deadline} (${f.daysLeft} days left)  ${f.games.join(", ")}`);
    this.print(`Campaign steps (${plan.steps.length})`);
    for (const s of plan.steps) this.print(`  ${s.ref}  ${s.title}  ${s.game}`);
  }

  // The contact a made task points at, for the printed line.
  #who(ref) {
    const t = this.outreach.board.get(ref);
    return `${t.contact}  ${t.title.replace(/^Reach out to /, "")}`;
  }
}
