// The board page. Talks to the server's JSON API only; reloads from disk every 10 s.

const COLORS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)", "#7a8a3a", "#3a7a8a", "#8a3a6a"];
const TABS = [["open", "Open"], ["done", "Completed"], ["archived", "Archive"]];
const STATES = [["todo", "To-do"], ["progress", "In progress"], ["backlog", "Backlog"], ["done", "Completed"], ["archived", "Archived"]];
const FUNNEL = '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>';

const S = {
  project: "all", epic: null, tab: "open", q: "", owner: "all",
  f: { task: true, bug: true, due: "any" }, fOpen: false,
  sel: null, font: 15, newProj: false, newTask: false, newEpic: null, data: null, npErr: "",
};
try { S.font = Number(localStorage.getItem("doit.font")) || 15; S.project = localStorage.getItem("doit.project") || "all"; } catch { /* storage off */ }

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const keyOf = t => `${t.project}/${t.id}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysLeft = d => Math.round((Date.parse(d) - Date.parse(today())) / 864e5);
const fmtDate = d => new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const tabOf = st => (st === "done" || st === "archived") ? st : "open";
const secOf = st => st === "backlog" ? "backlog" : "active";
const hasFilter = () => !S.f.task || !S.f.bug || S.f.due !== "any";

/* ---------- API ---------- */

async function api(method, path, body) {
  const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({ error: "The server sent something unreadable" }));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function load() {
  try {
    S.data = await api("GET", `/api/board?project=${encodeURIComponent(S.project)}${S.tab === "archived" ? "&archived=1" : ""}`);
    if (S.project !== "all" && !S.data.projects.some(p => p.id === S.project)) { S.project = "all"; return load(); }
    render();
  } catch (e) { toast(e.message.includes("fetch") ? "Doit's server is not running. Start Doit.app." : e.message); }
}

async function act(fn) {
  try { await fn(); await load(); } catch (e) { toast(e.message); }
}

const patch = (t, changes) => act(() => api("PATCH", `/api/tasks/${t.project}/${t.id}`, changes));

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 5000);
}

/* ---------- Helpers on loaded data ---------- */

const projects = () => S.data ? S.data.projects : [];
const proj = id => projects().find(p => p.id === id) || { id, name: id };
const color = id => COLORS[Math.max(0, projects().findIndex(p => p.id === id)) % COLORS.length];
const task = key => S.data && S.data.tasks.find(t => keyOf(t) === key);

function visible() {
  const q = S.q.trim().toLowerCase();
  const dueOk = t => S.f.due === "any" || (S.f.due === "has" && t.deadline) || (S.f.due === "none" && !t.deadline) || (S.f.due === "week" && t.deadline && daysLeft(t.deadline) <= 7);
  return S.data.tasks.filter(t =>
    (!S.epic || `${t.project}/${t.epic}` === S.epic) && (S.owner === "all" || t.owner === S.owner) && S.f[t.type] && dueOk(t) &&
    (!q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)));
}

/* ---------- Render ---------- */

function render() {
  if (!S.data) return;
  document.documentElement.style.setProperty("--fs", S.font + "px");
  renderTop();
  $("#panes").innerHTML = epicPane() + listPane() + detailPane();
  bindDrag();
}

function renderTop() {
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
  return `<button class="epic" aria-pressed="${S.epic === key}" data-e="${esc(key)}">
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

function sectionLists(base) {
  return {
    active: base.filter(t => t.state === "todo" || t.state === "progress"),
    backlog: base.filter(t => t.state === "backlog"),
  };
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

/* ---------- Ordering ---------- */

const between = (above, below) => above == null && below == null ? 1000 : above == null ? below - 1000 : below == null ? above + 1000 : (above + below) / 2;

/** Moves a task into a section, before another task (or to the top when beforeKey is null). */
function place(key, sec, beforeKey) {
  const t = task(key);
  const list = sectionLists(visible())[sec].filter(x => keyOf(x) !== key);
  let i = beforeKey ? list.findIndex(x => keyOf(x) === beforeKey) : 0;
  if (i < 0) i = list.length;
  const rank = between(list[i - 1]?.rank, list[i]?.rank);
  const changes = { rank };
  if (secOf(t.state) !== sec) changes.state = sec === "backlog" ? "backlog" : "todo";
  patch(t, changes);
}

function nudge(key, dir) {
  const t = task(key);
  const sec = secOf(t.state);
  const list = sectionLists(visible())[sec];
  const i = list.findIndex(x => keyOf(x) === key);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  const rest = list.filter(x => keyOf(x) !== key);
  // Index j in the list without the task is where it lands, either direction.
  patch(t, { rank: between(rest[j - 1]?.rank, rest[j]?.rank) });
}

let dragKey = null;
function bindDrag() {
  document.querySelectorAll('.row[draggable="true"]').forEach(r => {
    r.addEventListener("dragstart", ev => { dragKey = r.dataset.id; r.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; });
    r.addEventListener("dragend", () => { r.classList.remove("dragging"); dragKey = null; });
  });
  document.querySelectorAll('.row[draggable="true"], .sec-h[data-drop]').forEach(r => {
    r.addEventListener("dragover", ev => { if (dragKey) { ev.preventDefault(); r.classList.add("over"); } });
    r.addEventListener("dragleave", () => r.classList.remove("over"));
    r.addEventListener("drop", ev => {
      ev.preventDefault(); r.classList.remove("over");
      const k = dragKey; dragKey = null;
      if (!k || k === r.dataset.id) return;
      if (r.dataset.drop) place(k, r.dataset.drop, null);
      else place(k, r.dataset.sec, r.dataset.id);
    });
  });
}

/* ---------- Events ---------- */

document.addEventListener("click", ev => {
  const b = ev.target.closest("button, .row");
  if (!b) { if (S.fOpen && !ev.target.closest(".pop")) { S.fOpen = false; render(); } return; }
  const d = b.dataset;
  const sel = () => task(S.sel);
  if ("newproj" in d) { S.newProj = true; S.npErr = ""; render(); $("#np-name").focus(); return; }
  if ("cancelproj" in d) { S.newProj = false; return render(); }
  if (d.newepic) { S.newEpic = d.newepic; render(); $("#ne-name").focus(); return; }
  if ("newtask" in d) { S.newTask = !S.newTask; render(); if (S.newTask) $("#nt-title")?.focus(); return; }
  if ("canceltask" in d) { S.newTask = false; return render(); }
  if (d.cyc) { const t = task(d.cyc); S.sel = d.cyc; return patch(t, { state: t.state === "todo" ? "progress" : "todo" }); }
  if (d.reopen) { S.sel = d.reopen; return patch(task(d.reopen), { state: "todo" }); }
  if (d.p) { S.project = d.p; S.epic = null; S.newTask = false; try { localStorage.setItem("doit.project", d.p); } catch { /* */ } return load(); }
  if (d.e) { S.epic = S.epic === d.e ? null : d.e; return render(); }
  if ("clearEpic" in d) { S.epic = null; return render(); }
  if (d.t) { const reload = d.t === "archived" || S.tab === "archived"; S.tab = d.t; return reload ? load() : render(); }
  if (d.o) { S.owner = d.o; return render(); }
  if ("fopen" in d) { S.fOpen = !S.fOpen; return render(); }
  if ("freset" in d) { S.f = { task: true, bug: true, due: "any" }; return render(); }
  if (d.fs) { S.font = Math.min(22, Math.max(12, S.font + Number(d.fs))); try { localStorage.setItem("doit.font", S.font); } catch { /* */ } return render(); }
  if (d.own) return patch(sel(), { owner: d.own });
  if (d.type) return patch(sel(), { type: d.type });
  if ("addcmt" in d) {
    const text = $("#cmt").value.trim();
    if (!text) return;
    const t = sel();
    return act(() => api("POST", `/api/tasks/${t.project}/${t.id}/comments`, { text, who: "human" }));
  }
  if (d.id) { S.sel = d.id; return render(); }
});

document.addEventListener("submit", ev => {
  ev.preventDefault();
  const f = ev.target;
  if (f.id === "np") {
    const body = { name: $("#np-name").value, path: $("#np-path").value, docs: $("#np-docs").value || "Docs" };
    api("POST", "/api/projects", body)
      .then(p => { S.newProj = false; S.project = p.id; S.epic = null; return load(); })
      .catch(e => { S.npErr = e.message; render(); });
  } else if (f.dataset.epicform) {
    const project = f.dataset.epicform, name = $("#ne-name").value.trim();
    if (!name) { S.newEpic = null; return render(); }
    act(async () => { const r = await api("POST", "/api/epics", { project, name }); S.newEpic = null; S.epic = `${project}/${r.id}`; });
  } else if (f.id === "nt") {
    const [project, epic] = $("#nt-epic").value.split("/");
    const body = { project, epic, title: $("#nt-title").value, type: $("#nt-type").value, owner: $("#nt-owner").value };
    act(async () => { const t = await api("POST", "/api/tasks", body); S.newTask = false; S.sel = keyOf(t); S.tab = "open"; });
  }
});

document.addEventListener("keydown", ev => {
  const r = ev.target.closest && ev.target.closest(".row");
  if (r && (ev.key === "Enter" || ev.key === " ") && ev.target === r) { ev.preventDefault(); S.sel = r.dataset.id; render(); }
  if (r && ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && r.draggable) { ev.preventDefault(); nudge(r.dataset.id, ev.key === "ArrowUp" ? -1 : 1); }
  if (ev.key === "Escape") { S.fOpen = false; S.newProj = false; S.newTask = false; S.newEpic = null; render(); }
});

document.addEventListener("input", ev => {
  if (ev.target.id !== "q") return;
  S.q = ev.target.value;
  const pos = ev.target.selectionStart;
  render();
  const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos);
});

document.addEventListener("change", ev => {
  const id = ev.target.id;
  if (id === "keep") return act(() => api("PUT", "/api/settings", { keepCompletedDays: Number(ev.target.value) }));
  if (id === "f-task" || id === "f-bug") { S.f[id.slice(2)] = ev.target.checked; return render(); }
  if (ev.target.name === "f-due") { S.f.due = ev.target.value; return render(); }
  const t = task(S.sel);
  if (!t) return;
  if (id === "st") { const st = ev.target.value; S.tab = tabOf(st) === "archived" ? S.tab : tabOf(st); return patch(t, { state: st }); }
  if (id === "dlon") {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return patch(t, { deadline: ev.target.checked ? d.toISOString().slice(0, 10) : "" });
  }
  if (id === "dl") return patch(t, { deadline: ev.target.value });
});

// Description saves when the field loses focus.
document.addEventListener("focusout", ev => {
  if (ev.target.id !== "desc") return;
  const t = task(S.sel);
  if (!t || ev.target.value === t.description) return;
  act(async () => { await api("PATCH", `/api/tasks/${t.project}/${t.id}`, { description: ev.target.value }); });
});

// Reload from disk every 10 s so Claude's changes show, unless the user is typing or dragging.
setInterval(() => {
  const a = document.activeElement;
  const typing = a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "checkbox" && a.type !== "radio") || a.tagName === "SELECT");
  if (!typing && !dragKey && !S.newProj && !S.newTask && S.newEpic === null && !S.fOpen && document.visibilityState === "visible") load();
}, 10000);

load();
