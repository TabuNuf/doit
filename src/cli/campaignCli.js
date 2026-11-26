// The campaign and outreach commands of the doit CLI, over Outreach.

const USAGE = {
  add: "doit campaign add <project> <name> [--game <game[,game...]>] [--event <festival id|YYYY-MM-DD>] [--occasion o] [--goal t] [--change t] [--measure t] [--audience t] [--message t] [--ask t] [--channels t] [--starts d] [--ends d] [--budget t]",
  contacts: "doit campaign contacts <project> <EPIC-nnn> [--limit n]",
  set: "doit campaign set <project> <EPIC-nnn> key=value ...   (keys: game, event, occasion, goal, change, measure, audience, message, ask, channels, starts, ends, budget)",
  show: "doit campaign show <project> <EPIC-nnn> [--json]",
  suggest: "doit campaign suggest <project> <EPIC-nnn> [--limit n] [--json]",
};

const BRIEF = ["occasion", "goal", "change", "measure", "audience", "message", "ask", "channels", "starts", "ends", "budget"];

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
      const id = this.outreach.addCampaign(need(rest[0], USAGE.add), need(rest.slice(1).join(" "), USAGE.add), { game: flags.game, event: flags.event, ...Object.fromEntries(BRIEF.filter(k => flags[k] !== undefined).map(k => [k, flags[k] === true ? "" : flags[k]])) });
      return this.print(id);
    }
    if (sub === "contacts") {
      const project = need(rest[0], USAGE.contacts);
      const refs = this.outreach.addContacts(project, need(rest[1], USAGE.contacts), flags.limit === undefined ? 10 : flags.limit);
      if (!refs.length) return this.print("No contacts to add.");
      for (const ref of refs) this.print(`${ref}  ${this.#who(ref)}`);
      return;
    }
    if (sub === "set") return this.#set(rest);
    if (sub === "show") return this.#show(rest, flags);
    if (sub === "suggest") return this.#suggest(rest, flags);
    throw new Error(Object.values(USAGE).map((u, i) => (i ? "       " : "Usage: ") + u).join("\n"));
  }

  #set(rest) {
    const project = need(rest[0], USAGE.set), epic = need(rest[1], USAGE.set);
    if (rest.length < 3) throw new Error(`Usage: ${USAGE.set}`);
    const changes = {};
    for (const kv of rest.slice(2)) {
      const i = kv.indexOf("=");
      if (i < 1) throw new Error(`Expected key=value, got: ${kv}`);
      changes[kv.slice(0, i).toLowerCase()] = kv.slice(i + 1);
    }
    this.outreach.setBrief(project, epic, changes);
    this.print(`${project}/${epic}: ${Object.keys(changes).join(", ")} set`);
  }

  #show(rest, flags) {
    const project = need(rest[0], USAGE.show), id = need(rest[1], USAGE.show);
    const e = this.outreach.board.view({ project }).epics.find(x => x.id === id);
    if (!e || !e.game) throw new Error(`No open campaign ${id} in ${project}`);
    if (flags.json) return this.print(JSON.stringify(e, null, 1));
    this.print(`${e.id}  ${e.name}  ${e.done}/${e.total} done`);
    this.print(`  games: ${e.games.join(", ")}`);
    this.print(`  event: ${e.event || "-"}`);
    for (const k of BRIEF) this.print(`  ${k}: ${e.brief[k] || "-"}`);
  }

  #suggest(rest, flags) {
    const project = need(rest[0], USAGE.suggest);
    const found = this.outreach.suggest(project, need(rest[1], USAGE.suggest), flags.limit === undefined ? 20 : flags.limit);
    if (flags.json) return this.print(JSON.stringify(found, null, 1));
    this.print(`Contacts (${found.contacts.length})`);
    for (const c of found.contacts) this.print(`  ${c.id}  ${c.name}  reach ${c.reach}  ${c.game}: ${c.reason || "-"}  last about it ${c.lastAbout || "never"}${c.similar?.length ? `  covered like it: ${c.similar.join(", ")}` : ""}`);
    this.print(`Festivals (${found.festivals.length})`);
    for (const f of found.festivals) this.print(`  ${f.id}  ${f.name} ${f.year}  deadline ${f.deadline || "-"}  ${f.games.join(", ")}`);
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
