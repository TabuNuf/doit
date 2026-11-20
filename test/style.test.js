// Every colour in the stylesheet comes from a token: literals live only in the :root blocks.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CSS = path.join(import.meta.dirname, "..", "web", "style.css");
const NAMED = ["white", "black", "red", "green", "blue", "gray", "grey", "silver", "orange", "yellow", "purple",
  "pink", "brown", "navy", "teal", "maroon", "olive", "lime", "aqua", "cyan", "magenta", "gold", "coral", "crimson",
  "indigo", "violet", "tan", "salmon", "khaki", "ivory", "beige", "lavender", "tomato", "orchid", "plum"];

// The stylesheet without comments and without the token rules (every :root rule, also inside @media).
export function withoutTokens(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:root[^{}]*\{[^{}]*\}/g, "");
}

export function colourLiterals(css) {
  const found = [];
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g)) found.push(m[0]);
  const named = new RegExp(`(?<![\\w.#-])(?:${NAMED.join("|")})(?![\\w-])`, "gi");
  for (const m of css.matchAll(named)) found.push(m[0]);
  return found;
}

test("style.css has no literal colour outside its token blocks", () => {
  const rest = withoutTokens(fs.readFileSync(CSS, "utf8"));
  assert.deepEqual(colourLiterals(rest), []);
});

test("the literal-colour check catches a planted literal", () => {
  const planted = ".x { color: #fff; background: rgba(0,0,0,.1); border-color: white; }";
  assert.equal(colourLiterals(planted).length, 3);
  assert.deepEqual(colourLiterals(".x { color: var(--ink); background: transparent; fill: currentColor; }"), []);
});

test("project colours are tokens, each defined for light and dark", () => {
  const css = fs.readFileSync(CSS, "utf8");
  const state = fs.readFileSync(path.join(import.meta.dirname, "..", "web", "state.js"), "utf8");
  const colors = JSON.parse(/export const COLORS = (\[[^\]]*\])/.exec(state)[1]);
  const roots = [...css.matchAll(/:root[^{}]*\{[^{}]*\}/g)].map(m => m[0]);
  assert.equal(roots.length, 3, "one light and two dark :root blocks");
  for (const c of colors) {
    const token = /^var\((--p\d+)\)$/.exec(c);
    assert.ok(token, `${c} is not a project colour token`);
    for (const root of roots) assert.match(root, new RegExp(`${token[1]}:`), `${token[1]} missing in ${root.slice(0, 40)}`);
  }
});
