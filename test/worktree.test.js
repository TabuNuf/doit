// An active epic with a worktree on its branch gets its task writes there, so the main
// checkout stays clean and the branch merges without conflict (Design.md, Epics).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { setup } from "./helpers.js";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function repoWithWorktree(t) {
  const s = setup(); t.after(s.cleanup);
  git(s.game, "init", "-q", "-b", "main");
  git(s.game, "-c", "user.name=t", "-c", "user.email=t@t", "add", ".");
  git(s.game, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "start");
  const wt = path.join(s.root, "game-wt", "014-online-lobby");
  git(s.game, "worktree", "add", "-q", wt, "-b", "epic/014-online-lobby");
  const wtRead = rel => fs.readFileSync(path.join(wt, "GameDocs", rel), "utf8");
  return { ...s, wt, wtRead };
}

test("writes for an epic with a worktree go to the worktree and leave main clean", t => {
  const s = repoWithWorktree(t);
  s.board.update("game/T-014.2", { state: "done" });
  s.board.addTask({ project: "game", epic: "EPIC-014", title: "Lobby browser" });
  s.board.update("game/T-009.1", { state: "progress" });

  assert.match(s.wtRead("Epics/EPIC-014-online-lobby.md"), /- \[x\] T-014.2 Host migration/);
  assert.match(s.wtRead("Epics/EPIC-014-online-lobby.md"), /T-014.4 Lobby browser/);
  assert.ok(fs.existsSync(path.join(s.wt, "GameDocs/Epics/Tasks/T-014.2.md")));
  assert.equal(git(s.game, "status", "--porcelain", "--", "GameDocs/Epics/EPIC-014-online-lobby.md", "GameDocs/Epics/Tasks/T-014.2.md"), "");
  assert.ok(s.exists("Epics/Tasks/T-009.1.md"), "an epic without a worktree is written in main");

  const tasks = s.board.list({ project: "game", epic: "EPIC-014", state: "done" });
  assert.deepEqual(tasks.map(x => x.id), ["T-014.2"]);
  assert.equal(s.board.get("game/T-014.4").title, "Lobby browser");
  assert.match(s.board.epicDocument("game", "EPIC-014").text, /- \[x\] T-014.2/);
});

test("the epic branch merges into main without conflict after CLI writes", t => {
  const s = repoWithWorktree(t);
  s.board.update("game/T-014.2", { state: "done" });
  const id = ["-c", "user.name=t", "-c", "user.email=t@t"];
  git(s.wt, ...id, "add", ".");
  git(s.wt, ...id, "commit", "-q", "-m", "tick");
  git(s.game, ...id, "merge", "-q", "--no-ff", "-m", "merge", "epic/014-online-lobby");
  assert.match(s.read("Epics/EPIC-014-online-lobby.md"), /- \[x\] T-014.2/);
  git(s.game, "worktree", "remove", s.wt);
  assert.equal(s.board.get("game/T-014.2").state, "done", "reads return to main once the worktree is gone");
});

test("an epic closed in its worktree shows as closed before the merge", t => {
  const s = repoWithWorktree(t);
  s.board.closeEpic("game", "EPIC-014");
  const view = s.board.view({ project: "game" });
  assert.ok(!view.epics.some(e => e.id === "EPIC-014"), "not in the open list");
  const closed = view.closedEpics.find(e => e.id === "EPIC-014");
  assert.ok(closed && closed.closed && !closed.archived, "listed under Closed with its date");
  assert.throws(() => s.board.closeEpic("game", "EPIC-014"), /No open epic/);
});
