// The Claude view says why a task is listed and what to do; the badge tooltip names the due tasks.
import test from "node:test";
import assert from "node:assert/strict";
import { actionOf } from "../src/domain/claude.js";

const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

test("the action is the done-when, else the first line of the description", () => {
  assert.equal(actionOf({ doneWhen: " a mail sent ", description: "x" }), "a mail sent");
  assert.equal(actionOf({ doneWhen: "", description: "\n  Call the venue\nthen more" }), "Call the venue");
  assert.equal(actionOf({ doneWhen: "", description: "" }), "");
});

test("each Waiting-on-you card says why it is listed and what to do", async () => {
  const { S } = await import("../web/state.js");
  const { claudePanes, whyListed } = await import("../web/claudeView.js");
  const card = (id, extra) => ({ project: "game", id, title: `Title ${id}`, blocks: null, deadline: null, action: "", last: { at: "", what: "" }, ...extra });
  S.data = { projects: [{ id: "game", name: "Game" }], tasks: [], epics: [] };
  S.claude = { working: [], upNext: [card("T-9.9", { action: "ignored here" })], log: [],
    blocked: [card("T-1.1", { blocks: "T-1.2", action: "sign the form" })],
    due: [card("T-2.1", { deadline: day(3), action: "pay the invoice" }), card("T-2.2", { deadline: day(1) }), card("T-2.3", { deadline: day(0) })] };
  const html = claudePanes();
  assert.match(html, /<b>Why:<\/b> blocks T-1\.2/);
  assert.match(html, /<b>To do:<\/b> sign the form/);
  assert.match(html, /<b>Why:<\/b> due in 3 days/);
  assert.match(html, /<b>To do:<\/b> pay the invoice/);
  assert.match(html, /<b>Why:<\/b> due in 1 day</);
  assert.match(html, /<b>Why:<\/b> due today/);
  assert.equal(html.split("<b>Why:</b>").length - 1, 4, "only Waiting-on-you cards carry it");
  assert.equal(html.split("<b>To do:</b>").length - 1, 2, "no line when there is nothing to say");
  assert.equal(whyListed(card("x", { deadline: day(-2) }), "due"), "overdue by 2 days");
});

test("the Claude badge tooltip names each due task with number, title and deadline", async t => {
  const els = new Map();
  const el = sel => { if (!els.has(sel)) els.set(sel, { innerHTML: "", style: { setProperty() {} }, querySelectorAll: () => [], classList: { toggle() {} }, setAttribute() {} }); return els.get(sel); };
  globalThis.document = { querySelector: el, getElementById: id => el("#" + id), documentElement: el("html"), querySelectorAll: () => [] };
  t.after(() => { delete globalThis.document; });
  const { S } = await import("../web/state.js");
  const { render } = await import("../web/render.js");
  const t1 = (id, title, deadline) => ({ project: "game", id, epic: "EPIC-1", owner: "human", state: "todo", deadline, type: "task", title, description: "", comments: [] });
  S.data = { projects: [{ id: "game", name: "Game" }], epics: [], tasks: [t1("T-2.2", "Pay <the> invoice", day(5)), t1("T-2.1", "Sign", day(1))] };
  S.view = "board";
  render();
  const top = els.get("#views").innerHTML;
  const tip = top.match(/class="badge" title="([^"]*)"/)[1];
  assert.match(tip, /T-2\.1 Sign \(due [^)]+\)\nT-2\.2 Pay &lt;the&gt; invoice \(due [^)]+\)/, "soonest first, escaped");
  assert.match(tip, /^2 of your tasks are due within 7 days/);
  assert.match(top, />2 due</);
});
