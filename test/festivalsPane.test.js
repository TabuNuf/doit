// The Festivals pane from a fixture, and the route's rules.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup, addProfiles } from "./helpers.js";

const festival = (id, { event, ...over } = {}) => ({ id, name: `Fest ${id}`, event: { year: 2027, deadline: "2026-12-01", cost: "free", where: "steam", state: "watching", ...event }, daysLeft: 10, match: { match: true, criteriaUnknown: false }, ...over });

test("the Festivals pane lists days left, cost, state and the criteria-unknown mark", async () => {
  const { festivalsPane, eventsInfoPane, festivalPath } = await import("../web/festivalsPane.js");
  const html = festivalsPane([
    festival(1, { name: "Next <Fest>", event: { cost: "free" } }),
    festival(2, { daysLeft: 0, event: { deadline: "2026-11-21", cost: "", state: "applied" }, match: { match: true, criteriaUnknown: true } }),
    festival(3, { daysLeft: null, event: { deadline: "" } }),
  ], 2);
  assert.match(html, /Next &lt;Fest&gt; 2027/);
  assert.match(html, /10 days left/);
  assert.match(html, /· today/);
  assert.match(html, /no deadline/);
  assert.match(html, />free</);
  assert.match(html, />applied</);
  assert.equal(html.match(/criteria unknown/g).length, 1);
  assert.match(html, /data-contact="2" aria-pressed="true"/);
  assert.match(festivalsPane([], null), /Nothing matches/);
  assert.match(festivalsPane([], null, "Events"), /aria-label="Events"><div class="pane-h">Events/);
  assert.match(festivalsPane(null, null), /Loading/);
  assert.match(eventsInfoPane("Events", "good-box", [{ game: "good-box", name: "Good Box" }]), /Shows events that fit Good Box/);
  assert.match(eventsInfoPane("Festivals", "", []), /pick a game in the top bar/);
  assert.equal(festivalPath(""), "/api/festivals");
  assert.equal(festivalPath("good-box"), "/api/festivals?game=good-box");
  assert.equal(festivalPath("good-box", "conference"), "/api/festivals?game=good-box&type=conference");
});

test("GET /api/festivals matches a game by deadline and leaves out events past their deadline", async t => {
  const s = setup(); t.after(s.cleanup);
  addProfiles(s);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  const up = (name, event) => book.upsertFestival(name, 2027, { event });
  up("Later Fest", { deadline: "2027-02-01", criteria: { genres: ["co-op"] } });
  up("Soon Fest", { deadline: "2026-11-25", cost: "free" });
  up("Gone Fest", { deadline: "2026-11-01", criteria: { genres: ["co-op"] } });
  up("Puzzle Fest", { deadline: "2026-12-01", criteria: { genres: ["puzzle"] } });
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const get = p => fetch(`http://127.0.0.1:${port}${p}`).then(async r => ({ status: r.status, body: await r.json() }));

  const forGame = await get("/api/festivals?game=bunny-bunker");
  assert.deepEqual(forGame.body.map(c => c.name), ["Soon Fest", "Later Fest"]);
  assert.equal(forGame.body[0].match.criteriaUnknown, true);
  assert.equal(typeof forGame.body[0].daysLeft, "number");
  const any = await get("/api/festivals");
  assert.ok(!any.body.some(c => c.name === "Gone Fest"), "past deadline is not listed without a game either");
  assert.equal(any.body.length, 3);
  assert.equal((await get("/api/festivals?game=nope")).status, 400);
});
