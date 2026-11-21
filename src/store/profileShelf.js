// ProfileShelf: the game profiles. A project's own `<docs>/Marketing/Profile.md` (the game is the
// project id), and `Docs/Profiles/*.md` in the marketing project (settings key `marketingProject`)
// for games without a project (the game is the file name without `.md`). A project's own wins, and
// its kind is the project's kind; a project with a kind but no file is listed with `missing: true`.

import fs from "node:fs";
import path from "node:path";
import { ContactError } from "../domain/contacts.js";

const DEFAULT_PROJECT = "polyspice-marketing";
const STAGES = ["in development", "demo", "released"];
const KINDS = ["game", "application", "podcast"];
const OWN = path.join("Marketing", "Profile.md");
const list = v => String(v ?? "").split(",").map(s => s.trim()).filter(Boolean);

/** A profile from its text: `# Name`, then `Key: value` lines. Unknown keys are ignored. */
export function parseProfile(game, text) {
  const out = { game, name: game, kind: "game", genres: [], platforms: [], stage: "", release: "", needs: [] };
  for (const line of text.split("\n")) {
    const h = line.match(/^#\s+(.+?)\s*$/);
    if (h && out.name === game) { out.name = h[1]; continue; }
    const m = line.match(/^(Genres|Platforms|Stage|Release|Needs|Kind):\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "kind") out.kind = KINDS.includes(m[2].toLowerCase()) ? m[2].toLowerCase() : "game";
    else if (key === "stage" || key === "release") out[key] = m[2];
    else out[key] = list(m[2]);
  }
  return out;
}

export function profileTemplate(name, kind = "game") {
  return `# ${name}\n\nKind: ${kind}\nGenres: \nPlatforms: \nStage: in development\nRelease: \nNeeds: \n`;
}

export class ProfileShelf {
  constructor(settingsFile) { this.settingsFile = settingsFile; }

  list() {
    const byGame = new Map();
    const dir = this.#dir(false);
    if (dir && fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith(".")))
        byGame.set(f.slice(0, -3), parseProfile(f.slice(0, -3), fs.readFileSync(path.join(dir, f), "utf8")));
    }
    for (const p of this.settingsFile.read().projects) {
      const file = path.join(p.path, p.docs, OWN);
      if (fs.existsSync(file)) {
        const own = parseProfile(p.id, fs.readFileSync(file, "utf8"));
        byGame.set(p.id, { ...own, kind: p.kind || own.kind, project: p.id });
      } else if (p.kind) byGame.set(p.id, { ...parseProfile(p.id, `# ${p.name}\n`), kind: p.kind, project: p.id, missing: true });
    }
    return [...byGame.values()].sort((a, b) => a.game.localeCompare(b.game));
  }

  has(game) {
    return this.list().some(p => p.game === game);
  }

  /** Writes the template into a registered project's `<docs>/Marketing/Profile.md`; the game is the project id. */
  createFor(projectId, kind) {
    const p = this.settingsFile.read().projects.find(x => x.id === projectId);
    if (!p) throw new ContactError(`No project ${projectId}`);
    kind = kind || p.kind || "game";
    if (!KINDS.includes(kind)) throw new ContactError(`Kind must be ${KINDS.join(", ")}: ${kind}`);
    const file = path.join(p.path, p.docs, OWN);
    if (fs.existsSync(file)) throw new ContactError(`${projectId} already has a profile: ${file}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, profileTemplate(p.name, kind));
    return { ...parseProfile(p.id, fs.readFileSync(file, "utf8")), project: p.id, file };
  }

  /** Writes the template for a new profile; `game` is the file name, `name` the title (default: the file name). */
  create(game, name = game) {
    if (!/^[\w][\w .-]*$/.test(game) || game.includes("..")) throw new ContactError(`Not a usable profile name: ${game}`);
    const dir = this.#dir(true);
    const file = path.join(dir, game + ".md");
    if (fs.existsSync(file)) throw new ContactError(`Profile ${game} already exists`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, profileTemplate(name));
    return parseProfile(game, fs.readFileSync(file, "utf8"));
  }

  /** The Profiles folder of the marketing project; null when that project is not registered (or throws when `must`). */
  #dir(must) {
    const settings = this.settingsFile.read();
    const id = settings.marketingProject || DEFAULT_PROJECT;
    const p = settings.projects.find(x => x.id === id);
    if (!p) {
      if (must) throw new ContactError(`No project ${id} for profiles; register it or set marketingProject`);
      return null;
    }
    return path.join(p.path, p.docs, "Profiles");
  }
}

export { STAGES, KINDS };
