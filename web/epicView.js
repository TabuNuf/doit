// The epic view: one epic's document, read only, shown in the Detail pane while its tasks fill the list.

import { S, esc, api, act, toast } from "./state.js";
import { epicPage } from "./epicPage.js";
import { findDoc } from "./projectPage.js";

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
    await api("POST", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}/move`, { to: "completed" });
    S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
  });
};

/** Makes one task per fitting contact for a campaign epic, then reloads. */
export const addContacts = key => act(async () => {
  const [project, id] = key.split("/");
  const { refs } = await api("POST", `/api/campaigns/${encodeURIComponent(project)}/${encodeURIComponent(id)}/contacts`, {});
  toast(refs.length ? `Added ${refs.length} contact task${refs.length === 1 ? "" : "s"}` : "No contacts to add");
  // The document lists the new task lines, so it is read again.
  S.epicView = await api("GET", `/api/epics/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);
});

/** True for an open epic whose document has a Game line: a campaign. */
export const isCampaign = e => !e.completed && /^Game:\s*\S/m.test(e.text || "");

/** The Open file button when the docs tree holds the epic's file. */
const openFile = e => {
  const f = findDoc(S.docs.trees[e.project], n => n.name.startsWith(`${e.id}-`) || n.name === `${e.id}.md`);
  return f ? `<button class="fsz" data-doc="${esc(f.path)}" data-doc-project="${esc(e.project)}" style="text-transform:none">Open file</button>` : "";
};

/** The Detail pane holding the open epic's document; `tools` is the header's right-hand controls. */
export function epicViewPane(tools) {
  const e = S.epicView;
  return `<section class="pane" aria-label="Epic ${esc(e.id)}">
    <div class="pane-h">Epic · ${esc(e.id)} · ${esc(e.status)}${e.completed ? "" : `<button class="fsz" data-close-epic="${esc(S.epic || `${e.project}/${e.id}`)}" style="text-transform:none">Close epic</button>`}${isCampaign(e) ? `<button class="fsz" data-add-contacts="${esc(S.epic || `${e.project}/${e.id}`)}" style="text-transform:none">Add contacts</button>` : ""}${openFile(e)}${tools}</div>
    <div class="pane-b">${epicPage(e, S.data ? S.data.tasks : [])}</div></section>`;
}
