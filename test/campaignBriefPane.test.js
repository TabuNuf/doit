// The Campaigns tab's brief pane, its PATCH requests, the event game filter and the + Campaign around this button.

import test from "node:test";
import assert from "node:assert/strict";

const epic = { project: "m", id: "EPIC-3", name: "Next Fest", status: "Active", games: ["a", "b"], event: "7", brief: { goal: "wishlists", occasion: "festival" }, done: 1, total: 4 };
const profiles = [{ game: "a", name: "A", kind: "game", project: "a" }, { game: "b", name: "B", kind: "application", project: "b" }];

test("the brief pane has editable fields, For checkboxes with Settings, Add contacts and suggestions", async () => {
  const { briefPane } = await import("../web/campaignBrief.js");
  const events = [{ id: 7, name: "Next Fest", event: { year: 2027, where: "steam" } }];
  const s = { contacts: [{ id: 5, name: "Bit", reach: 12000, game: "a", reason: "puzzle", lastAbout: null }, { id: 6, name: "Byte", reach: 900, game: "a", reason: "co-op", lastAbout: "2026-10-01" }], festivals: [{ id: 7, name: "Next Fest", year: 2027, deadline: "2026-12-01", games: ["a"] }] };
  const html = briefPane(epic, profiles, events, s, 5);
  assert.match(html, /id="cb-game-a" checked/);
  assert.match(html, /data-mk-settings="b"/);
  assert.match(html, /<textarea id="cb-goal"[^>]*>wishlists<\/textarea>/);
  assert.match(html, /<option value="festival" selected>/);
  assert.match(html, /<option value="7" selected>Next Fest 2027/);
  assert.match(html, /data-campaign="m\/EPIC-3"[^>]*>Open on Board/);
  assert.match(html, /data-mk-caddall="10"/);
  assert.match(html, /data-contact="5" aria-pressed="true".*not contacted about a/s);
  assert.match(html, /contacted 1 Oct/);
  assert.match(html, /data-mk-cadd="6"/);
  assert.match(html, /data-contact="7" data-mk-to="events"/);
  assert.match(briefPane(null, profiles, [], null, null), /Select a campaign.*\+ Campaign/);
});

test("an edited brief field sends a PATCH, and nothing when it is unchanged", async () => {
  const { briefRequest } = await import("../web/campaignBrief.js");
  assert.deepEqual(briefRequest({ id: "cb-goal", value: "more" }, epic), { method: "PATCH", path: "/api/campaigns/m/EPIC-3", body: { goal: "more" } });
  assert.equal(briefRequest({ id: "cb-goal", value: " wishlists " }, epic), null);
  assert.deepEqual(briefRequest({ id: "cb-game-b", checked: false }, epic).body, { game: ["a"] });
  assert.deepEqual(briefRequest({ id: "cb-game-c", checked: true }, epic).body, { game: ["a", "b", "c"] });
  assert.equal(briefRequest({ id: "cb-game-a", checked: false }, { ...epic, games: ["a"] }), null, "a campaign keeps one game");
  assert.deepEqual(briefRequest({ id: "cb-event", value: "" }, epic).body, { event: "" });
});

test("the event panes: a game select in the left pane, + Campaign around this, and a form with the event chosen", async () => {
  const { eventsInfoPane } = await import("../web/festivalsPane.js");
  const { eventPane } = await import("../web/eventDetail.js");
  const { campaignForm } = await import("../web/campaignsPane.js");
  assert.match(eventsInfoPane("Events", "b", profiles.map(p => ({ game: p.game, name: p.name }))), /<select id="mk-ev-game".*<option value="b" selected>B/s);
  const c = { id: 9, name: "Fest", types: [], channels: [], event: { year: 2027, criteria: { genres: [], stages: [], platforms: [] } } };
  assert.match(eventPane(c, "Festival"), /data-mk-camp-event="9"[^>]*>\+ Campaign around this/);
  const form = campaignForm(profiles, "", [{ id: 9, name: "Fest", event: { year: 2027 } }], "9");
  assert.match(form, /<option value="9" selected>Fest 2027/);
  assert.match(form, /<label class="mk-check"><input type="checkbox"[^>]*> A \(game\)<\/label>/);
});
