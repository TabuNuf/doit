// The epic view: one epic's document, read only, shown in the Detail pane while its tasks fill the list.

import { S, esc, api, act } from "./state.js";
import { renderMarkdown } from "./markdown.js";

/** Filters the list to the epic and shows its document in the Detail pane. */
export const openEpic = key => act(async () => {
  const [project, id] = key.split("/");
  S.epic = key; S.sel = null;
  S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
});

/** The Detail pane holding the open epic's document; `tools` is the header's right-hand controls. */
export function epicViewPane(tools) {
  const e = S.epicView;
  return `<section class="pane" aria-label="Epic ${esc(e.id)}">
    <div class="pane-h">Epic · ${esc(e.id)} · ${esc(e.status)}${tools}</div>
    <div class="pane-b doc">${renderMarkdown(e.text)}</div></section>`;
}
