// Joins a project's epics, checklist lines and task files into tasks. Pure over the Board's source port.

import { makeTask } from "./task.js";

export function loadTasks(source, projectId, archived) {
  const { epics, files, archivedIds } = source.load(projectId, { archived });
  const tasks = [];
  for (const epic of epics) {
    for (const line of epic.lines) {
      if (!archived && archivedIds.has(line.id)) continue;
      // A closed epic's tasks show until archived, but only those Doit tracks with a file.
      if (!archived && epic.completed && !files.has(line.id)) continue;
      const task = makeTask(projectId, epic, line, files.get(line.id) || null);
      // The Archive/ folder decides: a file moved there by hand still says its old state.
      if (archivedIds.has(line.id) && task.state !== "archived") { task.state = "archived"; task.archived ||= "Moved to the archive"; }
      tasks.push(task);
    }
  }
  return { epics, tasks };
}
