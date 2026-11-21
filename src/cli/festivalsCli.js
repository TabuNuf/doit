// The festival commands of the doit CLI, over the ContactBook.

const USAGE = {
  festivals: "doit festivals [--fits <game>] [--deadline-within <days>] [--state s] [--json]",
  upsert: "doit festival upsert <name> --year <yyyy> [--type festival,conference] [--topic] [--starts YYYY-MM-DD] [--ends YYYY-MM-DD] [--deadline YYYY-MM-DD] [--cost] [--where steam|epic|gog|itch|physical|online] [--genres a,b] [--stages demo,...] [--platforms a,b] [--url] [--notes] [--state s]",
  set: "doit festival set <id> state=watching|applied|accepted|declined|past",
};

const csv = v => (v === undefined ? undefined : String(v).split(",").map(s => s.trim()).filter(Boolean));
const need = (v, usage) => { if (v === undefined || v === "") throw new Error(`Usage: ${usage}`); return v; };

export class FestivalsCli {
  constructor(book, print) {
    this.book = book;
    this.print = print;
  }

  festivals(pos, flags) {
    const list = this.book.festivals({ fits: flags.fits, deadlineWithin: flags["deadline-within"], state: flags.state });
    if (flags.json) return this.print(JSON.stringify(list, null, 1));
    if (!list.length) return this.print("No festivals.");
    for (const c of list) this.print(line(c));
  }

  festival(pos, flags) {
    const [sub, ...rest] = pos;
    if (sub === "upsert") return this.#upsert(rest, flags);
    if (sub === "set") return this.#set(rest);
    throw new Error(`Usage: ${USAGE.upsert}\n       ${USAGE.set}`);
  }

  #upsert(rest, flags) {
    const name = need(rest.join(" "), USAGE.upsert);
    const { contact, created } = this.book.upsertFestival(name, need(flags.year, USAGE.upsert), {
      types: csv(flags.type), topic: flags.topic, notes: flags.notes, url: flags.url,
      event: {
        starts: flags.starts, ends: flags.ends, deadline: flags.deadline, cost: flags.cost, where: flags.where, state: flags.state,
        criteria: { genres: csv(flags.genres), stages: csv(flags.stages), platforms: csv(flags.platforms) },
      },
    });
    this.print(`${created ? "Added" : "Updated"} festival ${contact.id}: ${contact.name} ${contact.event.year}`);
  }

  #set(rest) {
    const id = need(rest[0], USAGE.set);
    const kv = rest[1] ?? "";
    if (!kv.startsWith("state=")) throw new Error(`Usage: ${USAGE.set}`);
    this.print(line(this.book.setFestivalState(id, kv.slice(6))));
  }
}

/** One line: id, name and year, deadline with days left, cost, where, state, and what the match says. */
function line(c) {
  const e = c.event;
  const left = c.daysLeft === null || c.daysLeft === undefined ? "" : c.daysLeft < 0 ? " (past)" : ` (${c.daysLeft} days left)`;
  const deadline = e.deadline ? `deadline ${e.deadline}${left}` : "no deadline";
  const note = c.match?.criteriaUnknown ? "  criteria unknown" : "";
  return `${c.id}  ${c.name} ${e.year}  ${deadline}  ${e.cost || "-"}  ${e.where || "-"}  ${e.state}${note}`;
}
