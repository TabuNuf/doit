// A project's settings on the Board: its kind, and for a project with a kind its marketing profile
// (genres, platforms, stage, release date, what it needs now), saved to <docs>/Marketing/Profile.md.
// Opened from the gear beside a project's name in the left pane, in place; the pure parts build HTML and requests.

import { S, $, esc, api, act, load, toast, proj, redraw } from "./state.js";

/** What a project is, as the server accepts it; "" is no kind. */
export const PROJECT_KINDS = [["", "no kind"], ["game", "game"], ["application", "application"], ["podcast", "podcast"]];
export const STAGES = ["in development", "demo", "released"];
const list = v => (v || []).join(", ");
const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;

/** The gear beside a project's name in the left pane; pressed while that project's settings are open. */
export const gearButton = (project, open) => `<button class="gear" data-settings="${esc(project)}" aria-pressed="${open}" aria-label="Settings of ${esc(project)}" title="Kind and marketing profile of ${esc(project)}">\u2699</button>`;

/** The middle column: what the project is. */
export function kindPane(p) {
  const why = p.kind ? `Marketing lists ${esc(p.name)} as a ${esc(p.kind)}: it has a profile, campaigns and contacts that fit it.` : `${esc(p.name)} has no kind, so Marketing does not list it. Pick game, application or podcast to give it a profile and campaigns.`;
  return `<section class="pane" aria-label="Project settings"><div class="pane-h">Settings<span class="c">${esc(p.name)}</span></div><div class="pane-b detail">
    <dl class="kv"><dt>Kind</dt><dd><select id="ps-kind" aria-label="Kind of ${esc(p.name)}">${PROJECT_KINDS.map(([v, l]) => opt(v, l, p.kind || "")).join("")}</select></dd></dl>
    <div class="muted">${why}</div></div></section>`;
}

/** The right column: the marketing profile form; `profile` is the project's entry of /api/profiles (or undefined). */
export function profilePane(p, profile, msg = "") {
  const wrap = body => `<section class="pane" aria-label="Marketing profile"><div class="pane-h">Marketing profile</div><div class="pane-b detail">${body}</div></section>`;
  if (!p.kind) return wrap(`<div class="muted">A project with no kind has no marketing profile. Pick a kind to set one.</div>`);
  const f = profile && !profile.missing ? profile : { genres: [], platforms: [], needs: [], stage: "in development", release: "" };
  const note = profile && !profile.missing ? "Saving updates Marketing/Profile.md and keeps anything else written in it." : "There is no Marketing/Profile.md yet. Saving creates it from the template.";
  return wrap(`<form class="form ps-form" id="ps-form" aria-label="Marketing profile of ${esc(p.name)}">
    <label for="ps-genres">Genres<input id="ps-genres" value="${esc(list(f.genres))}" placeholder="co-op, cozy"></label>
    <label for="ps-platforms">Platforms<input id="ps-platforms" value="${esc(list(f.platforms))}" placeholder="Steam, Switch"></label>
    <label for="ps-stage">Stage<select id="ps-stage">${STAGES.map(s => opt(s, s, f.stage)).join("")}</select></label>
    <label for="ps-release">Release date<input type="date" id="ps-release" value="${esc(f.release)}"></label>
    <label for="ps-needs">Needs now<input id="ps-needs" value="${esc(list(f.needs))}" placeholder="wishlists, press coverage"></label>
    <button type="submit">Save profile</button>
    <div class="muted ps-note">${note}</div>${msg ? `<div class="ps-note" role="status">${esc(msg)}</div>` : ""}</form>`);
}

/** Both panes for the project shown. */
export const settingsPanes = (p, profile, msg) => kindPane(p) + profilePane(p, profile, msg);

/** The requests the two controls send: the kind on the project, the profile fields under it. */
export const kindRequest = (project, kind) => ({ method: "PATCH", path: `/api/projects/${encodeURIComponent(project)}`, body: { kind } });
export const profileRequest = (project, v) => ({ method: "PUT", path: `/api/projects/${encodeURIComponent(project)}/profile`, body: { genres: v.genres, platforms: v.platforms, stage: v.stage, release: v.release, needs: v.needs } });

const read = () => ({ genres: $("#ps-genres").value, platforms: $("#ps-platforms").value, stage: $("#ps-stage").value, release: $("#ps-release").value, needs: $("#ps-needs").value });

async function refreshProfiles() {
  try { S.settings.profiles = await api("GET", "/api/profiles"); } catch (e) { toast(e.message); }
}

/** Handles a click on a project's gear: it opens that project's settings in place, a second click closes them; true when it was one. */
export function settingsClick(d) {
  if (!("settings" in d)) return false;
  const was = S.settings.open && S.project === d.settings;
  S.settings.open = !was; S.settings.msg = "";
  if (was) { redraw(); return true; }
  S.docs.active = false;
  if (S.project !== d.settings) {
    S.project = d.settings; S.epic = null; S.epicView = null;
    try { localStorage.setItem("doit.project", d.settings); } catch { /* storage off */ }
    load().then(refreshProfiles).then(redraw);
    return true;
  }
  refreshProfiles().then(redraw);
  return true;
}

/** A changed kind; true when the change was this select's. */
export function settingsChange(ev) {
  if (ev.target.id !== "ps-kind") return false;
  const req = kindRequest(S.project, ev.target.value);
  act(async () => { await api(req.method, req.path, req.body); S.settings.msg = ""; await refreshProfiles(); });
  return true;
}

/** The profile form's submit; true when the form was this one. */
export function settingsSubmit(f) {
  if (f.id !== "ps-form") return false;
  const req = profileRequest(S.project, read());
  act(async () => { await api(req.method, req.path, req.body); S.settings.msg = "Saved to Marketing/Profile.md."; await refreshProfiles(); });
  return true;
}

/** The settings replace the epic and task columns while they are open on one project of the Board. */
export const settingsShown = () => S.view === "board" && S.settings.open && S.project !== "all";
export const settingsHtml = () => { const p = proj(S.project); return settingsPanes(p, (S.settings.profiles || []).find(x => x.game === p.id), S.settings.msg); };

/** Opens a project's settings on the Board (from the Marketing view's profile pane). */
export function openSettingsFor(project) {
  S.view = "board"; S.project = project; S.epic = null; S.epicView = null; S.docs.active = false; S.settings.open = true; S.settings.msg = "";
  return Promise.all([refreshProfiles(), load()]);
}
