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
  assert.deepEqual(bunny, { game: "bunny-bunker", name: "Bunny Bunker", kind: "game", genres: ["co-op", "cozy"], platforms: ["Steam", "Switch"], stage: "demo", release: "2027-03-01", scale: [], needs: ["wishlists", "demo players"] });
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

/** The marketing setup plus a game project with its own Marketing/Profile.md. */
function withProject(profileText) {
  const m = marketing();
  const root = path.dirname(m.home);
  const game = path.join(root, "box");
  fs.mkdirSync(path.join(game, "Docs"), { recursive: true });
  if (profileText) { fs.mkdirSync(path.join(game, "Docs", "Marketing"), { recursive: true }); fs.writeFileSync(path.join(game, "Docs", "Marketing", "Profile.md"), profileText); }
  const settings = new SettingsFile(m.home);
  const s = settings.read();
  settings.write({ ...s, projects: [...s.projects, { id: "box-trainer", name: "Box Trainer", path: game, docs: "Docs" }] });
  return { ...m, game, settings };
}

test("a project's own Marketing/Profile.md is a profile named by the project id, beside the marketing project's", () => {
  const { settings } = withProject("# Box Trainer\n\nKind: game\nGenres: puzzle\nStage: demo\n");
  const shelf = new ProfileShelf(settings);
  assert.deepEqual(shelf.list().map(p => [p.game, p.kind]), [["box-trainer", "game"], ["bunny-bunker", "game"], ["good-box", "game"]]);
  assert.equal(shelf.list()[0].project, "box-trainer");
  assert.ok(shelf.has("box-trainer"));
});

test("Kind reads podcast, and anything else is a game", () => {
  const { settings } = withProject("# Hidden by Design\n\nKind: Podcast\n");
  assert.equal(new ProfileShelf(settings).list()[0].kind, "podcast");
});

test("doit profile add writes the template into the project's Marketing folder, once", async () => {
  const { home, game } = withProject(null);
  const { makeCli } = await import("../src/root.js");
  const out = []; const io = { write: x => out.push(x) };
  const cli = makeCli({ home, out: io, err: io });
  await cli.run(["profile", "add", "box-trainer", "--kind", "podcast"]);
  const text = fs.readFileSync(path.join(game, "Docs", "Marketing", "Profile.md"), "utf8");
  assert.match(text, /^# Box Trainer\n\nKind: podcast\n/);
  await cli.run(["profile", "add", "box-trainer"]);
  assert.match(out.join(""), /already has a profile/);
});

test("the project's kind wins over the file's Kind line, and a project with a kind but no file is listed as missing", () => {
  const { settings } = withProject("# Box Trainer\n\nKind: game\nGenres: puzzle\n");
  const s = settings.read();
  s.projects.find(p => p.id === "box-trainer").kind = "application";
  s.projects.find(p => p.id === "polyspice-marketing").kind = "podcast";
  settings.write(s);
  const list = new ProfileShelf(settings).list();
  assert.equal(list.find(p => p.game === "box-trainer").kind, "application");
  assert.deepEqual(list.find(p => p.game === "polyspice-marketing"), { game: "polyspice-marketing", name: "Polyspice Marketing", kind: "podcast", genres: [], platforms: [], stage: "", release: "", needs: [], scale: [], project: "polyspice-marketing", missing: true });
});

test("doit profile add takes the project's kind when none is given", async () => {
  const { home, game, settings } = withProject(null);
  const s = settings.read(); s.projects.find(p => p.id === "box-trainer").kind = "application"; settings.write(s);
  const { makeCli } = await import("../src/root.js");
  const io = { write() {} };
  await makeCli({ home, out: io, err: io }).run(["profile", "add", "box-trainer"]);
  assert.match(fs.readFileSync(path.join(game, "Docs", "Marketing", "Profile.md"), "utf8"), /Kind: application/);
});
