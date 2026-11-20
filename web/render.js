// The views: top bar, epic pane, task list and detail pane, as HTML strings.

import { S, TABS, STATES, FUNNEL, $, esc, keyOf, daysLeft, fmtDate, tabOf, hasFilter, projects, proj, color, task, visible, sectionLists } from "./state.js";
import { bindDrag } from "./ordering.js";
import { epicViewPane } from "./epicView.js";
import { docsPanes } from "./docsView.js";
import { setLayout } from "./resize.js";

/* ---------- Render ---------- */

export function render() {
  if (!S.data) return;
  document.documentElement.style.setProperty("--fs", S.font + "px");
  renderTop();
  setLayout(S.view, S.view === "docs" && S.docs.linkedClosed);
  if (S.view === "docs") { $("#panes").innerHTML = docsPanes(fontCtl()); return; }
  $("#panes").innerHTML = epicPane() + listPane() + detailPane();
  bindDrag();
}

function renderTop() {
  $("#views").innerHTML = [["board", "Board"], ["docs", "Docs"]].map(([v, l]) => `<button aria-pressed="${S.view === v}" data-view="${v}">${l}</button>`).join("");
  const all = [{ id: "all", name: "All projects" }, ...projects()];
  $("#projects").innerHTML = all.map(p => `<button class="chip" aria-pressed="${S.project === p.id}" data-p="${esc(p.id)}">${p.id !== "all" ? `<span class="dot" style="background:${color(p.id)}"></span>` : ""}${esc(p.name)}</button>`).join("")
    + `<button class="chip" data-newproj style="border-style:dashed">+ Project</button>`;
  $("#modal").innerHTML = S.newProj ? `<form class="form" id="np" aria-label="New project">
    <label for="np-name">Project name<input id="np-name" required placeholder="Storm Haven"></label>
    <label for="np-path">Folder<input id="np-path" required placeholder="~/Unity/Storm-Haven" style="width:240px"></label>
    <label for="np-docs">Docs folder<input id="np-docs" value="Docs" style="width:140px"></label>
    <button type="submit">Create project</button><button type="button" data-cancelproj>Cancel</button>
    <div class="muted" style="font-size:12px;width:100%">Creates Epics/, Epics/Tasks, Parked/ and Completed/ in the docs folder if they are missing, and a rolling bug epic when the project has no epics. Nothing existing is overwritten.</div>
    ${S.npErr ? `<div class="err">${esc(S.npErr)}</div>` : ""}</form>` : "";
}

function epicBtn(e) {
  const key = `${e.project}/${e.id}`;
  const pct = e.total ? Math.round(e.done / e.total * 100) : 0;
  return `<button class="epic" aria-pressed="${S.epic === key}" data-open-epic="${esc(key)}" title="Show this epic and its tasks">
    <div class="t"><span>${esc(e.name)}</span><span class="n">${e.done}/${e.total}</span></div>
    <div class="t"><span class="n">${e.id}</span><span class="estate">${esc(e.status)}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div></button>`;
}

function epicPane() {
  const ps = S.project === "all" ? projects() : [proj(S.project)];
  const groups = ps.map(p => {
    const adding = S.newEpic === p.id
      ? `<form class="inline-add" data-epicform="${esc(p.id)}"><input id="ne-name" placeholder="Epic name" aria-label="Epic name"><button type="submit">Add</button></form>`
      : `<button class="addbtn" data-newepic="${esc(p.id)}">+ New epic</button>`;
    return `<div class="group-h"><span class="dot" style="background:${color(p.id)}"></span>${esc(p.name)}</div>${S.data.epics.filter(e => e.project === p.id).map(epicBtn).join("")}${adding}`;
  }).join("");
  return `<section class="pane"><div class="pane-h">Epics${S.epic ? `<button class="fsz" data-clear-epic style="text-transform:none">Show all</button>` : ""}</div>
    <div class="pane-b">${groups || `<div class="empty">No projects yet. Add one with + Project.</div>`}</div></section>`;
}

function rowHtml(t, i, sec) {
  const dl = t.deadline ? daysLeft(t.deadline) : null;
  const due = t.deadline && tabOf(t.state) === "open" ? `<span class="pill due ${dl <= 2 ? "late" : ""}" title="Deadline ${t.deadline}">${dl < 0 ? "late" : "due " + fmtDate(t.deadline)}</span>` : "";
  const open = sec === "active" || sec === "backlog";
  const k = esc(keyOf(t));
  const grip = open ? `<span class="grip" title="Drag to reorder (or Alt + arrow keys)" aria-hidden="true"></span>` : "<span></span>";
  const rank = sec === "active" ? `<span class="rank">${i + 1}</span>` : `<span class="rank"></span>`;
  const st = sec === "active" ? `<button class="pill st ${t.state === "progress" ? "prog" : ""}" data-cyc="${k}" title="Click to switch">${t.state === "progress" ? "In progress" : "To-do"}</button>` : "";
  const left = t.state === "done" && t.completed ? `<span class="pill due" title="Moves to the archive">archives in ${Math.max(0, S.data.settings.keepCompletedDays + daysLeft(t.completed))} d</span><button class="pill st" data-reopen="${k}">Reopen</button>` : "";
  const arch = t.state === "archived" ? `<button class="pill st" data-reopen="${k}">Restore</button>` : "";
  const projPill = S.project === "all" ? `<span class="pill"><span class="dot" style="background:${color(t.project)}"></span>${esc(proj(t.project).name)}</span>` : "";
  return `<div class="row" tabindex="0" role="option" aria-selected="${S.sel === keyOf(t)}" data-id="${k}" data-sec="${sec}" draggable="${open}">
    ${grip}${rank}<span class="tdot ${t.type}" title="${t.type === "bug" ? "Bug" : "Task"}"></span><span class="mono muted">${t.id}</span><span class="title">${esc(t.title)}</span>
    <span class="pills">${st}${due}${projPill}${left}${arch}<span class="own" title="${t.owner === "ai" ? "Claude" : "You"}">${t.owner === "ai" ? "🤖" : "🧑"}</span></span></div>`;
}

function listBody(base) {
  const none = msg => `<div class="empty">${msg}</div>`;
  if (S.tab === "open") {
    const { active, backlog } = sectionLists(base);
    return `<div class="sec-h" data-drop="active">Active<span class="c">${active.length}</span><span class="muted">Ranked. Drag rows by the handle; drop here to put a task at the top.</span></div>
      ${active.map((t, i) => rowHtml(t, i, "active")).join("") || none("Nothing active.")}
      <div class="sec-h" data-drop="backlog">Backlog<span class="c">${backlog.length}</span><span class="muted">Not planned. Claude does not pick these up.</span></div>
      ${backlog.map((t, i) => rowHtml(t, i, "backlog")).join("") || none("Backlog is empty.")}`;
  }
  if (S.tab === "done") {
    const list = base.filter(t => t.state === "done").sort((a, b) => (b.completed || "").localeCompare(a.completed || ""));
    return `<div class="setting"><label for="keep">Move completed tasks to the archive after</label><input type="number" id="keep" min="1" max="90" value="${S.data.settings.keepCompletedDays}"> days</div>
      ${list.map((t, i) => rowHtml(t, i, "done")).join("") || none("Nothing completed recently.")}`;
  }
  const list = base.filter(t => t.state === "archived");
  return `<div class="setting">Claude never reads the archive. Archived task files live in the docs folder's Archive/.</div>
    ${list.map((t, i) => rowHtml(t, i, "archived")).join("") || none("Archive is empty.")}`;
}

function newTaskForm() {
  if (!S.newTask) return "";
  const epics = S.data.epics.filter(e => S.project === "all" || e.project === S.project);
  if (!epics.length) return `<div class="setting">Add an epic first.</div>`;
  const pre = S.epic || "";
  return `<form class="form form-task" id="nt">
    <label for="nt-title" style="flex:1;min-width:200px">Title<input id="nt-title" required></label>
    <label for="nt-epic">Epic<select id="nt-epic">${epics.map(e => { const k = `${e.project}/${e.id}`; return `<option value="${esc(k)}" ${k === pre ? "selected" : ""}>${S.project === "all" ? esc(proj(e.project).name) + " · " : ""}${e.id} ${esc(e.name)}</option>`; }).join("")}</select></label>
    <label for="nt-type">Type<select id="nt-type"><option value="task">Task</option><option value="bug">Bug</option></select></label>
    <label for="nt-owner">Owner<select id="nt-owner"><option value="human">🧑 Me</option><option value="ai">🤖 Claude</option></select></label>
    <button type="submit">Add task</button><button type="button" data-canceltask>Cancel</button></form>`;
}

function listPane() {
  const base = visible();
  const count = v => base.filter(t => tabOf(t.state) === v).length;
  const epic = S.epic && S.data.epics.find(e => `${e.project}/${e.id}` === S.epic);
  return `<section class="pane">
    <div class="toolbar">
      <input type="search" id="q" placeholder="Search by number (T-014) or text" value="${esc(S.q)}" aria-label="Search tasks">
      <div class="seg" role="group" aria-label="Owner">${[["all", "All"], ["human", "🧑 Mine"], ["ai", "🤖 Claude's"]].map(([v, l]) => `<button aria-pressed="${S.owner === v}" data-o="${v}">${l}</button>`).join("")}</div>
      <div class="filt"><button data-fopen aria-expanded="${S.fOpen}" aria-label="Filter" class="${hasFilter() ? "on" : ""}">${FUNNEL}${hasFilter() ? "On" : ""}</button>
        ${S.fOpen ? `<div class="pop" role="dialog" aria-label="Filter">
          <div class="sect">Type</div>
          <label><input type="checkbox" id="f-task" ${S.f.task ? "checked" : ""}><span class="tdot task"></span>Tasks</label>
          <label><input type="checkbox" id="f-bug" ${S.f.bug ? "checked" : ""}><span class="tdot bug"></span>Bugs</label>
          <div class="sect">Due date</div>
          ${[["any", "Any"], ["week", "Due within 7 days"], ["has", "Has a due date"], ["none", "No due date"]].map(([v, l]) => `<label><input type="radio" name="f-due" value="${v}" ${S.f.due === v ? "checked" : ""}>${l}</label>`).join("")}
          <button data-freset style="margin-top:6px">Clear filters</button></div>` : ""}</div>
      <button data-newtask>+ Task</button>
    </div>
    ${newTaskForm()}
    <div class="tabs" role="tablist">${TABS.map(([v, l]) => `<button role="tab" aria-pressed="${S.tab === v}" data-t="${v}">${l}${v === "archived" && S.tab !== "archived" ? "" : `<span class="c">${count(v)}</span>`}</button>`).join("")}</div>
    ${epic ? `<div class="filterline">Filtered to <b>${epic.id} ${esc(epic.name)}</b><button data-clear-epic>Clear</button></div>` : ""}
    <div class="pane-b" role="listbox" id="list">${listBody(base)}</div>
  </section>`;
}

function fontCtl() {
  return `<span class="fsz"><button data-fs="-1" aria-label="Smaller text">A−</button><span class="mono">${S.font}</span><button data-fs="1" aria-label="Larger text">A+</button></span>`;
}

function detailPane() {
  const t = S.sel && task(S.sel);
  if (!t && S.epicView) return epicViewPane(fontCtl());
  if (!t) return `<section class="pane"><div class="pane-h">Detail${fontCtl()}</div><div class="pane-b"><div class="empty">Select a task.</div></div></section>`;
  const dl = t.deadline ? daysLeft(t.deadline) : null;
  const where = t.state === "archived" ? "Archive/Tasks" : "Epics/Tasks";
  return `<section class="pane"><div class="pane-h">Detail${fontCtl()}</div><div class="pane-b detail">
    <div class="mono muted">${t.id} · ${esc(t.epicName)}</div>
    <h2>${esc(t.title)}</h2>
    <div class="pills" style="justify-content:flex-start"><span class="pill"><span class="tdot ${t.type}"></span>${t.type === "bug" ? "Bug" : "Task"}</span><span class="pill">${t.owner === "ai" ? "🤖 Claude" : "🧑 You"}</span><span class="pill"><span class="dot" style="background:${color(t.project)}"></span>${esc(proj(t.project).name)}</span></div>
    <dl class="kv">
      <dt>State</dt><dd><select id="st" aria-label="State">${STATES.map(([v, l]) => `<option value="${v}" ${t.state === v ? "selected" : ""}>${l}</option>`).join("")}</select></dd>
      <dt>Owner</dt><dd><div class="seg">${[["human", "🧑 Me"], ["ai", "🤖 Claude"]].map(([v, l]) => `<button aria-pressed="${t.owner === v}" data-own="${v}">${l}</button>`).join("")}</div></dd>
      <dt>Type</dt><dd><div class="seg">${[["task", "Task"], ["bug", "Bug"]].map(([v, l]) => `<button aria-pressed="${t.type === v}" data-type="${v}">${l}</button>`).join("")}</div></dd>
      <dt>Deadline</dt><dd><label class="toggle"><input type="checkbox" id="dlon" ${t.deadline ? "checked" : ""}> Archive when passed</label>
        ${t.deadline ? `<div><input type="date" id="dl" value="${t.deadline}" aria-label="Deadline"> <span class="muted">${dl < 0 ? "passed" : dl + " days left"}</span></div>` : ""}</dd>
      <dt>Created</dt><dd class="mono">${t.created || "-"}</dd>
      <dt>Updated</dt><dd class="mono">${t.updated || "-"}</dd>
      ${t.completed ? `<dt>Completed</dt><dd class="mono">${t.completed}</dd>` : ""}
      ${t.source ? `<dt>Source</dt><dd>${esc(t.source)}</dd>` : ""}
      ${t.state === "archived" && t.archived ? `<dt>Archived</dt><dd class="warnline">${esc(t.archived)}</dd>` : ""}
    </dl>
    <div class="sect">Description<span id="saved"></span></div>
    <textarea id="desc" class="desc-in" aria-label="Description" placeholder="No description yet. Click to write one.">${esc(t.description)}</textarea>
    <div class="sect">Done when</div>
    <p>${esc(t.doneWhen || "Not written yet.")}</p>
    <div class="sect">Comments<span class="muted" style="text-transform:none;letter-spacing:0"> · ${t.comments.length}</span></div>
    ${t.comments.map(c => `<div class="cmt"><div class="cmt-h"><span>${c.who === "ai" ? "🤖 Claude" : "🧑 You"}</span><span class="mono muted">${esc(c.at)}</span></div><div style="white-space:pre-wrap">${esc(c.text)}</div></div>`).join("")}
    <label for="cmt" class="muted" style="font-size:12px">Add a comment</label>
    <textarea id="cmt" class="cmt-in" rows="3" placeholder="Claude reads new comments on its tasks before it continues."></textarea>
    <div style="display:flex;justify-content:flex-end;margin-top:6px"><button data-addcmt>Comment</button></div>
    <div class="muted mono" style="font-size:11px;margin-top:12px">${esc(proj(t.project).path || "")}/${esc(proj(t.project).docs || "")}/${where}/${t.id}.md</div>
  </div></section>`;
}
