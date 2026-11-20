// The doit command line. Claude's way into the board: short, filtered output only.

const HELP = `doit: the task board, from the command line. Every command archives what is due first.

  doit projects                                   list projects
  doit project add <name> <folder> [--docs Docs]  register a project (creates folders it lacks)
  doit epics <project>                            open epics with done/total
  doit epic add <project> <name> [--status Planned|Active|Parked]
  doit epic close <project> <EPIC-nnn>            archive the epic's task files, set it Done, move it to Completed/
  doit list [--project p] [--epic EPIC-nnn] [--state open|active|backlog|done|archived] [--owner ai|human] [--json]
  doit show <project>/<T-id> [--json]
  doit add <project> <EPIC-nnn> <title> [--owner ai|human] [--type task|bug] [--done-when text]
           [--deadline YYYY-MM-DD] [--state todo|progress|backlog] [--description text]
  doit set <project>/<T-id> key=value ...         keys: state owner type deadline rank title done-when description
  doit comment <project>/<T-id> <text> [--as ai|human]   (default author: ai)
  doit keep <days>                                days a completed task stays before it is archived
  doit sweep                                      archive what is past its deadline or retention

States: todo, progress, backlog, done, archived. "open" = todo + progress + backlog. Archived is never listed unless asked.`;

export class Cli {
  constructor(board, out, err) {
    this.board = board;
    this.out = out;
    this.err = err;
  }

  run(argv) {
    try {
      const { pos, flags } = parse(argv);
      const cmd = pos.shift() || "help";
      const fn = COMMANDS[cmd];
      if (!fn) throw new Error(`Unknown command "${cmd}". Try: doit help`);
      fn.call(this, pos, flags);
      return 0;
    } catch (e) {
      this.err.write(`doit: ${e.message}\n`);
      return 1;
    }
  }

  print(s) { this.out.write(s + "\n"); }
}

const COMMANDS = {
  help() { this.print(HELP); },

  projects() {
    const ps = this.board.projects();
    if (!ps.length) return this.print("No projects. Add one: doit project add <name> <folder>");
    for (const p of ps) this.print(`${p.id}  ${p.name}  ${p.path}/${p.docs}`);
  },

  project(pos, flags) {
    if (pos[0] !== "add") throw new Error("Usage: doit project add <name> <folder> [--docs Docs]");
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
    if (t.archived && t.state === "archived") this.print(`archived: ${t.archived}`);
    if (t.source) this.print(`source: ${t.source}`);
    this.print(`created ${t.created || "-"} · updated ${t.updated || "-"}${t.completed ? " · completed " + t.completed : ""}`);
    if (t.doneWhen) this.print(`\nDone when: ${t.doneWhen}`);
    if (t.description) this.print(`\n${t.description}`);
    for (const c of t.comments) this.print(`\n[${c.at} ${c.who}] ${c.text}`);
  },

  add(pos, flags) {
    const t = this.board.addTask({
      project: need(pos[0], "project"), epic: need(pos[1], "epic"), title: pos.slice(2).join(" "),
      owner: flags.owner, type: flags.type, doneWhen: flags["done-when"], deadline: flags.deadline,
      state: flags.state, description: flags.description,
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
};

function row(t) {
  const due = t.deadline ? `  due ${t.deadline}` : "";
  return `${t.project}/${t.id}  ${t.state.padEnd(8)} ${t.owner.padEnd(5)} ${t.type.padEnd(4)} ${t.title}${due}`;
}

function brief(t) {
  const { project, id, epic, title, state, owner, type, rank, deadline, doneWhen } = t;
  return { ref: `${project}/${id}`, epic, title, state, owner, type, rank, deadline, doneWhen };
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
      if (key === "json") flags.json = true;
      else flags[key] = argv[++i];
    } else pos.push(a);
  }
  return { pos, flags };
}
