// The contact commands of the doit CLI. Cli parses, this class runs them against the ContactBook.
// Files are read through `readText(path)`, given by the root: the CLI tier does not touch the disk.

const USAGE = {
  contacts: "doit contacts [--type t] [--fits <game>] [--status s] [--due] [--reach <n>] [--json] | doit contacts import <file>",
  show: "doit contact show <id> [--json]",
  add: "doit contact add <name> --type a,b [--email] [--reach <followers>] [--topic] [--notes] [--status] [--next YYYY-MM-DD] [--channels kind=url,kind=url]",
  set: "doit contact set <id> key=value ...   keys: name types topic email reach notes status next channels",
  fit: "doit fit <id> <game> <reason>",
  touch: "doit touch <id> mail|reply|video [--game g] [--date YYYY-MM-DD]",
};

const need = (v, usage) => { if (v === undefined || v === "") throw new Error(`Usage: ${usage}`); return v; };
const csv = v => String(v ?? "").split(",").map(s => s.trim()).filter(Boolean);

/** "youtube=https://a,twitch=https://b" as channels. */
function channels(v) {
  return csv(v).map(p => {
    const i = p.indexOf("=");
    if (i < 1) throw new Error(`Expected kind=url, got: ${p}`);
    return { kind: p.slice(0, i), url: p.slice(i + 1) };
  });
}

/** CLI keys (and flags) to the fields of a contact. */
function fields(src) {
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (k === "type" || k === "types") out.types = csv(v);
    else if (k === "channels") out.channels = channels(v);
    else if (["name", "topic", "email", "reach", "notes", "status", "next"].includes(k)) out[k] = v;
    else throw new Error(`Unknown field "${k}"; use name types topic email reach notes status next channels`);
  }
  return out;
}

export class ContactsCli {
  constructor(book, print, readText) {
    this.book = book;
    this.print = print;
    this.readText = readText;
  }

  contacts(pos, flags) {
    if (pos[0] === "import") return this.#import(pos[1]);
    const list = this.book.list({ type: flags.type, fits: flags.fits, status: flags.status, reach: flags.reach, due: flags.due });
    if (flags.json) return this.print(JSON.stringify(list, null, 1));
    if (!list.length) return this.print("No contacts.");
    for (const c of list) this.print(line(c));
  }

  contact(pos, flags) {
    const [sub, ...rest] = pos;
    if (sub === "show") return this.#show(need(rest[0], USAGE.show), flags);
    if (sub === "add") {
      const c = this.book.add({ ...fields({ ...flags, name: need(rest.join(" "), USAGE.add) }), });
      return this.print(`Added contact ${c.id}: ${c.name}`);
    }
    if (sub === "set") {
      const changes = {};
      for (const kv of rest.slice(1)) {
        const i = kv.indexOf("=");
        if (i < 1) throw new Error(`Expected key=value, got: ${kv}`);
        changes[kv.slice(0, i)] = kv.slice(i + 1);
      }
      if (!Object.keys(changes).length) throw new Error(`Usage: ${USAGE.set}`);
      return this.print(line(this.book.update(need(rest[0], USAGE.set), fields(changes))));
    }
    throw new Error(`Usage: ${USAGE.show}\n       ${USAGE.add}\n       ${USAGE.set}`);
  }

  fit(pos) {
    const c = this.book.setFit(need(pos[0], USAGE.fit), need(pos[1], USAGE.fit), pos.slice(2).join(" "));
    this.print(`${c.name} fits ${pos[1]}`);
  }

  touch(pos, flags) {
    const c = this.book.addTouch(need(pos[0], USAGE.touch), { kind: need(pos[1], USAGE.touch), game: flags.game, date: flags.date });
    const t = c.touches[0];
    this.print(`${c.name}: ${t.kind} ${t.date}${t.game ? " " + t.game : ""}`);
  }

  profiles() {
    const list = this.book.profiles();
    if (!list.length) return this.print("No profiles.");
    for (const p of list) this.print(`${p.game}  ${p.name}  ${p.stage || "-"}${p.release ? "  " + p.release : ""}  ${p.genres.join(", ")}`);
  }

  #show(id, flags) {
    const c = this.book.get(id);
    if (flags.json) return this.print(JSON.stringify(c, null, 1));
    this.print(line(c));
    if (c.email) this.print(`email ${c.email}`);
    if (c.topic) this.print(`topic ${c.topic}`);
    for (const ch of c.channels) this.print(`${ch.kind} ${ch.url}`);
    for (const f of c.fit) this.print(`fits ${f.game}: ${f.reason}`);
    for (const t of c.touches) this.print(`${t.date} ${t.kind}${t.game ? " " + t.game : ""}`);
    if (c.notes) this.print(`\n${c.notes}`);
  }

  #import(file) {
    need(file, "doit contacts import <file>");
    const { added, updated, skipped } = this.book.importCsv(this.readText(file));
    this.print(`Imported: ${added} added, ${updated} updated, ${skipped} skipped`);
  }
}

/** One line: id, name, types, reach, status, next contact (due marked), the games it fits. */
function line(c) {
  const next = c.next ? `${c.due ? "due" : "next"} ${c.next}` : "-";
  const fits = c.fit.length ? `  fits ${c.fit.map(f => f.game).join(", ")}` : "";
  return `${c.id}  ${c.name}  ${c.types.join("+")}  ${c.reach ?? "-"}  ${c.status}  ${next}${fits}`;
}
