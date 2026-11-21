// The Marketing view and the contact detail pane: HTML from fixtures and the requests the edits send.
import test from "node:test";
import assert from "node:assert/strict";

const contact = (id, over = {}) => ({ id, name: `Person ${id}`, types: ["influencer"], topic: "", email: "", reach: "C", notes: "", status: "active", next: "", due: false, channels: [], fit: [], touches: [], ...over });
const FIXTURE = [
  contact(1, { name: "Quiet One", reach: "A" }),
  contact(2, { name: "Overdue <b>", reach: "D", next: "2026-01-02", due: true, types: ["press", "blogger"] }),
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
  for (const s of ["press", "blogger", ">D<", ">active<", "2 Jan"]) assert.ok(html.includes(s), s);
  assert.match(listPane([], null), /No contact matches/);
});

test("filters become query parameters, with a reach plus encoded", async () => {
  const { contactPath, filterPane } = await import("../web/marketingView.js");
  assert.equal(contactPath({ game: "", type: "", reach: "", status: "" }), "/api/contacts");
  assert.equal(contactPath({ game: "storm-haven", type: "press", reach: "C+", status: "active" }), "/api/contacts?fits=storm-haven&type=press&reach=C%2B&status=active");
  const html = filterPane({ game: "storm-haven", type: "", reach: "C+", status: "" }, [{ game: "storm-haven", name: "Storm Haven" }]);
  assert.match(html, /<option value="storm-haven" selected>Storm Haven/);
  assert.match(html, /<option value="C\+" selected>C and larger/);
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
