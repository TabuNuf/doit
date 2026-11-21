// Outreach routes, the This week pane, Add contacts on a campaign epic and the contact name on a task.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts, makeBoard } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

const M = "polyspice-marketing";

async function serve(t) {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"], reach: 5000 });
  book.add({ name: "Bit Blog", types: ["press"], reach: 9000 });
  book.setFit(1, "bunny-bunker", "cozy");
  book.setFit(2, "bunny-bunker", "co-op");
  book.upsertFestival("Next Fest", 2027, { event: { deadline: "2026-12-01", criteria: { genres: ["co-op"] } } });
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const api = (p, method = "GET", body) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json() }));
  return { s, api };
}

test("GET /api/outreach gives the plan and the contacts route makes tasks, refusing a non-campaign with 400", async t => {
  const { s, api } = await serve(t);
  const epic = (await api("/api/epics", "POST", { project: M, name: "Plain" })).body.id;
  const refused = await api(`/api/campaigns/${M}/${epic}/contacts`, "POST", {});
  assert.equal(refused.status, 400);
  assert.match(refused.body.error, /not a campaign/);

  const board = makeBoard({ home: s.home, now: () => s.clock.t });
  const camp = board.addEpic(M, "Next Fest push", { status: "Active", game: "bunny-bunker" });
  const made = await api(`/api/campaigns/${M}/${camp}/contacts`, "POST", { limit: 1 });
  assert.equal(made.status, 200);
  assert.equal(made.body.refs.length, 1);
  assert.equal((await api(`/api/campaigns/${M}/${camp}/contacts`, "POST", { limit: 0 })).status, 400);

  const plan = (await api("/api/outreach")).body;
  assert.deepEqual(Object.keys(plan), ["contacts", "festivals", "steps"]);
  assert.equal(plan.contacts[0].name, "Bit Blog");
  assert.equal(plan.contacts[0].why, "campaign");
  assert.equal(plan.festivals[0].name, "Next Fest");
  const task = (await api("/api/board?project=all")).body.tasks.find(x => `${x.project}/${x.id}` === made.body.refs[0]);
  assert.deepEqual([task.contact, task.game], [2, "bunny-bunker"]);
});

test("the Overview tab lists the week's three groups, escapes names, opens a row in its tab and keeps the picked game", async () => {
  const { overviewPanes } = await import("../web/weekPane.js");
  const plan = {
    contacts: [{ id: 2, name: "Bit <Blog>", game: "bunny-bunker", why: "campaign", ref: "m/T-1.1" }, { id: 1, name: "Ada", game: "good-box", why: "due" }],
    festivals: [{ id: 3, name: "Next Fest", year: 2027, deadline: "2026-12-01", daysLeft: 11, games: ["bunny-bunker"] }],
    steps: [{ ref: "m/T-1.2", title: "Write the pitch", game: "bunny-bunker" }],
  };
  const html = overviewPanes(plan, 3);
  assert.match(html, /Bit &lt;Blog&gt;/);
  assert.match(html, /data-contact="2" data-mk-to="contacts"/);
  assert.match(html, /data-contact="3" data-mk-to="festivals" aria-pressed="true"/);
  assert.match(html, /11 days left/);
  assert.match(html, /Write the pitch/);
  assert.match(html, /Contacts this week<span class="c">2<\/span>/);
  assert.match(overviewPanes(plan, null, "good-box"), /Contacts this week<span class="c">1<\/span>.*Festival deadlines<span class="c">0<\/span>.*Campaign steps<span class="c">0<\/span>/s);
  const empty = overviewPanes({ contacts: [], festivals: [], steps: [] }, null);
  assert.match(empty, /No one to reach out to/);
  assert.match(empty, /None within 14 days/);
  assert.match(empty, /No open steps/);
  assert.match(overviewPanes(null, null), /Loading/);
});

test("This week is only on the Overview tab, so the other tabs' lists get the full height", async () => {
  const { S } = await import("../web/state.js");
  const { marketingPanes } = await import("../web/marketingView.js");
  S.mk.week = { contacts: [], festivals: [], steps: [] };
  S.mk.pane = "contacts"; S.mk.contacts = []; S.mk.profiles = [];
  assert.doesNotMatch(marketingPanes(), /This week|Festival deadlines/);
  S.mk.pane = "overview";
  assert.match(marketingPanes(), /Contacts this week.*Festival deadlines.*Campaign steps/s);
  S.mk.week = null; S.mk.pane = "campaigns";
});

test("the Campaigns tab shows the picked game's profile and its campaign epics, Active first", async () => {
  const { campaignsFor, campaignsPane, profilePane } = await import("../web/campaignsPane.js");
  const epics = [
    { project: "m", id: "EPIC-010", name: "Old push", status: "Planned", game: "bunny-bunker", done: 0, total: 2 },
    { project: "m", id: "EPIC-002", name: "Inbox", status: "Active", game: null, done: 0, total: 0 },
    { project: "m", id: "EPIC-009", name: "Next Fest", status: "Active", game: "bunny-bunker", done: 1, total: 4 },
    { project: "m", id: "EPIC-011", name: "Box launch", status: "Active", game: "box-trainer", done: 0, total: 1 },
  ];
  assert.deepEqual(campaignsFor(epics, "").map(e => e.id), ["EPIC-009", "EPIC-011", "EPIC-010"]);
  assert.deepEqual(campaignsFor(epics, "bunny-bunker").map(e => e.id), ["EPIC-009", "EPIC-010"]);
  const html = campaignsPane(campaignsFor(epics, "bunny-bunker"));
  assert.match(html, /data-campaign="m\/EPIC-009"/);
  assert.match(html, /1\/4/);
  assert.match(campaignsPane([]), /No campaign/);
  const profiles = [{ game: "box-trainer", name: "Box Trainer", kind: "game", stage: "demo", release: "", genres: ["puzzle"], platforms: [], needs: ["wishlists"], project: "box-trainer" }];
  assert.match(profilePane("box-trainer", profiles), /<h2>Box Trainer<\/h2>.*puzzle.*wishlists.*Marketing\/Profile\.md/s);
  assert.match(profilePane("", profiles), /Pick a game or podcast/);
  assert.match(profilePane("", []), /doit profile add/);
  assert.match(profilePane("doit", [{ game: "doit", name: "Doit", kind: "application", missing: true }]), /application.*No Marketing\/Profile\.md yet.*doit profile add doit/s);
});

test("an open campaign epic shows Add contacts; a plain or closed one does not", async () => {
  const { S } = await import("../web/state.js");
  const { epicViewPane, isCampaign } = await import("../web/epicView.js");
  const epic = over => ({ project: "m", id: "EPIC-020", status: "Active", completed: false, text: "# EPIC-020: X\n\nStatus: Active\nGame: bunny-bunker\n", ...over });
  S.epic = "m/EPIC-020";
  S.epicView = epic();
  assert.match(epicViewPane(""), /data-add-contacts="m\/EPIC-020"[^>]*>Add contacts/);
  S.epicView = epic({ text: "# EPIC-020: X\n\nStatus: Active\n" });
  assert.doesNotMatch(epicViewPane(""), /Add contacts/);
  assert.equal(isCampaign(epic({ completed: true })), false);
  S.epic = null; S.epicView = null;
});

test("a task with a contact shows the contact's name on its card", async () => {
  const { S } = await import("../web/state.js");
  const { setContactNames, contactName, contactButton } = await import("../web/contactNames.js");
  const { rowHtml } = await import("../web/render.js");
  setContactNames([{ id: 2, name: "Bit <Blog>" }]);
  assert.equal(contactName(2), "Bit <Blog>");
  assert.equal(contactName(9), "Contact 9");
  assert.match(contactButton(2), /data-task-contact="2"[^>]*>Bit &lt;Blog&gt;</);
  S.data = { projects: [{ id: "m", name: "M" }], settings: { keepCompletedDays: 7 } };
  S.project = "m";
  const task = { project: "m", id: "T-1.1", title: "Reach out to Bit Blog", type: "task", owner: "human", state: "todo", contact: 2 };
  assert.match(rowHtml(task, 0, "active"), /data-task-contact="2"[^>]*>Bit &lt;Blog&gt;</);
  assert.doesNotMatch(rowHtml({ ...task, contact: null }, 0, "active"), /data-task-contact/);
  S.data = null;
});
