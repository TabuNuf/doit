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
  for (const tab of ["contacts", "drafts", "festivals"]) assert.match(bar, new RegExp(`data-mk-pane="${tab}"`));
  assert.match(bar, /data-mk-pane="festivals" aria-pressed="true"/);
  assert.match(bar, />Contacts<.*>Drafts<.*>Festivals</s);
  assert.doesNotMatch(bar, /data-p=|data-projmenu|All projects|Projects/);

  for (const view of ["board", "docs", "claude"]) {
    S.view = view;
    try { render(); } catch { /* the view's own panes need data the stand-in lacks */ }
    const html = els.get("#projects").innerHTML;
    assert.match(html, /All projects/, view);
    assert.match(html, /data-p="doit"/, view);
    assert.match(html, /data-projmenu/, view);
    assert.doesNotMatch(html, /data-mk-pane/, view);
  }
});
