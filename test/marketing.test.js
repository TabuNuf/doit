// The Marketing view and the contact detail pane: HTML from fixtures and the requests the edits send.
import test from "node:test";
import assert from "node:assert/strict";

const contact = (id, over = {}) => ({ id, name: `Person ${id}`, types: ["influencer"], topic: "", email: "", reach: 2500, notes: "", status: "active", next: "", due: false, channels: [], fit: [], touches: [], ...over });
const FIXTURE = [
  contact(1, { name: "Quiet One", reach: 20000 }),
  contact(2, { name: "Overdue <b>", reach: 950, next: "2026-01-02", due: true, types: ["press", "blogger"] }),
  contact(3, { name: "Asleep", status: "dormant" }),
];

test("the list puts due contacts first and marks them", async () => {
  const { listPane, dueFirst } = await import("../web/marketingView.js");
  assert.deepEqual(dueFirst(FIXTURE).map(c => c.id), [2, 1, 3]);
  const html = listPane(FIXTURE, 1);
  assert.ok(html.indexOf("Overdue &lt;b&gt;") < html.indexOf("Quiet One"), "due first");
  assert.match(html, /<div class="sec-h">Due<span class="c">1<\/span>/);
  assert.match(html, /pill due late"[^>]*>due /);
  assert.match(html, /data-contact="1" aria-pressed="true"/);
  assert.match(html, /data-contact="2" aria-pressed="false"/);
  assert.doesNotMatch(html, /<b>/);
});

test("a row shows name, types, reach, status and next date", async () => {
  const { contactRow, listPane } = await import("../web/marketingView.js");
  const html = contactRow(FIXTURE[1], null);
  for (const s of ["press", "blogger", ">950<", ">active<", "2 Jan"]) assert.ok(html.includes(s), s);
  assert.match(listPane([], null), /No contact matches/);
});

test("filters become query parameters, with a reach count", async () => {
  const { contactPath, filterPane } = await import("../web/marketingView.js");
  assert.equal(contactPath({ type: "", reach: "", status: "" }), "/api/contacts?except=festival%2Cconference");
  assert.equal(contactPath({ type: "press", reach: "1000", status: "active" }, "storm-haven"), "/api/contacts?fits=storm-haven&type=press&reach=1000&status=active&except=festival%2Cconference");
  const html = filterPane({ type: "", reach: "1000", status: "" });
  assert.doesNotMatch(html, /mk-game|festival|conference/, "the game is picked in the top bar; events have their own tabs");
  assert.match(html, /<option value="1000" selected>1 000/);
});

test("the detail pane shows channels as safe links, fit with reason, and touches in the order given", async () => {
  const { detailPane } = await import("../web/contactDetail.js");
  const c = contact(5, {
    channels: [{ kind: "youtube", url: "https://example.org/yt" }, { kind: "bluesky", url: "example.social/x" }, { kind: "x", url: "javascript:alert(1)" }],
    fit: [{ game: "storm-haven", reason: "Plays <tactics>" }],
    touches: [{ date: "2026-03-02", kind: "reply", game: "" }, { date: "2026-02-01", kind: "mail", game: "storm-haven" }],
    notes: "a \"note\"", next: "2026-04-01", status: "dormant",
  });
  const html = detailPane(c, [], false, "2026-03-05");
  assert.match(html, /<a href="https:\/\/example.org\/yt" target="_blank" rel="noopener">/);
  assert.match(html, /<a href="https:\/\/example.social\/x" target="_blank" rel="noopener">/);
  assert.doesNotMatch(html, /href="javascript/);
  assert.match(html, /storm-haven<\/span><\/div>Plays &lt;tactics&gt;/);
  assert.ok(html.indexOf("2026-03-02") < html.indexOf("2026-02-01"));
  assert.match(html, /<option value="dormant" selected>/);
  assert.match(html, /id="mk-next" value="2026-04-01"/);
  assert.match(html, /a &quot;note&quot;<\/textarea>/);
  assert.doesNotMatch(html, /id="mk-touch"/);
  assert.match(detailPane(null, [], false, "2026-03-05"), /Select a contact/);
});

test("the touch form lists the kinds and games and defaults the date to today", async () => {
  const { detailPane } = await import("../web/contactDetail.js");
  const html = detailPane(contact(5), [{ game: "storm-haven", name: "Storm Haven" }], true, "2026-03-05");
  assert.match(html, /id="mk-touch"/);
  for (const k of ["mail", "reply", "video"]) assert.match(html, new RegExp(`<option value="${k}"`));
  assert.match(html, /<option value="storm-haven" >Storm Haven/);
  assert.match(html, /id="mk-tk-date" value="2026-03-05"/);
});

test("edits build the right requests and nothing when the value is unchanged", async () => {
  const { editRequest, touchRequest } = await import("../web/contactDetail.js");
  const c = contact(7, { notes: "old", next: "2026-04-01" });
  assert.deepEqual(editRequest({ id: "mk-status", value: "archived" }, c), { method: "PATCH", path: "/api/contacts/7", body: { status: "archived" } });
  assert.deepEqual(editRequest({ id: "mk-next", value: "" }, c), { method: "PATCH", path: "/api/contacts/7", body: { next: "" } });
  assert.deepEqual(editRequest({ id: "mk-notes", value: "new" }, c), { method: "PATCH", path: "/api/contacts/7", body: { notes: "new" } });
  assert.equal(editRequest({ id: "mk-notes", value: "old" }, c), null);
  assert.equal(editRequest({ id: "mk-status", value: "active" }, c), null);
  assert.deepEqual(touchRequest(c, { kind: "video", game: "storm-haven", date: "2026-02-02" }, "2026-03-05"), { method: "POST", path: "/api/contacts/7/touch", body: { kind: "video", game: "storm-haven", date: "2026-02-02" } });
  assert.deepEqual(touchRequest(c, { kind: "mail", game: "", date: "" }, "2026-03-05").body, { kind: "mail", game: "", date: "2026-03-05" });
});

test("a reload is held while the touch form is open in the Marketing view", async () => {
  const { reloadHeld, S } = await import("../web/state.js");
  assert.equal(reloadHeld({ ...S, view: "marketing", mk: { touchOpen: true } }, null), true);
  assert.equal(reloadHeld({ ...S, view: "marketing", mk: { touchOpen: false } }, null), false);
  assert.equal(reloadHeld({ ...S, view: "marketing", mk: { touchOpen: false } }, { tagName: "TEXTAREA" }), true);
});

const draft = (id, over = {}) => ({ id, contact: 1, contactName: "Ada", to: "ada@example.com", game: "good-box", subject: "Hello", body: "Hi <Ada>", state: "draft", error: "", sentAt: "", labeled: false, ...over });

test("a draft shows as the mail will look, editable while draft or failed", async () => {
  const { draftCard } = await import("../web/draftsPane.js");
  const html = draftCard(draft(4));
  assert.match(html, /Ada &lt;ada@example\.com&gt;/);
  assert.match(html, /<input id="mk-dr-subject-4" value="Hello"/);
  assert.match(html, /<textarea id="mk-dr-body-4"[^>]*>Hi &lt;Ada&gt;<\/textarea>/);
  assert.match(html, /data-mk-send="4">Approve and send/);
  assert.match(html, /data-mk-discard="4"/);
  assert.match(draftCard(draft(5, { state: "failed", error: "Login refused" })), /Not sent: Login refused/);
  const waiting = draftCard(draft(6, { state: "approved" }));
  assert.match(waiting, /waits for the daily cap/);
  assert.doesNotMatch(waiting, /<textarea/);
  const sent = draftCard(draft(7, { state: "sent", sentAt: "2026-11-21T10:05:00", labeled: true }));
  assert.match(sent, /Sent 21 Nov 10:05 · labeled Marketing/);
  assert.doesNotMatch(sent, /data-mk-send|data-mk-discard|<textarea/);
  assert.match(draftCard(draft(8, { state: "sent", sentAt: "2026-11-21T10:05:00" })), /not yet labeled/);
});

test("the drafts pane shows the status line, the sweep result and an empty state", async () => {
  const { draftsPane, statusLine, sweepSummary, sendQuestion, draftEditRequest } = await import("../web/draftsPane.js");
  assert.equal(statusLine({ ready: false }), "Mail is not set up");
  assert.equal(statusLine({ ready: true, address: "me@example.com", sentToday: 3, cap: 20 }), "me@example.com · 3 of 20 sent today");
  assert.match(draftsPane([], { ready: false }, "Sweep: 1 reply filed, 0 sent mails labeled"), /Sweep: 1 reply filed[\s\S]*No drafts/);
  assert.match(draftsPane([], { ready: false }, ""), /Mail is not set up/);
  assert.equal(sweepSummary({ ok: true, replies: [{}, {}], labeled: 1 }), "Sweep: 2 replies filed, 1 sent mail labeled");
  assert.equal(sweepSummary({ ok: false, skipped: "Mail is not set up" }), "");
  assert.equal(sweepSummary({ ok: false, error: "Login refused" }), "Sweep failed: Login refused");
  assert.equal(sendQuestion(draft(1)), 'Send "Hello" to Ada <ada@example.com>?');
  assert.deepEqual(draftEditRequest({ id: "mk-dr-body-1", value: "New" }, [draft(1)]), { method: "PATCH", path: "/api/drafts/1", body: { body: "New" } });
  assert.equal(draftEditRequest({ id: "mk-dr-body-1", value: "Hi <Ada>" }, [draft(1)]), null);
  assert.equal(draftEditRequest({ id: "mk-status", value: "x" }, [draft(1)]), null);
});

test("a touch shows its note, and the contacts pane offers the drafts", async () => {
  const { detailPane } = await import("../web/contactDetail.js");
  const { listPane } = await import("../web/marketingView.js");
  const html = detailPane(contact(1, { touches: [{ date: "2026-11-21", kind: "mail", game: "good-box", note: "Good Box for Ada" }] }), [], false, "2026-11-21");
  assert.match(html, /2026-11-21<\/span> · mail · good-box · Good Box for Ada/);
  assert.match(listPane([contact(1)], null, 2), /data-mk-pane="drafts"[^>]*>Drafts \(2\)/);
});

test("genres: the pane edits them as tags, the filter lists those in use and becomes a query parameter", async () => {
  const { detailPane, editRequest } = await import("../web/contactDetail.js");
  const { contactPath, filterPane } = await import("../web/marketingView.js");
  const c = contact(7, { genres: ["Indie", "Horror"] });
  assert.match(detailPane(c, [], false, "2026-03-05"), /id="mk-genres" value="Indie, Horror"/);
  assert.deepEqual(editRequest({ id: "mk-genres", value: "Indie, Puzzle ,, " }, c), { method: "PATCH", path: "/api/contacts/7", body: { genres: ["Indie", "Puzzle"] } });
  assert.equal(editRequest({ id: "mk-genres", value: "Indie,Horror" }, c), null);
  assert.match(contactPath({ type: "", reach: "", status: "", genre: "Horror" }), /genre=Horror/);
  const html = filterPane({ type: "", reach: "", status: "", genre: "Horror" }, ["Horror", "Indie"]);
  assert.match(html, /<option value="" >Any genre<\/option><option value="Horror" selected>Horror<\/option><option value="Indie" >Indie/);
});
