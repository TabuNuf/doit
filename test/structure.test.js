// Keeps the Board small and the move logic in its own class.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Board } from "../src/domain/board.js";
import { TaskMover } from "../src/domain/mover.js";

const domain = path.join(import.meta.dirname, "..", "src", "domain");

test("board.js stays under 250 lines", () => {
  const lines = fs.readFileSync(path.join(domain, "board.js"), "utf8").split("\n").length;
  assert.ok(lines < 250, `board.js is ${lines} lines`);
});

test("the move logic is its own class, composed by Board", () => {
  const board = new Board({});
  assert.ok(board.mover instanceof TaskMover);
  assert.doesNotMatch(fs.readFileSync(path.join(domain, "board.js"), "utf8"), /rankBetween/);
});
