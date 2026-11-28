import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setup } from "./helpers.js";
import { cliFor } from "./contactsCli.test.js";
import { makeContacts } from "../src/root.js";
import { checkScales, isRelevant, contactFilter, makeContact, countLabel, checkGame, relevance, whyText, COVERED_GAMES_MIN, ContactError } from "../src/domain/contacts.js";
import { pickContacts } from "../src/domain/outreachPlan.js";
import { takeIndieFit } from "../src/domain/scaleNotes.js";
import { channelKind } from "../src/domain/contactImport.js";

/** A CLI with two game projects: `bb` (scale indie) and `gb` (no scale), each with a profile file. */
function world(t) {
  const s = setup(); t.after(s.cleanup);
  const run = cliFor(s);
  for (const id of ["bb", "gb"]) {
    const dir = path.join(s.root, id);
    assert.equal(run("project", "add", id, dir).code, 0);
    assert.equal(run("project", "set", id, "kind=game").code, 0);
    assert.equal(run("profile", "add", id).code, 0);
  }
  return { s, run };
}

test("scale labels: the five labels, III is triple-i, kept in vocabulary order, others refused", () => {
  assert.deepEqual(checkScales("aaa, indie,III,indie"), ["indie", "triple-i", "aaa"]);
  assert.deepEqual(checkScales(""), []);
  assert.throws(() => checkScales("huge"), ContactError);
});

test("a contact carries reddit, scales, scale note and checked; bad values are refused", () => {
  const c = makeContact({ name: "A", types: ["influencer"], reddit: " https://www.reddit.com/r/a ", scales: ["aa", "solo"], scaleNote: "3 of 20", checked: "2026-11-26" });
  assert.deepEqual([c.reddit, c.scales, c.scaleNote, c.checked], ["https://www.reddit.com/r/a", ["solo", "aa"], "3 of 20", "2026-11-26"]);
  assert.throws(() => makeContact({ name: "A", types: ["influencer"], checked: "yesterday" }), ContactError);
  assert.equal(makeContact({ name: "A", types: ["press"] }).status, "active");
  assert.equal(makeContact({ name: "A", types: ["press"], status: "parked" }).status, "parked");
});

test("channels: the new kinds, followers and last-active date are checked; an unknown host stays website", () => {
  const ch = ["kick", "tiktok", "reddit", "patreon", "podcast", "rumble"].map(kind => ({ kind, url: `https://${kind}.example/x`, followers: 1200, active: "2026-11-01", dead: "" }));
  assert.deepEqual(makeContact({ name: "A", types: ["press"], channels: ch }).channels, ch);
  assert.throws(() => makeContact({ name: "A", types: ["press"], channels: [{ kind: "myspace", url: "x" }] }), ContactError);
  assert.throws(() => makeContact({ name: "A", types: ["press"], channels: [{ kind: "kick", url: "x", active: "soon" }] }), ContactError);
  assert.equal(makeContact({ name: "A", types: ["press"], channels: [{ kind: "kick", url: "x" }] }).channels[0].followers, null);
  assert.deepEqual(["https://kick.com/a", "https://www.reddit.com/r/a", "https://rumble.com/c/a", "https://patreon.com/a", "https://tiktok.com/@a", "https://blog.example.org"].map(channelKind),
    ["kick", "reddit", "rumble", "patreon", "tiktok", "website"]);
  assert.equal(countLabel(4770000), "4.77M");
  assert.equal(countLabel(349800), "349.8K");
  assert.equal(countLabel(900), "900");
});

test("relevant: a fit, or a scale shared with a profile; both empty is not; a profile with no scale counts fit only", () => {
  const profiles = [{ game: "bb", scale: ["indie", "solo"] }, { game: "gb", scale: [] }];
  assert.equal(isRelevant({ fit: [{ game: "gb" }], scales: [] }, profiles), true, "fit only");
  assert.equal(isRelevant({ fit: [], scales: ["solo", "aaa"] }, profiles), true, "scale overlap");
  assert.equal(isRelevant({ fit: [], scales: ["aaa"] }, profiles), false, "no overlap");
  assert.equal(isRelevant({ fit: [], scales: [] }, profiles), false, "both empty");
  assert.equal(isRelevant({ fit: [], scales: ["indie"] }, [{ game: "bb", scale: [] }]), false, "profile scale empty: fit only");
});

test("filters: parked hidden by default, --parked only them, all shows everyone, scale and relevance", () => {
  const profiles = [{ game: "bb", scale: ["indie"] }];
  const cs = [
    { id: 1, name: "a", types: ["influencer"], status: "active", scales: ["indie"], fit: [], touches: [] },
    { id: 2, name: "b", types: ["influencer"], status: "parked", scales: ["aaa"], fit: [], touches: [] },
    { id: 3, name: "c", types: ["influencer"], status: "active", scales: [], fit: [{ game: "bb" }], touches: [] },
    { id: 4, name: "d", types: ["influencer"], status: "active", scales: ["aaa"], fit: [], touches: [] },
    { id: 5, name: "e", types: ["festival"], status: "active", scales: [], fit: [], touches: [], event: { year: 2027 } },
  ];
  const ids = (f, today = "2026-11-26") => cs.filter(contactFilter(f, today, profiles)).map(c => c.id);
  assert.deepEqual(ids({}), [1, 3, 4, 5]);
  assert.deepEqual(ids({ parked: true }), [2]);
  assert.deepEqual(ids({ all: true }), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids({ status: "parked" }), [2]);
  assert.deepEqual(ids({ relevant: true }), [1, 3]);
  assert.deepEqual(ids({ irrelevant: true }), [4]);
  assert.deepEqual(ids({ scale: "aaa", all: true }), [2, 4]);
  assert.throws(() => ids({ scale: "huge" }), ContactError);
  cs[1].next = "2026-11-01";
  assert.deepEqual(ids({ parked: true, due: true }), [2], "a parked contact is due on its review date");
  assert.deepEqual(ids({ parked: true, due: true }, "2026-10-01"), []);
});

test("campaign picking skips a parked contact even when it fits", () => {
  const contacts = [{ id: 1, status: "active", reach: 5, fit: [{ game: "bb" }] }, { id: 2, status: "parked", reach: 9, fit: [{ game: "bb" }] }];
  assert.deepEqual(pickContacts({ contacts, games: ["bb"] }).map(c => c.id), [1]);
});

test("CLI: a parked contact is left out of contacts, campaign contacts, suggest and outreach; --parked lists it", t => {
  const { s, run } = world(t);
  run("contact", "add", "Ada", "--type", "influencer", "--reach", "500");
  run("contact", "add", "Bo", "--type", "influencer", "--reach", "900", "--next", "2026-11-01");
  for (const id of [1, 2]) assert.equal(run("fit", String(id), "bb", "plays it").code, 0);
  run("campaign", "add", "doit", "Push", "--game", "bb");
  run("contact", "set", "2", "status=parked");
  const all = run("contacts").out;
  assert.match(all, /Ada/);
  assert.doesNotMatch(all, /Bo/);
  assert.match(run("contacts", "--parked").out, /Bo.*parked  review 2026-11-01|Bo.*parked  due 2026-11-01/);
  assert.doesNotMatch(run("contacts", "--parked").out, /Ada/);
  assert.match(run("contacts", "--all").out, /Bo/);
  assert.match(run("contacts", "--parked", "--due").out, /Bo/);
  const epic = run("campaign", "add", "bb", "Push", "--game", "bb");
  const id = epic.out.match(/EPIC-\d+/)?.[0];
  assert.ok(id, epic.out);
  assert.doesNotMatch(run("campaign", "suggest", "bb", id).out, /Bo/);
  assert.match(run("campaign", "suggest", "bb", id).out, /Ada/);
  assert.doesNotMatch(run("campaign", "contacts", "bb", id).out + run("list", "--project", "bb").out, /Reach out to Bo/);
  assert.doesNotMatch(run("outreach").out, /Bo/);
});

test("CLI: contact fields, channel syntax, show, --json, --scale, --relevant and --irrelevant", t => {
  const { run } = world(t);
  assert.equal(run("profile", "set", "bb", "scale=indie,III", "stage=demo").out, "bb  scale indie+triple-i\n");
  assert.match(run("profiles").out, /^bb  bb  game  demo  scale indie\+triple-i/m);
  assert.match(run("profiles").out, /^gb  .*scale -/m);
  assert.match(run("help").out, /solo = made primarily by one developer/);
  assert.equal(run("profile", "set", "bb", "scale=big").code, 1);
  run("contact", "add", "Ada", "--type", "influencer", "--channels", "youtube=https://youtube.com/@ada|4.77M|2026-11-26,twitch=https://twitch.tv/ada||2026-11-20,kick=https://kick.com/ada",
    "--reddit", "https://www.reddit.com/r/ada", "--scales", "indie,aa", "--scale_note", "5 of 20 indie", "--checked", "2026-11-26");
  run("contact", "add", "Bo", "--type", "influencer", "--scales", "aaa");
  run("contact", "add", "Cy", "--type", "influencer");
  run("fit", "3", "gb", "likes it");
  const show = run("contact", "show", "1").out;
  assert.match(show, /scales indie, aa  checked 2026-11-26/);
  assert.match(show, /scale note 5 of 20 indie/);
  assert.match(show, /reddit https:\/\/www.reddit.com\/r\/ada/);
  assert.match(show, /youtube https:\/\/youtube.com\/@ada  4.77M followers  active 2026-11-26/);
  assert.match(show, /twitch https:\/\/twitch.tv\/ada  active 2026-11-20/);
  assert.match(show, /kick https:\/\/kick.com\/ada\n/);
  const json = JSON.parse(run("contact", "show", "1", "--json").out);
  assert.deepEqual(json.channels[0], { kind: "youtube", url: "https://youtube.com/@ada", followers: 4770000, active: "2026-11-26", dead: "" });
  assert.deepEqual([json.scales, json.scaleNote, json.checked, json.reddit, json.relevant], [["indie", "aa"], "5 of 20 indie", "2026-11-26", "https://www.reddit.com/r/ada", true]);
  const names = a => run("contacts", ...a).out.split("\n").filter(Boolean).map(l => l.split("  ")[1]);
  assert.deepEqual(names(["--relevant"]).sort(), ["Ada", "Cy"], "Ada shares indie with bb, Cy has a fit");
  assert.deepEqual(names(["--irrelevant"]), ["Bo"]);
  assert.deepEqual(names(["--scale", "aaa"]), ["Bo"]);
  run("contact", "set", "1", "channel=twitch=https://twitch.tv/ada|12k");
  assert.match(run("contact", "show", "1").out, /twitch https:\/\/twitch.tv\/ada  12K followers  active 2026-11-20/, "channel= updates one and keeps what it leaves empty");
  run("contact", "set", "1", "channel=rumble=https://rumble.com/c/ada|109K");
  assert.match(run("contact", "show", "1").out, /rumble .* 109K followers/);
  assert.equal(run("contact", "set", "1", "channels=youtube=u|lots").code, 1);
  assert.equal(run("contact", "set", "1", "scales=huge").code, 1);
});

test("an old channels table (kind and url only) keeps its rows when migrated", t => {
  const s = setup(); t.after(s.cleanup);
  fs.mkdirSync(s.home, { recursive: true });
  const db = new DatabaseSync(path.join(s.home, "marketing.db"));
  const book0 = makeContacts({ home: s.home, now: () => s.clock.t });
  book0.add({ name: "Old", types: ["influencer"], channels: [{ kind: "youtube", url: "https://youtube.com/@old" }, { kind: "website", url: "https://old.example" }] });
  book0.source.close();
  db.exec("DROP TABLE comps; DROP TABLE game_entries; DROP TABLE games; ALTER TABLE channels DROP COLUMN dead; ALTER TABLE channels DROP COLUMN followers; ALTER TABLE channels DROP COLUMN active; ALTER TABLE contacts DROP COLUMN reddit; ALTER TABLE contacts DROP COLUMN scales; ALTER TABLE contacts DROP COLUMN scale_note; ALTER TABLE contacts DROP COLUMN checked; PRAGMA user_version = 5");
  db.close();
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  const c = book.get(1);
  assert.deepEqual(c.channels, [{ kind: "youtube", url: "https://youtube.com/@old", followers: null, active: "", dead: "" }, { kind: "website", url: "https://old.example", followers: null, active: "", dead: "" }]);
  assert.deepEqual([c.reddit, c.scales, c.scaleNote, c.checked], ["", [], "", ""]);
  book.source.close();
});

test("takeIndieFit reads the first line and keeps every other line", () => {
  const notes = "\nIndie fit: no (AAA-mainstream). 0 of 7 game items indie, 13 items no game; no key route found. Checked 2026-11-26.\n\nCheck 2026-11-26:\n- x";
  assert.deepEqual(takeIndieFit(notes), { scales: ["aaa"], scaleNote: "0 of 7 game items indie, 13 items no game; no key route found.", checked: "2026-11-26", notes: "Check 2026-11-26:\n- x" });
  assert.deepEqual(takeIndieFit("Indie fit: yes (indie-friendly). 9 of 20. Checked 2026-01-02.").scales, ["indie"]);
  assert.deepEqual(takeIndieFit("Indie fit: mixed. 4 of 20.").scales, ["indie", "aaa"]);
  assert.equal(takeIndieFit("Notes first\nIndie fit: no (AAA-mainstream)."), null, "only the first line counts");
  assert.equal(takeIndieFit("Indie fit: unsure."), null);
});

test("contacts migrate-scale: a dry run changes nothing, --apply sets the fields, retypes channels and keeps other notes", t => {
  const { run } = world(t);
  run("contact", "add", "Asmon", "--type", "influencer", "--channels", "website=https://kick.com/asmongold,website=https://www.reddit.com/r/Asmongold,website=https://blog.example",
    "--notes", "Indie fit: no (AAA-mainstream). 0 of 7 indie. Checked 2026-11-26.\nOther line.");
  run("contact", "add", "Plain", "--type", "press", "--notes", "Hello");
  const dry = run("contacts", "migrate-scale").out;
  assert.match(dry, /^1  Asmon  scales aaa  checked 2026-11-26  retyped kick https:\/\/kick.com\/asmongold; reddit https:\/\/www.reddit.com\/r\/Asmongold/m);
  assert.match(dry, /1 contact with an Indie fit line; nothing changed/);
  assert.match(run("contact", "show", "1").out, /Indie fit:/);
  assert.match(run("contacts", "migrate-scale", "--apply").out, /1 contact with an Indie fit line migrated/);
  const c = JSON.parse(run("contact", "show", "1", "--json").out);
  assert.deepEqual([c.scales, c.scaleNote, c.checked, c.notes, c.reddit], [["aaa"], "0 of 7 indie.", "2026-11-26", "Other line.", "https://www.reddit.com/r/Asmongold"]);
  assert.deepEqual(c.channels.map(x => x.kind), ["kick", "reddit", "website"]);
  assert.equal(JSON.parse(run("contact", "show", "2", "--json").out).notes, "Hello");
  assert.match(run("contacts", "migrate-scale").out, /^0 contacts with an Indie fit line/);
});

const GAME = (title, scale = "solo", extra = {}) => ["contact", "game", "add", "1", title, "--scale", scale, "--kind", "reviewed", "--date", "2026-11-01", "--source", "https://youtu.be/" + title.replace(/\W/g, ""), ...Object.entries(extra).flatMap(([k, v]) => ["--" + k, v])];

test("covered games: entry is checked, same title updates, remove works", () => {
  assert.throws(() => checkGame({ title: "T", scales: "solo", kind: "played", date: "2026-11-01" }), /source/);
  assert.throws(() => checkGame({ title: "T", scales: "solo", kind: "played", source: "https://x.test/v" }), /date/);
  assert.throws(() => checkGame({ title: "T", scales: "", kind: "played", date: "2026-11-01", source: "https://x.test/v" }), /scale/);
  assert.throws(() => checkGame({ title: "T", scales: "solo", kind: "watched", date: "2026-11-01", source: "https://x.test/v" }), ContactError);
  assert.equal(COVERED_GAMES_MIN, 3);
});

test("relevant by covered games: 2 in our league no, 3 yes, 3 of another scale no, repeats of one title count once", () => {
  const ours = [{ game: "bb", scale: ["solo", "indie"] }];
  const g = (title, scales) => ({ title, scales, kind: "played", date: "2026-11-01", source: "https://x.test/v", genres: [] });
  const c = games => ({ fit: [], scales: [], games });
  assert.deepEqual(relevance(c([g("a", ["solo"]), g("b", ["indie"])]), ours), []);
  assert.deepEqual(relevance(c([g("a", ["solo"]), g("b", ["indie"]), g("c", ["solo", "aa"])]), ours), [{ kind: "games", count: 3 }]);
  assert.deepEqual(relevance(c([g("a", ["aaa"]), g("b", ["aaa"]), g("c", ["aa"])]), ours), []);
  assert.deepEqual(relevance(c([g("a", ["solo"]), g("A", ["solo"]), g("b", ["indie"])]), ours), []);
  assert.equal(whyText(relevance({ fit: [{ game: "bb" }], scales: ["indie"], games: [] }, ours)), "fit bb; scale indie");
});

test("CLI: covered games drive relevance, --relevant says why, --now-relevant lists parked ones only, nothing is unparked", t => {
  const { run } = world(t);
  run("profile", "set", "bb", "scale=solo,indie", "stage=demo");
  run("contact", "add", "Ada", "--type", "influencer");
  run("contact", "add", "Bo", "--type", "influencer", "--status", "parked");
  run("contact", "add", "Cy", "--type", "influencer", "--scales", "indie");
  assert.equal(run(...GAME("Tiny Quest", "solo", { genre: "rpg,cozy" })).code, 0);
  run(...GAME("Pixel Farm", "indie"));
  assert.match(run(...GAME("pixel farm", "indie", { genre: "farm" })).out, /Ada: 2 covered games$/m, "same title updates");
  assert.equal(run(...GAME("Big Shooter", "aaa")).out.includes("relevant"), false);
  assert.match(run(...GAME("Moon Cafe", "solo")).out, /relevant: 3 covered games in our league/);
  assert.equal(run("contact", "game", "add", "1", "X", "--scale", "solo", "--kind", "played").code, 1, "no date and source");
  const show = run("contact", "show", "1").out;
  assert.match(show, /relevant 3 covered games in our league/);
  assert.match(show, /covered Tiny Quest  solo  reviewed 2026-11-01  https:\/\/youtu.be\/TinyQuest  rpg, cozy/);
  const rel = run("contacts", "--relevant").out;
  assert.match(rel, /Ada.*relevant: 3 covered games in our league/);
  assert.match(rel, /Cy.*relevant: scale indie/);
  const json = JSON.parse(run("contact", "show", "1", "--json").out);
  assert.equal(json.games.length, 4);
  assert.equal(json.games.find(x => x.title === "pixel farm").genres[0], "farm");
  // Bo is parked and gets 3 games: now relevant, still parked.
  for (const n of ["a", "b", "c"]) run("contact", "game", "add", "2", n, "--scale", "indie", "--kind", "played", "--date", "2026-11-01", "--source", "https://x.test/" + n);
  assert.match(run("contacts", "--parked", "--now-relevant").out, /Bo.*parked/);
  assert.doesNotMatch(run("contacts", "--parked", "--now-relevant").out, /Ada|Cy/);
  assert.match(run("contact", "show", "2").out, /parked/);
  assert.match(run("contact", "game", "remove", "1", "moon cafe").out, /3 covered games/);
  assert.equal(run("contact", "game", "remove", "1", "nope").code, 1);
});

test("campaign suggest ranks by genre overlap and names the games; the league is not a gate", t => {
  const { run } = world(t);
  run("profile", "set", "bb", "genres=cozy,farm", "stage=demo");
  run("contact", "add", "Ada", "--type", "influencer", "--reach", "900");
  run("contact", "add", "Bo", "--type", "influencer", "--reach", "100");
  for (const id of ["1", "2"]) run("fit", id, "bb", "plays it");
  run("contact", "game", "add", "2", "Farm Days", "--scale", "solo", "--kind", "played", "--date", "2026-11-01", "--source", "https://x.test/f", "--genre", "Farm");
  const id = run("campaign", "add", "bb", "Push", "--game", "bb").out.match(/EPIC-\d+/)[0];
  const out = run("campaign", "suggest", "bb", id).out;
  assert.ok(out.indexOf("Bo") < out.indexOf("Ada"), out);
  assert.match(out, /Bo.*covered like it: Farm Days/);
});

test("a dead channel: the fourth part marks it, shows in show and json, alive clears it, and an update keeps it", t => {
  const { run } = world(t);
  run("contact", "add", "Ada", "--type", "influencer", "--channels", "twitch=https://twitch.tv/ada|||dead,youtube=https://youtube.com/@ada|10k|2026-11-01|2026-10-01");
  const show = run("contact", "show", "1").out;
  assert.match(show, /twitch https:\/\/twitch.tv\/ada  DEAD since 2026-11-20/);
  assert.match(show, /youtube .*  DEAD since 2026-10-01/);
  assert.equal(JSON.parse(run("contact", "show", "1", "--json").out).channels[0].dead, "2026-11-20");
  run("contact", "set", "1", "channel=twitch=https://twitch.tv/ada|5k");
  assert.match(run("contact", "show", "1").out, /twitch .*5K? ?followers?.*DEAD|twitch .*DEAD/, "a later update keeps the mark");
  run("contact", "set", "1", "channel=twitch=https://twitch.tv/ada|||alive");
  assert.doesNotMatch(run("contact", "show", "1").out, /twitch .*DEAD/);
  assert.equal(run("contact", "set", "1", "channel=twitch=https://twitch.tv/ada|||soon").code, 1);
});

test("contact set: several channel= keys all apply; any other repeated key is an error that writes nothing", t => {
  const { run } = world(t);
  run("contact", "add", "Ada", "--type", "influencer", "--channels", "youtube=https://youtube.com/@ada|1k");
  const r = run("contact", "set", "1", "channel=twitch=https://twitch.tv/ada|2k|2026-11-01", "channel=tiktok=https://tiktok.com/@ada|712k", "channel=youtube=https://youtube.com/@ada|140k", "scales=indie");
  assert.equal(r.code, 0, r.err);
  const c = JSON.parse(run("contact", "show", "1", "--json").out);
  assert.deepEqual(c.channels.map(x => [x.kind, x.followers]), [["youtube", 140000], ["twitch", 2000], ["tiktok", 712000]]);
  assert.deepEqual(c.scales, ["indie"]);
  const bad = run("contact", "set", "1", "scales=aa", "scales=aaa", "reddit=https://reddit.com/r/a");
  assert.equal(bad.code, 1);
  assert.match(bad.err, /given twice; nothing was written/);
  const after = JSON.parse(run("contact", "show", "1", "--json").out);
  assert.deepEqual([after.scales, after.reddit], [["indie"], ""]);
  assert.match(run("help").out, /channel=kind=url\|followers\|date adds or updates one channel/);
});
