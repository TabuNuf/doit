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

test("the This week pane lists the three groups, escapes names and opens a contact or festival", async () => {
  const { weekPane } = await import("../web/weekPane.js");
  const html = weekPane({
    contacts: [{ id: 2, name: "Bit <Blog>", game: "bunny-bunker", why: "campaign", ref: "m/T-1.1" }, { id: 1, name: "Ada", game: "", why: "due" }],
    festivals: [{ id: 3, name: "Next Fest", year: 2027, deadline: "2026-12-01", daysLeft: 11, games: ["bunny-bunker"] }],
    steps: [{ ref: "m/T-1.2", title: "Write the pitch", game: "bunny-bunker" }],
  }, 3);
  assert.match(html, /Bit &lt;Blog&gt;/);
  assert.match(html, /data-contact="2"/);
  assert.match(html, /data-contact="3" aria-pressed="true"/);
  assert.match(html, /11 days left/);
  assert.match(html, /Write the pitch/);
  assert.match(html, /Contacts<span class="c">2<\/span>/);
  const empty = weekPane({ contacts: [], festivals: [], steps: [] }, null);
  assert.match(empty, /No one to reach out to/);
  assert.match(empty, /None within 14 days/);
  assert.match(empty, /No open steps/);
  assert.match(weekPane(null, null), /Loading/);
});

test("the Marketing view puts This week above its tabs", async () => {
  const { S } = await import("../web/state.js");
  const { marketingPanes } = await import("../web/marketingView.js");
  S.mk.week = { contacts: [], festivals: [], steps: [] };
  S.mk.pane = "contacts"; S.mk.contacts = []; S.mk.profiles = [];
  const html = marketingPanes();
  assert.ok(html.indexOf("This week") < html.indexOf("Filters"));
  S.mk.week = null;
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
