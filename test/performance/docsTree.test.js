// The docs tree of a 500-file folder stays fast. Run with `npm run test:performance`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DocsFiles } from "../../src/store/docsFolder.js";
import { SettingsFile } from "../../src/store/settings.js";

test("tree() of 500 documents in nested folders takes under 200 ms", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "doit-perf-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (let i = 0; i < 500; i++) {
    const dir = path.join(root, "proj", "Docs", `area-${i % 10}`, `topic-${i % 7}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `doc-${i}.md`), `# Doc ${i}\n`);
  }
  const settings = new SettingsFile(path.join(root, "home"));
  settings.write({ projects: [{ id: "p", name: "P", path: path.join(root, "proj"), docs: "Docs" }] });
  const files = new DocsFiles(settings);
  const start = performance.now();
  const tree = files.tree("p");
  const ms = performance.now() - start;
  assert.equal(tree.length, 10);
  assert.ok(ms < 200, `tree() took ${ms.toFixed(0)} ms`);
});
