// The epic view: one epic's document, read only. Replaces the task list and detail panes.

import { S, esc, api, act } from "./state.js";
import { renderMarkdown } from "./markdown.js";

/** Fetches the epic's document and shows it; the board stays as it was underneath. */
export const openEpic = key => act(async () => {
  const [project, id] = key.split("/");
  S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
});

export function epicViewPane() {
  const e = S.epicView;
  return `<section class="pane epic-view" aria-label="Epic ${esc(e.id)}">
    <div class="pane-h"><span>${esc(e.id)} · ${esc(e.status)}${e.completed ? " · completed" : ""}</span><button data-close-epic style="margin-left:auto;text-transform:none">Close</button></div>
    <div class="pane-b doc">${renderMarkdown(e.text)}</div></section>`;
}
