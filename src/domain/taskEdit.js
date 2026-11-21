// taskEdit: applies a change set (field to value) to a task, refusing a bad value. Pure; Board.update writes the result.

import { STATES, OWNERS, TYPES, check, checkContact, oneLine } from "./task.js";

/** `now` is the stamp the state change records as completed. Throws on an unknown field or a refused value. */
export function applyChanges(task, changes, now) {
  for (const [key, value] of Object.entries(changes)) {
    switch (key) {
      case "state": changeState(task, value, now); break;
      case "owner": check(OWNERS, value, "owner"); task.owner = value; break;
      case "type": check(TYPES, value, "type"); task.type = value; break;
      case "deadline":
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Deadline must be YYYY-MM-DD");
        task.deadline = value || null;
        break;
      case "rank":
        if (!Number.isFinite(Number(value))) throw new Error("Rank must be a number");
        task.rank = Number(value);
        break;
      case "blocks":
        if (value && !/^T-\d+\.\d+$/.test(value)) throw new Error("Blocks must name a task, like T-014.3");
        task.blocks = value || null;
        break;
      case "contact": task.contact = checkContact(value); break;
      case "title": if (!String(value).trim()) throw new Error("A task needs a title"); task.title = oneLine(value); break;
      case "doneWhen": task.doneWhen = oneLine(value); break;
      case "description": task.description = String(value); break;
      default: throw new Error(`Unknown field: ${key}`);
    }
  }
}

function changeState(task, state, now) {
  check(STATES, state, "state");
  if (state === task.state) return;
  if (state === "done") { task.completed = now; task.ticked = true; task.archived = null; }
  else if (state === "archived") { task.archived = "Archived by hand"; }
  else { task.completed = null; task.ticked = false; task.archived = null; }
  task.state = state;
}
