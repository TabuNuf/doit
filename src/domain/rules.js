// Time rules (deadline and retention archiving) and ranking. Pure: today is passed in.

export const DEFAULT_KEEP_DAYS = 14;

/** Whole days from date a to date b, both "YYYY-MM-DD" (or longer, the date part is used). */
export function daysBetween(a, b) {
  const d = s => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((d(b) - d(a)) / 864e5);
}

/** A closed epic is archived when it has no close date or the date is past the kept days. */
export function epicArchived(closed, today, keepDays) {
  return !closed || daysBetween(closed, today) > keepDays;
}

/** Returns why a task should be archived today, or null. */
export function archiveReason(task, today, keepDays) {
  if (task.state === "archived") return null;
  if (task.state === "done") {
    if (task.completed && daysBetween(task.completed, today) > keepDays) {
      return `Completed ${task.completed.slice(0, 10)}, kept ${keepDays} days`;
    }
    return null;
  }
  if (task.deadline && daysBetween(task.deadline, today) > 0) {
    return `Deadline passed on ${task.deadline}`;
  }
  return null;
}

/** A rank that sorts between two neighbours; either may be missing. */
export function rankBetween(above, below) {
  if (above == null && below == null) return 1000;
  if (above == null) return below - 1000;
  if (below == null) return above + 1000;
  return (above + below) / 2;
}

/** Sort for the Active and Backlog sections: by rank, then number. */
export function byRank(a, b) {
  return a.rank - b.rank || a.project.localeCompare(b.project) || a.id.localeCompare(b.id, undefined, { numeric: true });
}

/** "YYYY-MM-DD HH:MM" in local time. */
export function stamp(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
