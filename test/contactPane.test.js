// The contact pane's channel and About edits: the requests the page builds, sent to the server, and what marketing.db holds after each.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer, makeContacts } from "../src/root.js";
import { setup } from "./helpers.js";
import { detailPane, editRequest } from "../web/contactDetail.js";
import { channelAdd, channelRemove } from "../web/contactChannels.js";

test("a channel is added, edited and removed in the pane, an About text saved, and each change is in marketing.db", async t => {
  const s = setup(); t.after(s.cleanup);
  const book = makeContacts({ home: s.home, now: () => s.clock.t });
  book.add({ name: "Ada Plays", types: ["influencer"], channels: [{ kind: "youtube", url: "https://youtube.com/@ada" }] });
  book.source.close();
  const server = makeServer({ home: s.home, now: () => s.clock.t });
  const port = await server.listen(0);
  t.after(() => server.close());
  const send = async req => (await fetch(`http://127.0.0.1:${port}${req.path}`, { method: req.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) })).json();
  const stored = () => { const b = makeContacts({ home: s.home, now: () => s.clock.t }); const c = b.get(1); b.source.close(); return c; };

  let c = stored();
  const html = detailPane(c, [], false, "2026-11-21");
  assert.match(html, /id="mk-chu-0" value="https:\/\/youtube.com\/@ada"/);
  assert.match(html, /data-mk-ch-add/);
  assert.match(html, /id="mk-about"/);

  c = await send(channelAdd(c, "twitch", " twitch.tv/ada "));
  assert.deepEqual(stored().channels, [{ kind: "youtube", url: "https://youtube.com/@ada" }, { kind: "twitch", url: "twitch.tv/ada" }]);

  assert.equal(editRequest({ id: "mk-chu-1", value: "twitch.tv/ada" }, c), null, "nothing new");
  c = await send(editRequest({ id: "mk-chu-1", value: "https://twitch.tv/adaplays" }, c));
  assert.equal(stored().channels[1].url, "https://twitch.tv/adaplays");
  c = await send(editRequest({ id: "mk-chk-0", value: "website" }, c));
  assert.equal(stored().channels[0].kind, "website");

  assert.equal(channelAdd(c, "x", "  "), null, "an empty URL sends nothing");
  c = await send(channelRemove(c, 1));
  assert.deepEqual(stored().channels, [{ kind: "website", url: "https://youtube.com/@ada" }]);

  c = await send(editRequest({ id: "mk-about", value: "Cozy co-op streamer, 5k on Twitch." }, c));
  assert.equal(stored().about, "Cozy co-op streamer, 5k on Twitch.");
  assert.match(detailPane(stored(), [], false, "2026-11-21"), /Cozy co-op streamer, 5k on Twitch.<\/textarea>/);
});

test("an empty channel list and no About show plain text and an add row", () => {
  const html = detailPane({ id: 3, name: "Bo", types: ["press"], topic: "", email: "", reach: null, genres: [], about: "", notes: "", status: "active", next: "", due: false, channels: [], fit: [], touches: [] }, [], false, "2026-11-21");
  assert.match(html, /No channels yet\. Add one below\./);
  assert.match(html, /placeholder="Who they are and what they cover\."/);
  assert.doesNotMatch(html, /doit /);
});

test("the pane lists history in date order with a sent draft and shows Last contact; the list row carries it too", async () => {
  const { listPane } = await import("../web/marketingView.js");
  const c = { id: 4, name: "Cy", types: ["press"], topic: "", email: "", reach: null, genres: [], about: "", notes: "", status: "active", next: "", due: false, channels: [], fit: [], last: "2026-10-05",
    touches: [{ date: "2026-10-05", kind: "mail", game: "good-box", note: "Hello" }] };
  const log = [
    { date: "2026-11-02", kind: "reply", game: "good-box", note: "Re: Hello", draft: false },
    { date: "2026-10-20", kind: "mail", game: "bunny-bunker", note: "Demo", draft: true },
    { date: "2026-10-05", kind: "mail", game: "good-box", note: "Hello", draft: false },
  ];
  const html = detailPane(c, [], false, "2026-11-21", log);
  assert.ok(html.indexOf("2026-11-02") < html.indexOf("2026-10-20") && html.indexOf("2026-10-20") < html.indexOf("2026-10-05"));
  assert.match(html, /bunny-bunker · Demo <span class="pill" title="A draft sent from Doit">sent draft/);
  assert.match(html, /<dt>Last contact<\/dt><dd>2026-11-02<\/dd>/, "the pane takes the newest of touches and drafts");
  assert.match(html, /History<span[^>]*> · 3</);
  assert.match(detailPane(c, [], false, "2026-11-21"), /<dt>Last contact<\/dt><dd>2026-10-05<\/dd>/, "before the history loads, the touches' own date");
  assert.match(detailPane({ ...c, last: "", touches: [] }, [], false, "2026-11-21", []), /No contact yet: no mail, reply or video is logged/);
  const row = listPane([c], null);
  assert.match(row, /class="pill mono" title="Last contact 2026-10-05: [^"]*">last 2026-10-05</);
  assert.doesNotMatch(listPane([{ ...c, last: "" }], null), /last 20/);
});

test("with a game picked the Contacts list still holds every contact and marks the ones that fit, with a title saying why", async () => {
  const { listPane, contactPath } = await import("../web/marketingView.js");
  const mk = (id, name, fit = []) => ({ id, name, types: ["influencer"], reach: null, status: "active", next: "", due: false, last: "", fit });
  const list = [mk(1, "Ada", [{ game: "bunny-bunker", reason: "plays <co-op>" }]), mk(2, "Bit"), mk(3, "Cog", [{ game: "good-box", reason: "puzzles" }])];
  assert.doesNotMatch(contactPath({ type: "", reach: "", status: "", genre: "" }), /fits/, "the pick is never sent as a filter");
  const html = listPane(list, null, null, { id: "bunny-bunker", name: "Bunny Bunker" });
  for (const n of ["Ada", "Bit", "Cog"]) assert.ok(html.includes(`>${n}<`), n);
  assert.equal(html.match(/class="pill fit"/g).length, 1);
  assert.match(html, /class="pill fit" title="Fits Bunny Bunker: plays &lt;co-op&gt;">fits</);
  assert.doesNotMatch(listPane(list, null), /pill fit/, "no game, no mark");
});

test("arrow up and down move the selection through the list and the pane follows", async t => {
  const { nextContact, marketingKey } = await import("../web/marketingView.js");
  assert.equal(nextContact([5, 6, 7], 5, "ArrowDown"), 6);
  assert.equal(nextContact([5, 6, 7], 6, "ArrowUp"), 5);
  assert.equal(nextContact([5, 6, 7], 5, "ArrowUp"), 5);
  assert.equal(nextContact([5, 6, 7], 7, "ArrowDown"), 7);
  assert.equal(nextContact([5, 6, 7], null, "ArrowDown"), 5);
  assert.equal(nextContact([], 1, "ArrowDown"), null);

  const calls = [];
  globalThis.document = { querySelector: () => ({ focus() {}, innerHTML: "", style: { setProperty() {} }, classList: { toggle() {} }, setAttribute() {}, querySelectorAll: () => [] }), getElementById: () => ({}), documentElement: {}, querySelectorAll: () => [] };
  globalThis.fetch = async url => { calls.push(String(url)); return { ok: true, json: async () => (String(url).endsWith("/contacts/6") ? { id: 6, name: "Bit", types: [], fit: [], touches: [], channels: [], genres: [] } : []) }; };
  t.after(() => { delete globalThis.document; delete globalThis.fetch; });
  const { S } = await import("../web/state.js");
  S.view = "marketing"; S.mk.pane = "contacts"; S.mk.sel = 5;
  S.mk.contacts = [{ id: 5, due: false }, { id: 6, due: false }, { id: 7, due: true }];
  let prevented = 0;
  const key = (k, tag = "BUTTON") => marketingKey({ key: k, target: { tagName: tag }, preventDefault: () => prevented++ });
  assert.equal(key("ArrowDown", "INPUT"), false, "typing in a field keeps its own arrows");
  assert.equal(key("a"), false);
  assert.equal(key("ArrowDown"), true);
  assert.equal(String(S.mk.sel), "6", "the due contact 7 is first in the list, so below 5 comes 6");
  assert.equal(prevented, 1);
  await new Promise(r => setTimeout(r, 30));
  assert.ok(calls.includes("/api/contacts/6") && calls.includes("/api/contacts/6/history"), "the pane loads the new contact");
  assert.equal(S.mk.detail.name, "Bit");
});
