// The task value and the rules for a task that has no task file yet.

export const STATES = ["todo", "progress", "backlog", "done", "archived"];
export const OWNERS = ["ai", "human"];
export const TYPES = ["task", "bug"];

/** Which tab a state belongs to: open, done or archived. */
export function tabOf(state) {
  if (state === "done" || state === "archived") return state;
  return "open";
}

/** Which section of the Open tab a state belongs to. */
export function sectionOf(state) {
  return state === "backlog" ? "backlog" : "active";
}

/** "EPIC-014" -> 14 */
export function epicNumber(epicId) {
  return Number(epicId.slice(5));
}

/** "T-014.3" -> { epic: "EPIC-014", n: 3 } */
export function taskParts(taskId) {
  const m = /^T-(\d+)\.(\d+)$/.exec(taskId);
  if (!m) throw new Error(`Not a task number: ${taskId}`);
  return { epic: `EPIC-${m[1]}`, n: Number(m[2]) };
}

export function taskId(epicId, n) {
  return `T-${epicId.slice(5)}.${n}`;
}

/** "cb/T-014.3" -> { project: "cb", id: "T-014.3" } */
export function parseRef(ref) {
  const i = ref.indexOf("/");
  if (i < 1) throw new Error(`Expected <project>/<task>, got: ${ref}`);
  const id = ref.slice(i + 1);
  taskParts(id);
  return { project: ref.slice(0, i), id };
}

/** Fields of a task that has only its checklist line. */
export function defaultsFor(epic, line) {
  let state;
  if (line.ticked || epic.status === "Done" || epic.completed) state = "archived";
  else if (epic.status === "Active") state = "todo";
  else state = "backlog";
  return {
    state,
    owner: "ai",
    type: /bug/i.test(epic.name) ? "bug" : "task",
    rank: epicNumber(epic.id) * 1000 + line.n,
    deadline: null,
    created: null,
    updated: null,
    completed: null,
    source: null,
    archived: line.ticked ? "Finished before Doit tracked it" : null,
    description: "",
    comments: [],
  };
}

/** Joins an epic line, its epic and its task file (or null) into one task. */
export function makeTask(projectId, epic, line, file) {
  const base = defaultsFor(epic, line);
  const fields = file ? { ...base, ...stripNulls(file) } : base;
  return {
    project: projectId,
    id: line.id,
    epic: epic.id,
    epicName: epic.name,
    title: line.title,
    doneWhen: line.doneWhen,
    ticked: line.ticked,
    hasFile: Boolean(file),
    ...fields,
  };
}

function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== "") out[k] = v;
  return out;
}

/** Whether a state is in a list filter: open, active, or one state. */
export function matchesState(actual, wanted) {
  if (wanted === "open") return tabOf(actual) === "open";
  if (wanted === "active") return actual === "todo" || actual === "progress";
  return actual === wanted;
}

export function check(allowed, value, name) {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
}

export function oneLine(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}
