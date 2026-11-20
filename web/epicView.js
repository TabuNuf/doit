// The epic view: one epic's document, read only, shown in the Detail pane while its tasks fill the list.

import { S, esc, api, act } from "./state.js";
import { renderMarkdown } from "./markdown.js";

/** Filters the list to the epic and shows its document in the Detail pane. */
export const openEpic = key => act(async () => {
  const [project, id] = key.split("/");
  S.epic = key; S.sel = null;
  S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
});

/** Closes the epic after a confirmation, reloads, and keeps its document shown. */
export const closeEpic = key => {
  if (!confirm(`Close ${key.split("/")[1]}? Its tasks move to the archive and it moves to Completed.`)) return;
  return act(async () => {
    const [project, id] = key.split("/");
    await api("POST", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}/close`);
    S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
  });
};

/** The Detail pane holding the open epic's document; `tools` is the header's right-hand controls. */
export function epicViewPane(tools) {
  const e = S.epicView;
  return `<section class="pane" aria-label="Epic ${esc(e.id)}">
    <div class="pane-h">Epic · ${esc(e.id)} · ${esc(e.status)}${e.completed ? "" : `<button class="fsz" data-close-epic="${esc(S.epic || `${e.project}/${e.id}`)}" style="text-transform:none">Close epic</button>`}${tools}</div>
    <div class="pane-b doc">${renderMarkdown(e.text)}</div></section>`;
}
