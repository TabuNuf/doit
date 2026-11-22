// The plain-text line for agent, model and effort: only for a task Claude does, only the parts that are set.

export function assignmentLine(t) {
  if (t.owner !== "ai") return "";
  const parts = [t.agent && `agent ${t.agent}`, t.model && `model ${t.model}`, t.effort && `effort ${t.effort}`].filter(Boolean);
  return parts.join(" · ");
}
