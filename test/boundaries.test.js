// Fails when a module imports a tier it may not (Docs/Architecture.md, Layers).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const ALLOWED = {
  domain: { tiers: ["domain"], node: [] },
  store: { tiers: ["domain", "store"], node: ["node:fs", "node:path", "node:os"] },
  cli: { tiers: ["domain", "cli"], node: [] },
  server: { tiers: ["domain", "server"], node: ["node:http", "node:fs", "node:path"] },
};

export function violations(files) {
  const out = [];
  for (const [file, text] of files) {
    const tier = file.split("/")[1];
    const rule = ALLOWED[tier];
    if (!rule) continue;
    for (const m of text.matchAll(/^\s*import\s[^"']*["']([^"']+)["']/gm)) {
      const spec = m[1];
      if (spec.startsWith("node:")) { if (!rule.node.includes(spec)) out.push(`${file} imports ${spec}`); continue; }
      if (!spec.startsWith(".")) { out.push(`${file} imports package ${spec}`); continue; }
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)).split("/")[1];
      if (!rule.tiers.includes(target)) out.push(`${file} imports ${spec} (${target})`);
    }
  }
  return out;
}

function sources() {
  const files = [];
  const walk = dir => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".js")) files.push([rel, fs.readFileSync(path.join(ROOT, rel), "utf8")]);
    }
  };
  walk("src");
  return files;
}

test("no module imports a tier it may not", () => {
  assert.deepEqual(violations(sources()), []);
});

test("the guard catches a forbidden import", () => {
  const bad = [["src/cli/cli.js", 'import { FileSource } from "../store/source.js";\n'], ["src/domain/x.js", 'import fs from "node:fs";\n']];
  assert.equal(violations(bad).length, 2);
});
