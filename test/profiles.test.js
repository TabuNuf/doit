import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeContacts } from "../src/root.js";
import { SettingsFile } from "../src/store/settings.js";
import { ProfileShelf } from "../src/store/profileShelf.js";

function marketing(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doit-profiles-"));
  const home = path.join(root, "home");
  const proj = path.join(root, "marketing");
  const dir = path.join(proj, "Docs", "Profiles");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "bunny-bunker.md"), "# Bunny Bunker\n\nGenres: co-op, cozy\nPlatforms: Steam, Switch\nStage: demo\nRelease: 2027-03-01\nNeeds: wishlists, demo players\n");
  fs.writeFileSync(path.join(dir, "good-box.md"), "# Good Box\n\nGenres: puzzle\nStage: released\n");
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a profile");
  new SettingsFile(home).write({ projects: [{ id: "polyspice-marketing", name: "Polyspice Marketing", path: proj, docs: "Docs" }], ...extra });
  return { home, dir };
}

test("reads two profiles", () => {
  const { home } = marketing();
  const shelf = new ProfileShelf(new SettingsFile(home));
  const [bunny, box] = shelf.list();
  assert.deepEqual(bunny, { game: "bunny-bunker", name: "Bunny Bunker", genres: ["co-op", "cozy"], platforms: ["Steam", "Switch"], stage: "demo", release: "2027-03-01", needs: ["wishlists", "demo players"] });
  assert.equal(box.game, "good-box");
  assert.equal(box.stage, "released");
  assert.deepEqual(box.needs, []);
  assert.ok(shelf.has("good-box"));
  assert.ok(!shelf.has("notes") && !shelf.has("../x"));
});

test("a fit to a game with no profile is refused, one with a profile is kept", () => {
  const { home } = marketing();
  const book = makeContacts({ home, now: () => new Date("2026-11-21T09:00:00") });
  book.add({ name: "Ada", types: ["influencer"] });
  assert.throws(() => book.setFit(1, "no-such-game", "why"), /No profile/);
  assert.deepEqual(book.setFit(1, "bunny-bunker", "plays co-op").fit, [{ game: "bunny-bunker", reason: "plays co-op" }]);
  assert.deepEqual(book.profiles().map(p => p.game), ["bunny-bunker", "good-box"]);
  book.source.close();
});

test("creating a profile writes the template, once", () => {
  const { home, dir } = marketing();
  const shelf = new ProfileShelf(new SettingsFile(home));
  const p = shelf.create("rapid-rocket", "Rapid Rocket Racing");
  assert.equal(p.name, "Rapid Rocket Racing");
  assert.equal(p.stage, "in development");
  assert.match(fs.readFileSync(path.join(dir, "rapid-rocket.md"), "utf8"), /^# Rapid Rocket Racing\n/);
  assert.throws(() => shelf.create("rapid-rocket"), /already exists/);
  assert.throws(() => shelf.create("../evil"), /Not a usable/);
});

test("the marketing project is a setting; without it no profiles exist", () => {
  const { home } = marketing({ marketingProject: "other" });
  const shelf = new ProfileShelf(new SettingsFile(home));
  assert.deepEqual(shelf.list(), []);
  assert.ok(!shelf.has("good-box"));
  assert.throws(() => shelf.create("x"), /No project other/);
});
