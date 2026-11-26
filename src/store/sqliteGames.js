// SqliteGames: the GameSource port on `marketing.db`: covered-game entries (`game_entries`) and their comps.
// Lists are comma separated text; stores, trackers and sources are JSON text. The schema comes from `MarketingDb`.

const snake = f => f.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
const TEXT = ["title", "developer", "publisher", "release", "stage", "description", "hook", "look", "team", "devTime", "festivals", "earlyAccess", "ratingLabel", "worked", "notes", "salesSource", "demo", "checked"];
const LISTS = ["platforms", "genres", "keywords", "modes", "scales"];
const JSONS = ["stores", "trackers", "sources"];
const NUMBERS = ["price", "launchPrice", "reviews", "sales", "revenue", "peakPlayers", "followers", "languages", "rating", "metacritic", "opencritic", "playtime"];
const FIELDS = [...TEXT, ...LISTS, ...JSONS, ...NUMBERS];
const COLUMNS = FIELDS.map(f => `"${snake(f)}"`);

const split = v => (v ? v.split(",") : []);

function toEntry(r, comps) {
  const e = { key: r.key };
  for (const f of TEXT) e[f] = r[snake(f)];
  for (const f of LISTS) e[f] = split(r[f]);
  for (const f of JSONS) e[f] = JSON.parse(r[f]);
  for (const f of NUMBERS) e[f] = r[snake(f)];
  e.comps = comps ?? [];
  return e;
}

const values = e => FIELDS.map(f => (LISTS.includes(f) ? e[f].join(",") : JSONS.includes(f) ? JSON.stringify(e[f]) : e[f] ?? (NUMBERS.includes(f) ? null : "")));

export class SqliteGames {
  constructor(marketingDb) { this.store = marketingDb; }

  get db() { return this.store.db; }

  /** Every entry, by key, each with its comps [{game, reason}]. */
  all() {
    const comps = new Map();
    for (const c of this.db.prepare("SELECT entry_key, game, reason FROM comps ORDER BY game").all()) (comps.get(c.entry_key) ?? comps.set(c.entry_key, []).get(c.entry_key)).push({ game: c.game, reason: c.reason });
    return this.db.prepare("SELECT * FROM game_entries ORDER BY key").all().map(r => toEntry(r, comps.get(r.key)));
  }

  get(key) { return this.all().find(e => e.key === key) ?? null; }

  insert(entry) {
    this.db.prepare(`INSERT INTO game_entries (key, ${COLUMNS.join(", ")}) VALUES (?, ${COLUMNS.map(() => "?").join(", ")})`).run(entry.key, ...values(entry));
  }

  /** Replaces every field of the entry with that key. */
  update(key, entry) {
    this.db.prepare(`UPDATE game_entries SET ${COLUMNS.map(c => `${c} = ?`).join(", ")} WHERE key = ?`).run(...values(entry), key);
  }

  /** Marks the entry as comparable to a game profile, or changes the reason. */
  setComp(key, game, reason) {
    this.db.prepare("INSERT INTO comps (entry_key, game, reason) VALUES (?, ?, ?) ON CONFLICT (entry_key, game) DO UPDATE SET reason = excluded.reason").run(key, game, reason);
  }

  removeComp(key, game) { this.db.prepare("DELETE FROM comps WHERE entry_key = ? AND game = ?").run(key, game); }
}
