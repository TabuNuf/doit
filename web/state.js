// Page state, small helpers, and the API calls. Every other web module reads and changes the page through this.

export const COLORS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)", "var(--p5)", "var(--p6)", "var(--p7)"];
export const TABS = [["open", "Open"], ["done", "Completed"], ["archived", "Archive"]];
export const STATES = [["todo", "To-do"], ["progress", "In progress"], ["backlog", "Backlog"], ["done", "Completed"], ["archived", "Archived"]];
export const FUNNEL = '<svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>';

export const S = {
  project: "all", epic: null, tab: "open", q: "", owner: "all",
  f: { task: true, bug: true, due: "any" }, fOpen: false, projOpen: false,
  view: "board", claude: null, docs: { project: null, tree: [], path: null, doc: null, linked: [], open: {}, editing: false, draft: "", linkedClosed: false },
  sel: null, font: 15, newProj: false, newTask: false, newEpic: null, epicView: null, epicFold: {}, data: null, npErr: "",
};
try { S.font = Number(localStorage.getItem("doit.font")) || 15; S.project = localStorage.getItem("doit.project") || "all"; S.docs.linkedClosed = localStorage.getItem("doit.docs.linked") === "closed"; } catch { /* storage off */ }

let renderer = () => {};
/** The page registers its render function here, so loading does not import the views. */
export const setRenderer = fn => { renderer = fn; };
export const redraw = () => renderer();

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const keyOf = t => `${t.project}/${t.id}`;
export const today = () => new Date().toISOString().slice(0, 10);
export const daysLeft = d => Math.round((Date.parse(d) - Date.parse(today())) / 864e5);
export const fmtDate = d => new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const tabOf = st => (st === "done" || st === "archived") ? st : "open";
export const secOf = st => st === "backlog" ? "backlog" : "active";
export const hasFilter = () => !S.f.task || !S.f.bug || S.f.due !== "any";

/* ---------- API ---------- */

export async function api(method, path, body) {
  const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({ error: "The server sent something unreadable" }));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const NON_TEXT = ["checkbox", "radio", "range", "button", "submit", "reset", "file", "color", "image"];

/** True while a reload would disturb the user: a text field has focus, a drag runs, or a menu or form is open. */
export function reloadHeld(state, active, dragging = false) {
  const tag = active && active.tagName;
  const typing = tag === "TEXTAREA" || (tag === "INPUT" && !NON_TEXT.includes(active.type));
  return Boolean(typing || dragging || state.newProj || state.newTask || state.newEpic !== null || state.fOpen || state.projOpen
    || (state.view === "docs" && state.docs.editing));
}

export async function load() {
  try {
    S.data = await api("GET", `/api/board?project=${encodeURIComponent(S.project)}${S.tab === "archived" ? "&archived=1" : ""}`);
    if (S.project !== "all" && !S.data.projects.some(p => p.id === S.project)) { S.project = "all"; return load(); }
    renderer();
  } catch (e) { toast(e.message.includes("fetch") ? "Doit's server is not running. Start Doit.app." : e.message); }
}

export async function act(fn) {
  try { await fn(); await load(); } catch (e) { toast(e.message); }
}

/** Back to the Board with the task selected, in its own project when one project is shown. */
export function openOnBoard(key) {
  S.view = "board"; S.epic = null; S.epicView = null; S.sel = key; S.tab = "open";
  if (S.project !== "all" && S.project !== key.split("/")[0]) S.project = key.split("/")[0];
  load();
}

export const patch = (t, changes) => act(() => api("PATCH", `/api/tasks/${t.project}/${t.id}`, changes));

export function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 5000);
}

/* ---------- Helpers on loaded data ---------- */

export const projects = () => S.data ? S.data.projects : [];
export const proj = id => projects().find(p => p.id === id) || { id, name: id };
export const color = id => COLORS[Math.max(0, projects().findIndex(p => p.id === id)) % COLORS.length];
export const task = key => S.data && S.data.tasks.find(t => keyOf(t) === key);

/** The "due within 7 days" test, shared by the Board's filter and the Claude view's badge. */
export const dueWithinWeek = t => Boolean(t.deadline) && daysLeft(t.deadline) <= 7;

/** Tabu's open tasks due within 7 days in the loaded project(s): the count on the Claude view's badge. */
export const dueSoonCount = () => S.data ? S.data.tasks.filter(t => t.owner === "human" && tabOf(t.state) === "open" && dueWithinWeek(t)).length : 0;

export function visible() {
  const q = S.q.trim().toLowerCase();
  const dueOk = t => S.f.due === "any" || (S.f.due === "has" && t.deadline) || (S.f.due === "none" && !t.deadline) || (S.f.due === "week" && dueWithinWeek(t));
  return S.data.tasks.filter(t =>
    (!S.epic || `${t.project}/${t.epic}` === S.epic) && (S.owner === "all" || t.owner === S.owner) && S.f[t.type] && dueOk(t) &&
    (!q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)));
}

export function sectionLists(base) {
  return {
    active: base.filter(t => t.state === "todo" || t.state === "progress"),
    backlog: base.filter(t => t.state === "backlog"),
  };
}
