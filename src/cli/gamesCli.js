// The game commands of the doit CLI: the Games tab's entries, read and written through the GameCatalog.

import { countLabel } from "../domain/contacts.js";

const USAGE = {
  games: "doit games [--genre g] [--keyword k] [--scale s] [--stage s] [--store s] [--rating n] [--reviews n] [--covered n] [--comp <game>] [--similar <game>] [--no-facts] [--json]",
  show: "doit game show <title> [--json]",
  add: "doit game add <title>",
  set: "doit game set <title> key=value ...",
  comp: "doit game comp <title> <game> <reason> | doit game comp <title> <game> --remove",
};

const KEYED = /^[A-Za-z_]+=/;
/** Store and tracker links may be given several times; any other key twice is refused. */
const REPEAT = ["store", "tracker"];

/** The title: every positional word up to the first `key=value`; the rest are returned as `rest`. */
function titled(words, usage, stopAt = KEYED) {
  const i = words.findIndex(w => stopAt.test(w));
  const title = (i < 0 ? words : words.slice(0, i)).join(" ").trim();
  if (!title) throw new Error(`Usage: ${usage}`);
  return { title, rest: i < 0 ? [] : words.slice(i) };
}

function changesOf(args) {
  const changes = {};
  for (const kv of args) {
    const i = kv.indexOf("=");
    if (i < 1) throw new Error(`Expected key=value, got: ${kv}`);
    const key = kv.slice(0, i), value = kv.slice(i + 1);
    if (REPEAT.includes(key)) (changes[key] ??= []).push(value);
    else if (key in changes) throw new Error(`Key "${key}" is given twice; nothing was written. Only store= and tracker= may repeat`);
    else changes[key] = value;
  }
  return changes;
}

const n = v => (v === null || v === undefined ? "-" : countLabel(v));

/** One line: title, genres, scale, rating, reviews, estimated sales (~ when from reviews), covered, store kinds. */
function line(e) {
  const sales = e.estimates.sales === null ? "-" : `${e.estimates.salesFrom?.startsWith("reviews") ? "~" : ""}${countLabel(e.estimates.sales)}`;
  const stores = Object.keys(e.stores).join("+") || "-";
  return `${e.title}  ${e.genres.join(", ") || "-"}  scale ${e.scales.join("+") || "-"}  rating ${e.rating === null ? "-" : e.rating + "%"}  reviews ${n(e.reviews)}  sales ${sales}  covered ${e.coverage.count}  ${stores}`;
}

const SHOWN = ["developer", "publisher", "release", "stage", "platforms", "genres", "keywords", "modes", "scales", "hook", "look", "description", "worked", "notes", "team", "devTime", "festivals", "earlyAccess", "demo",
  "price", "launchPrice", "reviews", "rating", "ratingLabel", "metacritic", "opencritic", "sales", "revenue", "salesSource", "peakPlayers", "followers", "languages", "playtime", "sources", "checked"];

export class GamesCli {
  constructor(catalog, print) {
    this.catalog = catalog;
    this.print = print;
  }

  games(pos, flags) {
    const list = this.catalog.list({ genre: flags.genre, keyword: flags.keyword, scale: flags.scale, stage: flags.stage, store: flags.store, rating: flags.rating, reviews: flags.reviews,
      covered: flags.covered, comp: flags.comp, similar: flags.similar, noFacts: flags["no-facts"] });
    if (flags.json) return this.print(JSON.stringify(list, null, 1));
    if (!list.length) return this.print("No games.");
    for (const e of list) this.print(line(e) + (e.shared !== undefined ? `  shared ${e.shared}` : ""));
  }

  game(pos, flags) {
    const [sub, ...rest] = pos;
    if (sub === "show") return this.#show(titled(rest, USAGE.show).title, flags);
    if (sub === "add") return this.print(`Added game ${this.catalog.add(titled(rest, USAGE.add).title).title}`);
    if (sub === "set") {
      const { title, rest: args } = titled(rest, USAGE.set);
      if (!args.length) throw new Error(`Usage: ${USAGE.set}`);
      return this.print(line(this.catalog.set(title, changesOf(args))));
    }
    if (sub === "comp") return this.#comp(rest, flags);
    throw new Error(`Usage: ${USAGE.show}\n       ${USAGE.add}\n       ${USAGE.set}\n       ${USAGE.comp}`);
  }

  /** `comp <title> <game> <reason>`: the title is one (quoted) argument; the reason is the rest. */
  #comp([title, game, ...reason], flags) {
    if (!title || !game) throw new Error(`Usage: ${USAGE.comp}`);
    const e = flags.remove ? this.catalog.removeComp(title, game) : this.catalog.setComp(title, game, reason.join(" "));
    this.print(`${e.title}: ${e.comps.length} comp${e.comps.length === 1 ? "" : "s"}${e.comps.length ? " (" + e.comps.map(c => c.game).join(", ") + ")" : ""}`);
  }

  #show(title, flags) {
    const e = this.catalog.get(title);
    if (flags.json) return this.print(JSON.stringify(e, null, 1));
    this.print(line(e));
    for (const f of SHOWN) {
      const v = e[f];
      if (v === "" || v === null || (Array.isArray(v) && !v.length)) continue;
      this.print(`${f} ${Array.isArray(v) ? v.join(", ") : v}`);
    }
    for (const [k, u] of Object.entries(e.stores)) this.print(`store ${k} ${u}`);
    for (const [k, u] of Object.entries(e.trackers)) this.print(`tracker ${k} ${u}`);
    if (e.estimates.sales !== null) this.print(`estimate ${countLabel(e.estimates.sales)} sold (${e.estimates.salesFrom})${e.estimates.revenue === null ? "" : `, ${countLabel(e.estimates.revenue)} revenue (${e.estimates.revenueFrom})`}`);
    for (const c of e.comps) this.print(`comp ${c.game}: ${c.reason}`);
    for (const c of e.coveredBy) this.print(`covered by ${c.name} (${c.id})  ${c.kind} ${c.date}  ${c.source}`);
  }
}
