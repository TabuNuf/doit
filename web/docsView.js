// Docs on the Board: each project's folder tree for the left pane, one document (rendered or in a text box) and the tasks linked to it.

import { S, esc, api, redraw, toast, projects, proj, fmtDate, keyOf, openOnBoard } from "./state.js";
import { renderMarkdown } from "./markdown.js";

const q = (project, path) => `project=${encodeURIComponent(project)}${path ? `&path=${encodeURIComponent(path)}` : ""}`;

/** Loads the trees of the projects shown, and the open document with what links to it; keeps an open edit box alone. */
export async function refreshDocs() {
  const d = S.docs;
  const shown = S.project === "all" ? projects() : [proj(S.project)];
  try {
    if (S.show.docs) for (const p of shown) d.trees[p.id] = await api("GET", `/api/docs/tree?${q(p.id)}`);
    if (d.active && d.path && !d.editing) await readDoc(d.path);
    redraw();
  } catch (e) { toast(e.message); }
}

async function readDoc(path) {
  const d = S.docs;
  try {
    [d.doc, d.linked] = await Promise.all([api("GET", `/api/docs/file?${q(d.project, path)}`), api("GET", `/api/docs/linked?${q(d.project, path)}`)]);
    d.path = path;
  } catch (e) { d.path = null; d.doc = null; d.linked = []; toast(e.message); }
}

/** Choosing a task, an epic or another project brings the task layout back from the document layout. */
export function docsLeave(d) {
  if (d.id || d.cyc || d.reopen || d.openEpic || d.p || "clearEpic" in d) S.docs.active = false;
}

/** Handles a click on a Docs control; true when the click was one. */
export function docsClick(d) {
  const D = S.docs;
  if (d.show) {
    S.show[d.show] = !S.show[d.show];
    try { localStorage.setItem("doit.show", JSON.stringify(S.show)); } catch { /* storage off */ }
    if (d.show === "docs" && S.show.docs) refreshDocs(); else redraw();
    return true;
  }
  if (d.fold) { const k = `${d.docProject}/${d.fold}`; D.open[k] = !(k in D.open ? D.open[k] : d.folded !== "true"); redraw(); return true; }
  if (d.doc) {
    if (D.editing && D.draft !== D.doc.text && !confirm("Discard your changes to this document?")) return true;
    D.editing = false; D.project = d.docProject; D.active = true;
    readDoc(d.doc).then(redraw);
    return true;
  }
  if ("docEdit" in d) { D.editing = true; D.draft = D.doc.text; redraw(); document.querySelector("#doc-text")?.focus(); return true; }
  if ("docDone" in d) { saveDoc(); return true; }
  if (d.linked) { openOnBoard(d.linked); return true; }
  if ("linkedToggle" in d) {
    D.linkedClosed = !D.linkedClosed;
    try { localStorage.setItem("doit.docs.linked", D.linkedClosed ? "closed" : "open"); } catch { /* storage off */ }
    redraw();
    return true;
  }
  return false;
}

/** Keeps what is typed in the edit box, so a redraw does not lose it. */
export function docsInput(ev) {
  if (ev.target.id !== "doc-text") return false;
  S.docs.draft = ev.target.value;
  return true;
}

async function saveDoc() {
  const D = S.docs;
  try {
    D.doc = await api("PUT", `/api/docs/file?${q(D.project, D.path)}`, { text: D.draft });
    D.editing = false;
    D.linked = await api("GET", `/api/docs/linked?${q(D.project, D.path)}`);
    redraw();
  } catch (e) { toast(e.message); }
}

/** One project's doc tree as buttons for the left pane. */
export function treeHtml(project, nodes, depth = 0) {
  const D = S.docs, pk = esc(project);
  return nodes.map(n => {
    const pad = `style="padding-left:${8 + depth * 14}px"`;
    if (n.type === "file") return `<button class="tnode file" ${pad} aria-pressed="${D.active && D.project === project && D.path === n.path}" data-doc="${esc(n.path)}" data-doc-project="${pk}">${esc(n.name)}</button>`;
    const open = `${project}/${n.path}` in D.open ? D.open[`${project}/${n.path}`] : !n.folded;
    return `<button class="tnode folder" ${pad} aria-expanded="${open}" data-fold="${esc(n.path)}" data-doc-project="${pk}" data-folded="${!!n.folded}">${open ? "▾" : "▸"} ${esc(n.name)}</button>${open ? treeHtml(project, n.children, depth + 1) : ""}`;
  }).join("");
}

function docBody() {
  const D = S.docs;
  if (!D.doc) return `<div class="empty">Pick a document in the left pane.</div>`;
  if (D.editing) return `<textarea id="doc-text" class="doc-edit" aria-label="Document text" spellcheck="false">${esc(D.draft)}</textarea>`;
  return `<div class="doc">${renderMarkdown(D.doc.text)}</div>`;
}

function changeNote(doc) {
  const c = doc.lastChange;
  return c ? `last changed by ${esc(c.author)}, ${esc(fmtDate(c.date))}` : "not committed";
}

/** The document pane and the Linked pane; `tools` is the text size control from the page's header. */
export function docsPanes(tools) {
  const D = S.docs;
  const head = D.doc ? `<span class="mono doc-path">${esc(D.path)}</span><span class="muted doc-change">${changeNote(D.doc)}</span>
      <button data-${D.editing ? "doc-done" : "doc-edit"}>${D.editing ? "Done" : "Edit"}</button>` : "Document";
  return `<section class="pane" aria-label="Document"><div class="pane-h">${head}${tools}</div><div class="pane-b">${docBody()}</div></section>
    ${linkedPane()}`;
}

/** The Linked pane, or a thin rail with a button that opens it again. */
function linkedPane() {
  const D = S.docs;
  if (D.linkedClosed) {
    const n = D.doc ? ` (${D.linked.length})` : "";
    return `<section class="pane linked-rail" aria-label="Linked, closed"><button data-linked-toggle aria-expanded="false" title="Open Linked">Linked${n}</button></section>`;
  }
  return `<section class="pane" aria-label="Linked"><div class="pane-h">Linked<button class="pane-close" data-linked-toggle aria-expanded="true" title="Close Linked" aria-label="Close Linked">×</button></div><div class="pane-b">${linkedHtml()}</div></section>`;
}

function linkedHtml() {
  const D = S.docs;
  if (!D.doc) return `<div class="empty">Tasks that name the open document show here.</div>`;
  if (!D.linked.length) return `<div class="empty">No open task names ${esc(D.path.split("/").pop())}.</div>`;
  return D.linked.map(t => `<button class="linked-card" data-linked="${esc(keyOf(t))}"><span class="mono muted">${esc(t.id)}</span> ${esc(t.title)}</button>`).join("");
}
