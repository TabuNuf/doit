// Every listener on the page, and the live reload from the server's change events.

import { S, $, keyOf, tabOf, api, act, load, patch, task, reloadHeld } from "./state.js";
import { render } from "./render.js";
import { nudge, dragKey } from "./ordering.js";
import { epicDragging } from "./epicMove.js";
import { openEpic, closeEpic } from "./epicView.js";
import { toggleFold } from "./epicList.js";
import { docsClick, docsInput, refreshDocs } from "./docsView.js";
import { claudeClick, refreshClaude } from "./claudeView.js";
import { marketingClick, marketingChange, marketingFocusOut, marketingSubmit, refreshMarketing } from "./marketingView.js";

/** Loads what the current view shows beyond the board data. */
const refreshView = () => S.view === "docs" ? refreshDocs() : S.view === "claude" ? refreshClaude() : S.view === "marketing" ? refreshMarketing() : undefined;

/* ---------- Events ---------- */

document.addEventListener("click", ev => {
  const b = ev.target.closest("button, .row");
  if (S.projOpen && !ev.target.closest(".projmenu")) { S.projOpen = false; if (!b) return render(); }
  if (!b) { if (S.fOpen && !ev.target.closest(".pop")) { S.fOpen = false; render(); } return; }
  const d = b.dataset;
  const sel = () => task(S.sel);
  if (d.view) { S.view = d.view; render(); return refreshView(); }
  if (docsClick(d) || claudeClick(d) || marketingClick(d)) return;
  if ("projmenu" in d) { S.projOpen = !S.projOpen; return render(); }
  if (d.star) { const p = S.data.projects.find(x => x.id === d.star); return act(() => api("PATCH", `/api/projects/${encodeURIComponent(d.star)}`, { starred: !p.starred })); }
  if ("newproj" in d) { S.projOpen = false; S.newProj = true; S.npErr = ""; render(); $("#np-name").focus(); return; }
  if ("cancelproj" in d) { S.newProj = false; return render(); }
  if (d.newepic) { S.newEpic = d.newepic; render(); $("#ne-name").focus(); return; }
  if ("newtask" in d) { S.newTask = !S.newTask; render(); if (S.newTask) $("#nt-title")?.focus(); return; }
  if ("canceltask" in d) { S.newTask = false; return render(); }
  if (d.cyc) { const t = task(d.cyc); S.sel = d.cyc; return patch(t, { state: t.state === "todo" ? "progress" : "todo" }); }
  if (d.reopen) { S.sel = d.reopen; return patch(task(d.reopen), { state: "todo" }); }
  if (d.p) { S.projOpen = false; S.project = d.p; S.epic = null; S.epicView = null; S.newTask = false; try { localStorage.setItem("doit.project", d.p); } catch { /* */ } return load().then(refreshView); }
  if (d.openEpic) {
    // A second click on the epic already shown clears it; with a task open, it brings the epic back.
    if (S.epic === d.openEpic && S.epicView && !S.sel) { S.epic = null; S.epicView = null; return render(); }
    return openEpic(d.openEpic);
  }
  if (d.closeEpic) return closeEpic(d.closeEpic);
  if (d.epicFold) { toggleFold(d.epicFoldP, d.epicFold); return render(); }
  if ("clearEpic" in d) { S.epic = null; S.epicView = null; return render(); }
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
  if (marketingSubmit(f)) return;
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
  if (ev.key === "Escape") { S.fOpen = false; S.projOpen = false; S.newProj = false; S.newTask = false; S.newEpic = null; S.mk.touchOpen = false; render(); }
});

document.addEventListener("input", ev => {
  if (docsInput(ev)) return;
  if (ev.target.id !== "q") return;
  S.q = ev.target.value;
  const pos = ev.target.selectionStart;
  render();
  const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos);
});

document.addEventListener("change", ev => {
  if (marketingChange(ev)) return;
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
  if (id === "blk") return patch(t, { blocks: ev.target.value.trim() });
});

// Description saves when the field loses focus.
document.addEventListener("focusout", ev => {
  if (marketingFocusOut(ev)) return;
  if (ev.target.id !== "desc") return;
  const t = task(S.sel);
  if (!t || ev.target.value === t.description) return;
  act(async () => { await api("PATCH", `/api/tasks/${t.project}/${t.id}`, { description: ev.target.value }); });
});

// The server says "changed" on any disk change. Reload at once unless the user is mid-edit, else
// remember it and reload when the hold ends.
let pending = false;
const held = () => reloadHeld(S, document.activeElement, Boolean(dragKey || epicDragging()));
function reloadNow() {
  pending = false;
  load().then(refreshView);
}
function maybeReload() {
  if (!pending || document.visibilityState !== "visible" || held()) return;
  reloadNow();
}
const onChanged = () => { pending = true; maybeReload(); };
if (typeof EventSource !== "undefined") new EventSource("/api/events").onmessage = onChanged;
// Each way a hold can end; the cheap tick catches forms and menus closed by a click.
for (const ev of ["focusout", "pointerup", "dragend", "visibilitychange"]) document.addEventListener(ev, () => setTimeout(maybeReload, 0));
setInterval(maybeReload, 500);

load();
