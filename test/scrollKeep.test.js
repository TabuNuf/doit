// Development: a redraw keeps each pane's scroll, unless the pane now shows another document or task.
import test from "node:test";
import assert from "node:assert/strict";
import { keepScroll, scrollKey } from "../web/scrollKeep.js";

// A pane body with just what keepScroll touches.
const body = (scroll, title, top = 0) => ({
  dataset: scroll ? { scroll } : {},
  scrollTop: top, scrollLeft: 0,
  closest: () => ({ getAttribute: () => title, querySelector: () => null }),
});
const root = bodies => ({ bodies, querySelectorAll() { return this.bodies; } });

test("a redraw of the same document puts its scroll back", () => {
  const r = root([body(null, "Left", 40), body("doc:doit/Design.md", "Document", 1800)]);
  const restore = keepScroll(r);
  r.bodies = [body(null, "Left"), body("doc:doit/Design.md", "Document")];
  restore();
  assert.deepEqual(r.bodies.map(b => b.scrollTop), [40, 1800]);
});

test("another document opens at the top", () => {
  const r = root([body("doc:doit/Design.md", "Document", 1800)]);
  const restore = keepScroll(r);
  r.bodies = [body("doc:doit/Brief.md", "Document")];
  restore();
  assert.equal(r.bodies[0].scrollTop, 0);
});

test("a pane without a key is matched by its place and title", () => {
  assert.equal(scrollKey(body(null, "Linked"), 2), "2:Linked");
  assert.equal(scrollKey(body("task:doit/T-028.1", "x"), 2), "task:doit/T-028.1");
});
