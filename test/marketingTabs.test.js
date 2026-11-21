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
  assert.match(bar, /^<select id="mk-pick"[^>]*aria-label="Game or podcast".*>Campaigns<.*>Contacts<.*>Festivals<.*>Events<.*>Drafts<.*>Overview</s, "the picker first, then the tabs in order");
  assert.doesNotMatch(bar, /data-p=|data-projmenu|All projects|Projects/);
  S.mk.profiles = [{ game: "box-trainer", name: "Box Trainer", kind: "game" }, { game: "hbd", name: "Hidden by Design", kind: "podcast" }];
  S.mk.game = "hbd"; S.mk.pane = "campaigns";
  render();
  assert.match(els.get("#projects").innerHTML, /<optgroup label="Games"><option value="box-trainer" >Box Trainer<\/option><\/optgroup><optgroup label="Podcasts"><option value="hbd" selected>Hidden by Design/);
  S.mk.profiles = []; S.mk.game = "";

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

test("the Projects menu has a kind select on each row with the project's kind chosen", async t => {
  const els = fakePage();
  t.after(() => { delete globalThis.document; });
  const { S } = await import("../web/state.js");
  const { render, kindSelect } = await import("../web/render.js");
  S.data = { projects: [{ id: "doit", name: "Doit", kind: "application" }, { id: "bb", name: "Bunny Bunker" }], epics: [], tasks: [] };
  S.view = "board"; S.projOpen = true;
  try { render(); } catch { /* the board panes need more than the stand-in has */ }
  const bar = els.get("#projects").innerHTML;
  assert.match(bar, /data-kind-of="doit"[^>]*>.*<option value="application" selected>application/s);
  assert.match(kindSelect({ id: "bb", name: "Bunny Bunker" }), /<option value="" selected>no kind/);
  S.projOpen = false;
});
