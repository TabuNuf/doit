// The doit command line. Claude's way into the board: short, filtered output only.

import { HELP } from "./help.js";
import { assignmentLine } from "./assignmentLine.js";
import { ContactsCli } from "./contactsCli.js";
import { MailCli } from "./mailCli.js";
import { FestivalsCli } from "./festivalsCli.js";
import { CampaignCli } from "./campaignCli.js";

export class Cli {
  /** `contacts` is the ContactBook and `readText(path)` reads a file; the contact commands need both.
   *  `mailroom` is the Mailroom behind the mail commands. `run` returns the exit code, or a promise of it for `mail sweep`. */
  constructor(board, out, err, claude = null, contacts = null, readText = null, mailroom = null, outreach = null) {
    this.book = contacts;
    this.board = board;
    this.claude = claude;
    this.contactCommands = contacts && new ContactsCli(contacts, s => this.print(s), readText);
    this.festivalCommands = contacts && new FestivalsCli(contacts, s => this.print(s));
    this.mailCommands = mailroom && new MailCli(mailroom, s => this.print(s));
    this.campaignCommands = outreach && new CampaignCli(outreach, s => this.print(s));
    this.out = out;
    this.err = err;
  }

  run(argv) {
    try {
      const { pos, flags } = parse(argv);
      const cmd = pos.shift() || "help";
      const fn = COMMANDS[cmd];
      if (!fn) throw new Error(`Unknown command "${cmd}". Try: doit help`);
      const done = fn.call(this, pos, flags);
      return done?.then ? done.then(() => 0, e => this.#fail(e)) : 0;
    } catch (e) {
      return this.#fail(e);
    }
  }

  #fail(e) {
    this.err.write(`doit: ${e.message}\n`);
    return 1;
  }

  print(s) { this.out.write(s + "\n"); }

  delegate(name, pos, flags) {
    if (!this.contactCommands) throw new Error("Contacts are not available here");
    return this.contactCommands[name](pos, flags);
  }

  delegateFestival(name, pos, flags) {
    if (!this.festivalCommands) throw new Error("Festivals are not available here");
    return this.festivalCommands[name](pos, flags);
  }

  delegateCampaign(name, pos, flags) {
    if (!this.campaignCommands) throw new Error("Campaigns are not available here");
    return this.campaignCommands[name](pos, flags);
  }

  /** A contact id given to add or set must be a contact in the book. */
  checkContact(id) {
    if (id === undefined || id === "") return;
    if (!this.book) throw new Error("Contacts are not available here");
    this.book.get(id);
  }

  delegateMail(name, pos, flags) {
    if (!this.mailCommands) throw new Error("Mail is not available here");
    return this.mailCommands[name](pos, flags);
  }
}

const COMMANDS = {
  help() { this.print(HELP); },

  projects() {
    const ps = this.board.projects();
    if (!ps.length) return this.print("No projects. Add one: doit project add <name> <folder>");
    for (const p of ps) this.print(`${p.id}  ${p.name}  ${p.kind || "-"}${p.marketed === false ? " (not marketed)" : ""}  ${p.path}/${p.docs}`);
  },

  project(pos, flags) {
    if (pos[0] === "set" && /^marketed=/.test(pos[2] ?? "")) return this.print(`${pos[1]}: ${this.board.setProjectMarketed(pos[1], pos[2].slice(9)).marketed === false ? "not marketed" : "marketed"}`);
    if (pos[0] === "set" && /^kind=/.test(pos[2] ?? "")) return this.print(`${pos[1]}: ${this.board.setProjectKind(pos[1], pos[2].slice(5)).kind || "no kind"}`);
    if (pos[0] !== "add") throw new Error("Usage: doit project add <name> <folder> [--docs Docs] | doit project set <id> kind=game|application|podcast | doit project set <id> marketed=yes|no");
    const p = this.board.addProject({ name: pos[1], path: pos[2], docs: flags.docs });
    this.print(`Added ${p.id}: ${p.path}/${p.docs}`);
  },

  epics(pos) {
    const project = need(pos[0], "doit epics <project>");
    const { epics, parkedEpics } = this.board.view({ project });
    for (const e of [...epics, ...parkedEpics]) this.print(`${e.id}  ${e.status.padEnd(7)} ${e.done}/${e.total}  ${e.name}`);
  },

  epic(pos, flags) {
    if (pos[0] === "close") {
      const n = this.board.closeEpic(need(pos[1], "project"), need(pos[2], "epic"));
      return this.print(`Archived ${n} task files of ${pos[2]}`);
    }
    if (pos[0] !== "add") throw new Error("Usage: doit epic add <project> <name> | doit epic close <project> <EPIC-nnn>");
    const id = this.board.addEpic(need(pos[1], "project"), pos.slice(2).join(" "), flags.status || "Planned");
    this.print(`Added ${id}`);
  },

  list(pos, flags) {
    const tasks = this.board.list({ project: flags.project || "all", epic: flags.epic, state: flags.state || "open", owner: flags.owner });
    if (flags.json) return this.print(JSON.stringify(tasks.map(brief), null, 1));
    if (!tasks.length) return this.print("No tasks.");
    for (const t of tasks) this.print(row(t));
  },

  show(pos, flags) {
    const t = this.board.get(need(pos[0], "doit show <project>/<T-id>"));
    if (flags.json) return this.print(JSON.stringify(t, null, 1));
    this.print(`${t.project}/${t.id} ${t.title}`);
    this.print(`epic ${t.epic} (${t.epicName}) · ${t.state} · ${t.owner} · ${t.type} · rank ${t.rank}${t.deadline ? " · due " + t.deadline : ""}`);
    if (assignmentLine(t)) this.print(assignmentLine(t));
    if (t.archived && t.state === "archived") this.print(`archived: ${t.archived}`);
    if (t.source) this.print(`source: ${t.source}`);
    if (t.blocks) this.print(`blocks: ${t.blocks}`);
    if (t.contact) this.print(`contact: ${t.contact}`);
    this.print(`created ${t.created || "-"} · updated ${t.updated || "-"}${t.completed ? " · completed " + t.completed : ""}`);
    if (t.doneWhen) this.print(`\nDone when: ${t.doneWhen}`);
    if (t.description) this.print(`\n${t.description}`);
    for (const c of t.comments) this.print(`\n[${c.at} ${c.who}] ${c.text}`);
  },

  add(pos, flags) {
    this.checkContact(flags.contact);
    const t = this.board.addTask({
      project: need(pos[0], "project"), epic: need(pos[1], "epic"), title: pos.slice(2).join(" "),
      owner: flags.owner, type: flags.type, doneWhen: flags["done-when"], deadline: flags.deadline,
      state: flags.state, description: flags.description, contact: flags.contact, agent: flags.agent, model: flags.model, effort: flags.effort,
    });
    this.print(`Added ${t.project}/${t.id}`);
  },

  set(pos) {
    const ref = need(pos[0], "doit set <project>/<T-id> key=value");
    const changes = {};
    for (const kv of pos.slice(1)) {
      const i = kv.indexOf("=");
      if (i < 1) throw new Error(`Expected key=value, got: ${kv}`);
      const key = kv.slice(0, i) === "done-when" ? "doneWhen" : kv.slice(0, i);
      changes[key] = kv.slice(i + 1);
    }
    if (!Object.keys(changes).length) throw new Error("Nothing to set");
    this.checkContact(changes.contact);
    this.print(row(this.board.update(ref, changes)));
  },

  comment(pos, flags) {
    const t = this.board.comment(need(pos[0], "doit comment <project>/<T-id> <text>"), flags.as || "ai", pos.slice(1).join(" "));
    this.print(`Commented on ${t.project}/${t.id}`);
  },

  keep(pos) {
    this.board.setKeepDays(need(pos[0], "doit keep <days>"));
    this.print(`Completed tasks are kept ${pos[0]} days`);
  },

  sweep() { this.print(`Archived ${this.board.sweep()}`); },

  log(pos) {
    const topic = need(pos[0], "doit log <name> <text>");
    this.claude.note(topic, need(pos.slice(1).join(" "), "doit log <name> <text>"));
    this.print(`Logged under ${topic}`);
  },

  morning() { for (const line of this.claude.morning()) this.print(line); },

  contacts(pos, flags) { this.delegate("contacts", pos, flags); },
  contact(pos, flags) { this.delegate("contact", pos, flags); },
  fit(pos, flags) { this.delegate("fit", pos, flags); },
  touch(pos, flags) { this.delegate("touch", pos, flags); },
  profiles(pos, flags) { this.delegate("profiles", pos, flags); },
  profile(pos, flags) { this.delegate("profile", pos, flags); },
  campaign(pos, flags) { return this.delegateCampaign("campaign", pos, flags); },
  outreach(pos, flags) { return this.delegateCampaign("outreachPlan", pos, flags); },
  festivals(pos, flags) { this.delegateFestival("festivals", pos, flags); },
  festival(pos, flags) { this.delegateFestival("festival", pos, flags); },
  templates(pos, flags) { return this.delegateMail("templates", pos, flags); },
  draft(pos, flags) { return this.delegateMail("draft", pos, flags); },
  drafts(pos, flags) { return this.delegateMail("drafts", pos, flags); },
  mail(pos, flags) { return this.delegateMail("mail", pos, flags); },
};

function row(t) {
  const due = t.deadline ? `  due ${t.deadline}` : "";
  return `${t.project}/${t.id}  ${t.state.padEnd(8)} ${t.owner.padEnd(5)} ${t.type.padEnd(4)} ${t.title}${due}`;
}

function brief(t) {
  const { project, id, epic, title, state, owner, type, rank, deadline, doneWhen, agent, model, effort } = t;
  return { ref: `${project}/${id}`, epic, title, state, owner, type, rank, deadline, doneWhen, agent, model, effort };
}

function need(v, what) {
  if (v === undefined || v === "") throw new Error(`Missing ${what}`);
  return v;
}

function parse(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (["json", "due", "remove", "no-about"].includes(key)) flags[key] = true;
      else flags[key] = argv[++i];
    } else pos.push(a);
  }
  return { pos, flags };
}
