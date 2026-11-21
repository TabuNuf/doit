// The Board's left pane: per project, the Epics and Docs toggles, then the epics and the doc tree.

import { S, esc, projects, proj, color } from "./state.js";
import { epicBtn, epicSections } from "./epicList.js";
import { paneShow, treeHtml } from "./docsView.js";

const toggles = p => `<div class="seg pane-toggles" role="group" aria-label="Show for ${esc(p.name)}">${[["epics", "Epics"], ["docs", "Docs"]]
  .map(([k, l]) => `<button aria-pressed="${paneShow(p.id)[k]}" data-pane="${k}" data-pane-p="${esc(p.id)}">${l}</button>`).join("")}</div>`;

function epics(p) {
  const adding = S.newEpic === p.id
    ? `<form class="inline-add" data-epicform="${esc(p.id)}"><input id="ne-name" placeholder="Epic name" aria-label="Epic name"><button type="submit">Add</button></form>`
    : `<button class="addbtn" data-newepic="${esc(p.id)}">+ New epic</button>`;
  return `<div class="open-zone" data-drop-epic="open" data-project="${esc(p.id)}">${S.data.epics.filter(e => e.project === p.id).map(epicBtn).join("")}</div>${adding}${epicSections(p.id)}`;
}

const docs = p => `<div class="tree" aria-label="Documents of ${esc(p.name)}">${S.docs.trees[p.id] ? treeHtml(p.id, S.docs.trees[p.id]) || `<div class="empty">No documents.</div>` : `<div class="empty">Loading…</div>`}</div>`;

/** The epics and doc trees of the shown projects. */
export function leftPane() {
  const ps = S.project === "all" ? projects() : [proj(S.project)];
  const groups = ps.map(p => {
    const sh = paneShow(p.id);
    const body = (sh.epics ? epics(p) : "") + (sh.docs ? docs(p) : "") || `<div class="empty">Turn on Epics or Docs.</div>`;
    return `<div class="group-h"><span class="dot" style="background:${color(p.id)}"></span>${esc(p.name)}</div>${toggles(p)}${body}`;
  }).join("");
  return `<section class="pane"><div class="pane-h">Projects${S.epic ? `<button class="fsz" data-clear-epic style="text-transform:none">Show all</button>` : ""}</div>
    <div class="pane-b">${groups || `<div class="empty">No projects yet. Add one under Projects ▾, + New project.</div>`}</div></section>`;
}
