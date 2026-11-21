// The Marketing view's tabs in the top bar, and the projects the other views keep.
import test from "node:test";
import assert from "node:assert/strict";

/** A page stand-in: each selector gets one element whose innerHTML render() fills. */
function fakePage() {
  const els = new Map();
  const el = sel => { if (!els.has(sel)) els.set(sel, { innerHTML: "", style: { setProperty() {} }, querySelectorAll: () => [], classList: { toggle() {} }, setAttribute() {} }); return els.get(sel); };
  globalThis.document = { querySelector: el, getElementById: id => el("#" + id), documentElement: el("html"), querySelectorAll: () => [] };
  return els;
}

test("the Marketing view shows its tabs where the other views show the projects", async t => {
  const els = fakePage();
  t.after(() => { delete globalThis.document; });
  const { S } = await import("../web/state.js");
  const { render } = await import("../web/render.js");
  S.data = { projects: [{ id: "doit", name: "Doit", starred: true }], epics: [], tasks: [] };

  S.view = "marketing"; S.mk.pane = "festivals";
  render();
  const bar = els.get("#projects").innerHTML;
  assert.match(bar, /data-mk-pane="festivals" aria-pressed="true"/);
  assert.match(bar, /^<button[^>]*>Campaigns<.*>Contacts<.*>Festivals<.*>Events<.*>Drafts<.*>Overview</s, "only the tabs, in order");
  assert.doesNotMatch(bar, /data-p=|data-projmenu|All projects|Projects|<select/);

  for (const view of ["board", "claude"]) {
    S.view = view;
    try { render(); } catch { /* the view's own panes need data the stand-in lacks */ }
    const html = els.get("#projects").innerHTML;
    assert.match(html, /All projects/, view);
    assert.match(html, /data-p="doit"/, view);
    assert.match(html, /data-projmenu/, view);
    assert.doesNotMatch(html, /data-mk-pane/, view);
  }
});

test("the Projects menu rows have no kind select; kind is set in the project's settings", async t => {
  const els = fakePage();
  t.after(() => { delete globalThis.document; });
  const { S } = await import("../web/state.js");
  const { render } = await import("../web/render.js");
  S.data = { projects: [{ id: "doit", name: "Doit", kind: "application" }, { id: "bb", name: "Bunny Bunker" }], epics: [], tasks: [] };
  S.view = "board"; S.projOpen = true;
  try { render(); } catch { /* the board panes need more than the stand-in has */ }
  const bar = els.get("#projects").innerHTML;
  assert.match(bar, /class="projrow"/);
  assert.doesNotMatch(bar, /<select|data-kind-of/);
  S.projOpen = false;
});
