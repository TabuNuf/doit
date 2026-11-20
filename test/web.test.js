// The page's files stay small and leave ranking to the server.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const WEB = path.join(import.meta.dirname, "..", "web");
const files = fs.readdirSync(WEB).filter(f => f.endsWith(".js"));

test("no web file is over 300 lines", () => {
  for (const f of files) {
    const lines = fs.readFileSync(path.join(WEB, f), "utf8").split("\n").length;
    assert.ok(lines <= 300, `${f} has ${lines} lines`);
  }
});

test("the page does no rank arithmetic", () => {
  for (const f of files) {
    const text = fs.readFileSync(path.join(WEB, f), "utf8");
    assert.doesNotMatch(text, /\brank\s*[-+*/]|[-+*/]\s*\w*\.?rank\b|between\s*\(/i, `${f} computes ranks`);
  }
});

test("the markdown renderer shows headings, lists and checkboxes, and escapes text", async () => {
  const { renderMarkdown } = await import("../web/markdown.js");
  const html = renderMarkdown("# EPIC-1: A <b>\n\nGoal: **fast** `x`\n\n## Tasks\n\n- [x] T-1.1 Done (done when: ok)\n- [ ] T-1.2 Open\n\n1. one\n2. two\n\n```\n<script>\n```");
  assert.match(html, /<h1>EPIC-1: A &lt;b&gt;<\/h1>/);
  assert.match(html, /<strong>fast<\/strong> <code>x<\/code>/);
  assert.match(html, /<h2>Tasks<\/h2>/);
  assert.match(html, /<li class="check"><input type="checkbox" disabled checked[^>]*> T-1.1 Done/);
  assert.match(html, /<li class="check"><input type="checkbox" disabled  [^>]*> T-1.2 Open/);
  assert.match(html, /<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(html, /<pre>&lt;script&gt;<\/pre>/);
  assert.doesNotMatch(html, /<script>|<b>/);
});

test("single newlines inside a paragraph become line breaks", async () => {
  const { renderMarkdown } = await import("../web/markdown.js");
  assert.equal(renderMarkdown("Status: Active\nGoal: x\n\nNext"), "<p>Status: Active<br>Goal: x</p>\n<p>Next</p>");
});
