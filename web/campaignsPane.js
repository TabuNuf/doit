// The Campaigns tab of the Marketing view: the picked game's profile, and the campaign epics (open first).
// Campaigns are epics with a Game line; clicking one opens it on the Board.

import { esc } from "./state.js";

/** Campaign epics for one game ("" for all): Active first, then the rest, each by project and id. */
export function campaignsFor(epics, game) {
  const later = e => (e.status === "Active" ? 0 : 1);
  return epics.filter(e => e.game && (!game || e.game === game))
    .sort((a, b) => later(a) - later(b) || a.project.localeCompare(b.project) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

/** The left column: what marketing knows about the picked game, from its profile. */
export function profilePane(game, profiles) {
  const p = profiles.find(x => x.game === game);
  if (!p) return `<section class="pane" aria-label="Profile"><div class="pane-h">Profile</div><div class="pane-b"><div class="empty">${profiles.length ? "Pick a game or podcast in the top bar to see its profile." : "No profiles yet. <code>doit profile add &lt;project&gt;</code> writes one in the project's Marketing folder."}</div></div></section>`;
  if (p.missing) return `<section class="pane" aria-label="Profile"><div class="pane-h">Profile</div><div class="pane-b detail"><div class="mono muted">${esc(p.kind)}</div><h2>${esc(p.name)}</h2><div class="empty">No Marketing/Profile.md yet. <code>doit profile add ${esc(p.game)}</code> writes one.</div></div></section>`;
  const row = (k, v) => `<dt>${k}</dt><dd>${v ? esc(v) : "-"}</dd>`;
  const all = v => (v || []).join(", ");
  return `<section class="pane" aria-label="Profile"><div class="pane-h">Profile</div><div class="pane-b detail">
    <div class="mono muted">${esc(p.kind || "game")}</div><h2>${esc(p.name || p.game)}</h2>
    <dl class="kv">${row("Stage", p.stage)}${row("Release", p.release)}${row("Genres", all(p.genres))}${row("Platforms", all(p.platforms))}${row("Needs", all(p.needs))}</dl>
    ${p.project ? `<div class="muted">From ${esc(p.project)}: Marketing/Profile.md</div>` : ""}</div></section>`;
}

export function campaignRow(e) {
  return `<button class="mk-row" data-campaign="${esc(e.project)}/${esc(e.id)}" title="Open on the Board">
    <span class="title"><span class="mono muted">${esc(e.id)}</span> ${esc(e.name)}</span>
    <span class="pills"><span class="pill">${esc(e.game)}</span><span class="pill mono">${e.done}/${e.total}</span><span class="pill${e.status === "Active" ? "" : " ai"}">${esc(e.status)}</span></span></button>`;
}

/** The list column; `list` is null while loading. */
export function campaignsPane(list) {
  const body = !list ? `<div class="empty">Loading…</div>` : list.length ? list.map(campaignRow).join("") : `<div class="empty">No campaign. <code>doit campaign add</code> starts one.</div>`;
  return `<section class="pane" aria-label="Campaigns"><div class="pane-h">Campaigns<span class="c">${list ? list.length : ""}</span></div><div class="pane-b">${body}</div></section>`;
}
