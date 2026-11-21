// ProfileShelf: the game profiles, `Docs/Profiles/*.md` in the marketing project (settings key
// `marketingProject`). A game is a profile's file name without `.md`.

import fs from "node:fs";
import path from "node:path";
import { ContactError } from "../domain/contacts.js";

const DEFAULT_PROJECT = "polyspice-marketing";
const STAGES = ["in development", "demo", "released"];
const list = v => String(v ?? "").split(",").map(s => s.trim()).filter(Boolean);

/** A profile from its text: `# Name`, then `Key: value` lines. Unknown keys are ignored. */
export function parseProfile(game, text) {
  const out = { game, name: game, genres: [], platforms: [], stage: "", release: "", needs: [] };
  for (const line of text.split("\n")) {
    const h = line.match(/^#\s+(.+?)\s*$/);
    if (h && out.name === game) { out.name = h[1]; continue; }
    const m = line.match(/^(Genres|Platforms|Stage|Release|Needs):\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "stage" || key === "release") out[key] = m[2];
    else out[key] = list(m[2]);
  }
  return out;
}

export function profileTemplate(name) {
  return `# ${name}\n\nGenres: \nPlatforms: \nStage: in development\nRelease: \nNeeds: \n`;
}

export class ProfileShelf {
  constructor(settingsFile) { this.settingsFile = settingsFile; }

  list() {
    const dir = this.#dir(false);
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith(".md") && !f.startsWith("."))
      .map(f => parseProfile(f.slice(0, -3), fs.readFileSync(path.join(dir, f), "utf8")))
      .sort((a, b) => a.game.localeCompare(b.game));
  }

  has(game) {
    if (!/^[\w][\w .-]*$/.test(game) || game.includes("..")) return false;
    const dir = this.#dir(false);
    return Boolean(dir) && fs.existsSync(path.join(dir, game + ".md"));
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

export { STAGES };
