// The weekly outreach list, the contact pick and the Outreach facade over a board and a book.
import test from "node:test";
import assert from "node:assert/strict";
import { planWeek, pickContacts, outreachLines } from "../src/domain/outreachPlan.js";
import { ContactBook } from "../src/domain/contactBook.js";
import { Outreach } from "../src/domain/outreach.js";
import { ClaudeView } from "../src/domain/claude.js";
import { setup } from "./helpers.js";
import { MemoryContacts } from "./memoryContacts.js";

const TODAY = "2026-11-20";
const contact = (id, extra = {}) => ({ id, name: `C${id}`, status: "active", reach: 100, next: "", fit: [{ game: "bb" }], ...extra });
const task = (n, extra = {}) => ({ project: "mk", id: `T-001.${n}`, epic: "EPIC-001", title: `Step ${n}`, state: "todo", rank: n, game: "bb", contact: null, ...extra });
const fest = (id, deadline, extra = {}) => ({ id, name: `F${id}`, event: { year: 2027, deadline, state: "watching" }, games: ["bb"], ...extra });
const plan = (input, rest = {}) => planWeek({ today: TODAY, ...input, ...rest });

test("contacts: campaign tasks first by rank, then due ones oldest first, none repeated, cut at 5", () => {
  const contacts = [contact(1), contact(2, { next: "2026-11-10", reach: 5 }), contact(3, { next: "2026-11-10", reach: 900 }), contact(4, { next: "2026-11-01" }),
    contact(5, { next: "2026-11-20" }), contact(6, { next: "2026-11-21" }), contact(7, { next: "2026-11-02", status: "dormant" }), contact(8, { next: "2026-11-02", fit: [] })];
  const tasks = [task(2, { contact: 2 }), task(1, { contact: 1 }), task(3, { contact: 2 }), task(4, { contact: 9, state: "done" }), task(5, { contact: 9, game: null })];
  const { contacts: out } = plan({ contacts, tasks });
  assert.deepEqual(out.map(c => `${c.id}:${c.why}`), ["1:campaign", "2:campaign", "4:due", "3:due", "5:due"]);
  assert.equal(out[0].ref, "mk/T-001.1");
  assert.equal(out[2].game, "bb");
  assert.equal(plan({ contacts, tasks }, { caps: { contacts: 2, steps: 3 } }).contacts.length, 2);
});

test("steps: open campaign tasks without a contact, by rank, cut at 3", () => {
  const tasks = [1, 2, 3, 4, 5].map(n => task(n)).concat([task(6, { state: "done" }), task(7, { game: null }), task(8, { contact: 1 })]).reverse();
  const { steps } = plan({ tasks, contacts: [contact(1)] });
  assert.deepEqual(steps.map(s => s.ref), ["mk/T-001.1", "mk/T-001.2", "mk/T-001.3"]);
  assert.deepEqual(steps[0], { ref: "mk/T-001.1", title: "Step 1", game: "bb" });
});

test("festivals: the 14-day window includes today and day 14, not 15 or yesterday", () => {
  const festivals = [fest(1, "2026-12-04"), fest(2, "2026-12-05"), fest(3, "2026-11-20"), fest(4, "2026-11-19"), fest(5, "2026-11-25", { games: [] }),
    fest(6, "2026-11-22", { event: { year: 2027, deadline: "2026-11-22", state: "applied" } }), fest(7, "2026-11-21", { event: { year: 2027, deadline: "2026-11-21" } }), fest(8, "")];
  const out = plan({ festivals }).festivals;
  assert.deepEqual(out.map(f => f.id), [3, 7, 1]);
  assert.deepEqual(out[2], { id: 1, name: "F1", year: 2027, deadline: "2026-12-04", daysLeft: 14, games: ["bb"], platform: false });
  assert.equal(out[0].daysLeft, 0);
});

test("festivals are not capped", () => {
  const festivals = Array.from({ length: 9 }, (_, i) => fest(i + 1, "2026-11-25"));
  assert.equal(plan({ festivals }).festivals.length, 9);
});

test("an empty week has empty lists and one line", () => {
  const empty = plan({});
  assert.deepEqual(empty, { contacts: [], festivals: [], steps: [] });
  assert.deepEqual(outreachLines(empty), ["Outreach this week: nothing"]);
});

test("outreachLines: three lines, none for an empty part", () => {
  const lines = outreachLines(plan({ contacts: [contact(1, { next: "2026-11-01" })], festivals: [fest(1, "2026-11-25")] }));
  assert.deepEqual(lines, ["Outreach contacts 1: C1 (bb, due)", "Festival deadlines within 14 days 1: F1 2027 (2026-11-25, 5 days)", "Campaign steps: none"]);
});

test("pickContacts: active, fit, not past the event, not taken, largest reach first, limited", () => {
  const contacts = [contact(1, { reach: 10 }), contact(2, { reach: 500 }), contact(3, { reach: 900, status: "dormant" }), contact(4, { reach: 800, fit: [{ game: "gb" }] }),
    contact(5, { reach: 700, next: "2027-02-02" }), contact(6, { reach: 600, next: "2027-02-01" }), contact(7, { reach: 400 }), contact(8, { reach: null })];
  const ids = o => pickContacts({ contacts, games: ["bb"], ...o }).map(c => c.id);
  assert.deepEqual(ids({ until: "2027-02-01", taken: [7] }), [6, 2, 1, 8]);
  assert.deepEqual(ids({}), [5, 6, 2, 7, 1, 8], "no event, no date limit");
  assert.deepEqual(ids({ limit: 2 }), [5, 6]);
});

const shelf = { list: () => [{ game: "bunny-bunker" }, { game: "good-box" }], has: g => ["bunny-bunker", "good-box"].includes(g) };
function world(t) {
  const s = setup(); t.after(s.cleanup);
  const book = new ContactBook(new MemoryContacts(), shelf, () => new Date("2026-11-20T09:00:00"));
  const outreach = new Outreach(s.board, book);
  s.board.subscribe(f => outreach.taskDone(f));
  return { ...s, book, outreach };
}

test("addCampaign needs a profile game and a date or festival event", t => {
  const w = world(t);
  const fest = w.book.add({ name: "Next Fest", types: ["festival"], event: { year: 2027, starts: "2027-02-01", deadline: "2026-11-30" } });
  const plain = w.book.add({ name: "Ada", types: ["influencer"] });
  assert.throws(() => w.outreach.addCampaign("game", "X", { game: "nope" }), /profile/);
  assert.throws(() => w.outreach.addCampaign("game", "X", { game: "good-box", event: "soon" }), /Event must be/);
  assert.throws(() => w.outreach.addCampaign("game", "X", { game: "good-box", event: String(plain.id) }), /Event must be/);
  const id = w.outreach.addCampaign("game", "Fest push", { game: "bunny-bunker", event: String(fest.id) });
  const e = w.board.view({ project: "game" }).epics.find(x => x.id === id);
  assert.deepEqual([e.status, e.game, e.event], ["Active", "bunny-bunker", String(fest.id)]);
});

test("addContacts makes human tasks for the best fits, once", t => {
  const w = world(t);
  const fest = w.book.add({ name: "Next Fest", types: ["festival"], event: { year: 2027, starts: "2027-02-01" } });
  const a = w.book.add({ name: "Ada", types: ["influencer"], reach: 900 });
  const b = w.book.add({ name: "Bit", types: ["blogger"], reach: 50 });
  const late = w.book.add({ name: "Late", types: ["blogger"], reach: 999, next: "2027-03-01" });
  for (const c of [a, b, late]) w.book.setFit(c.id, "bunny-bunker", "plays co-op");
  const epic = w.outreach.addCampaign("game", "Fest push", { game: "bunny-bunker", event: String(fest.id) });
  const made = w.outreach.addContacts("game", epic, 1);
  assert.equal(made.length, 1);
  const t1 = w.board.get(made[0]);
  assert.deepEqual([t1.title, t1.owner, t1.state, t1.contact, t1.doneWhen], ["Reach out to Ada", "human", "todo", a.id, "a mail or message sent"]);
  assert.deepEqual(w.outreach.addContacts("game", epic).map(r => w.board.get(r).contact), [b.id]);
  assert.deepEqual(w.outreach.addContacts("game", epic), []);
});

test("addContacts refuses an epic that is not an open campaign or a bad limit", t => {
  const w = world(t);
  assert.throws(() => w.outreach.addContacts("game", "EPIC-014"), /not a campaign/);
  assert.throws(() => w.outreach.addContacts("game", "EPIC-099"), /No open epic/);
  const epic = w.outreach.addCampaign("game", "Push", { game: "bunny-bunker" });
  assert.throws(() => w.outreach.addContacts("game", epic, 0), /Limit/);
});

test("week gathers festivals per game, and the morning report ends with its lines", t => {
  const w = world(t);
  w.book.add({ name: "Next Fest", types: ["festival"], event: { year: 2027, deadline: "2026-11-27" } });
  const a = w.book.add({ name: "Ada", types: ["influencer"], next: "2026-11-01" });
  w.book.setFit(a.id, "good-box", "puzzle");
  const week = w.outreach.week();
  assert.deepEqual(week.festivals.map(f => [f.name, f.games]), [["Next Fest", ["bunny-bunker", "good-box"]]]);
  assert.deepEqual(week.contacts.map(c => [c.name, c.game, c.why]), [["Ada", "good-box", "due"]]);
  const lines = new ClaudeView(w.board, { record() {} }, () => w.clock.t, w.outreach).morning();
  assert.match(lines.at(-3), /^Outreach contacts 1: Ada/);
  assert.match(lines.at(-2), /^Festival deadlines within 14 days 1: Next Fest 2027/);
  assert.equal(lines.at(-1), "Campaign steps: none");
});

test("the week's campaign steps leave out the open tasks of a parked campaign epic and list them once it is open", t => {
  const w = world(t);
  const id = w.board.addEpic("game", "Side push", { status: "Planned", game: "bunny-bunker" });
  const step = w.board.addTask({ project: "game", epic: id, title: "Draft the pitch" }).id;
  w.board.moveEpic("game", id, "parked");
  assert.deepEqual(w.outreach.week().steps, []);
  w.board.moveEpic("game", id, "open");
  assert.deepEqual(w.outreach.week().steps.map(x => x.ref), [`game/${step}`]);
});
