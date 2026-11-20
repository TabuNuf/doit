import test from "node:test";
import assert from "node:assert/strict";
import { parseEpic, replaceLine, appendLine, setClosed, setArchived, parseTaskFile, formatTaskFile, epicTemplate } from "../src/store/markdown.js";
import { LOBBY } from "./helpers.js";

test("parses an epic file", () => {
  const e = parseEpic(LOBBY);
  assert.equal(e.id, "EPIC-014");
  assert.equal(e.status, "Active");
  assert.equal(e.lines.length, 3);
  assert.deepEqual(e.lines[0], { id: "T-014.1", n: 1, title: "Create and join lobby by code", doneWhen: "two clients join", ticked: true });
  assert.equal(e.lines[2].doneWhen, "");
});

test("replacing a line keeps every other byte", () => {
  const out = replaceLine(LOBBY, { id: "T-014.2", ticked: true, title: "Host migration", doneWhen: "second player becomes host" });
  assert.equal(out, LOBBY.replace("- [ ] T-014.2", "- [x] T-014.2"));
});

test("appends after the last task, or into an empty section", () => {
  const out = appendLine(LOBBY, { id: "T-014.4", ticked: false, title: "Lobby browser", doneWhen: "" });
  assert.match(out, /- \[ \] T-014.3 Show ping\n- \[ \] T-014.4 Lobby browser\n\n## Test plan/);
  const empty = appendLine(epicTemplate("EPIC-002", "New", "Planned"), { id: "T-002.1", ticked: false, title: "First", doneWhen: "" });
  assert.match(empty, /## Tasks\n\n- \[ \] T-002.1 First\n\n## Test plan/);
});

test("task file round trip", () => {
  const task = {
    id: "T-014.2", title: "Host migration", state: "progress", owner: "ai", type: "task", rank: 14002,
    deadline: "2026-11-22", created: "2026-11-12 09:14", updated: "2026-11-20 08:52", completed: null, source: null, archived: null,
    description: "When the host quits,\nthe next player becomes host.",
    comments: [{ at: "2026-11-19 21:10", who: "human", text: "Keep chat history." }, { at: "2026-11-20 08:52", who: "ai", text: "Done.\n\nTwo lines." }],
  };
  const back = parseTaskFile(formatTaskFile(task));
  for (const k of ["state", "owner", "type", "rank", "deadline", "created", "updated", "description"]) assert.deepEqual(back[k], task[k], k);
  assert.deepEqual(back.comments, task.comments);
  assert.equal(back.completed, undefined);
});

test("Closed and Archived lines are written under Status, read back and removed", () => {
  const text = setArchived(setClosed(LOBBY, "2026-11-20"), "2026-11-21");
  assert.match(text, /^Status: Active\nClosed: 2026-11-20\nArchived: 2026-11-21\n/m);
  const e = parseEpic(text);
  assert.deepEqual([e.closed, e.archivedOn], ["2026-11-20", "2026-11-21"]);
  assert.equal(setArchived(setClosed(text, null), null), LOBBY);
  assert.equal(parseEpic(LOBBY).archivedOn, null);
});
