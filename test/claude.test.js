// The Claude view: each pane lists the right tasks from task data and the activity log.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { ClaudeView } from "../src/domain/claude.js";
import { HttpServer } from "../src/server/server.js";
import { makeActivity, makeBoard } from "../src/root.js";
import { setup } from "./helpers.js";

/** Fixtures: T-014.2 In progress (AI), T-014.3 and T-009.1 To-do (AI), two human tasks, one blocking. */
function fixtures(s) {
  const b = s.board;
  b.update("game/T-014.2", { state: "progress" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Pick the relay region", owner: "human" });
  b.update("game/T-014.4", { blocks: "T-014.3" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Play the build", owner: "human" });
  b.addTask({ project: "game", epic: "EPIC-014", title: "Old idea", owner: "human", state: "backlog" });
  b.update("game/T-014.6", { blocks: "T-014.2" });
  return new ClaudeView(b, makeActivity({ home: s.home, now: () => s.clock.t }));
}

test("each pane lists the right tasks, in rank order", t => {
  const s = setup(); t.after(s.cleanup);
  const view = fixtures(s).panes("game");
  assert.deepEqual(view.working.map(c => c.id), ["T-014.2"]);
  assert.deepEqual(view.blocked.map(c => [c.id, c.blocks]), [["T-014.4", "T-014.3"]], "a backlog task or one without blocks does not wait on you");
  assert.deepEqual(view.upNext.map(c => c.id), ["T-009.1", "T-014.3"]);
  assert.equal(view.log[0].ref, "game/T-014.6", "the log is newest first");
});

test("a card carries its project and its last logged change", t => {
  const s = setup(); t.after(s.cleanup);
  const view = fixtures(s).panes("all");
  const c = view.blocked[0];
  assert.equal(c.project, "game");
  assert.equal(c.title, "Pick the relay region");
  assert.deepEqual(c.last, { at: "2026-11-20 09:00", what: "blocks T-014.3" });
  assert.deepEqual(view.upNext[0].last, { at: null, what: "" }, "a task never changed has no last change");
});

test("GET /api/claude serves the panes for a project", async t => {
  const s = setup(); t.after(s.cleanup);
  const log = makeActivity({ home: s.home, now: () => s.clock.t });
  const board = makeBoard({ home: s.home, now: () => s.clock.t, log });
  const claude = fixtures({ ...s, board });
  const server = new HttpServer(board, path.join(import.meta.dirname, "..", "web"), null, null, claude);
  const port = await server.listen(0);
  t.after(() => server.close());
  const body = await fetch(`http://127.0.0.1:${port}/api/claude?project=game`).then(r => r.json());
  assert.deepEqual(body.working.map(c => c.id), ["T-014.2"]);
  assert.equal(body.blocked.length, 1);
  assert.ok(body.log.length >= 4);
});

test("clicking a card opens its task on the Board, in its project", async () => {
  const fake = { textContent: "", hidden: true, innerHTML: "" };
  globalThis.document = { querySelector: () => fake };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ projects: [{ id: "game" }, { id: "other" }], tasks: [] }) });
  try {
    const { S } = await import("../web/state.js");
    const { claudeClick } = await import("../web/claudeView.js");
    Object.assign(S, { view: "claude", project: "other", sel: null, tab: "done", epic: "other/EPIC-001" });
    assert.equal(claudeClick({ goto: "game/T-014.3" }), true);
    assert.equal(S.view, "board");
    assert.equal(S.sel, "game/T-014.3");
    assert.equal(S.project, "game");
    assert.equal(S.tab, "open");
    assert.equal(S.epic, null);
    assert.equal(claudeClick({}), false, "other clicks are left alone");
  } finally { delete globalThis.document; delete globalThis.fetch; }
});
