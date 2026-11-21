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
