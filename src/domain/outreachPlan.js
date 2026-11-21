// The weekly outreach list and the contact pick for a campaign. Pure: today and every input are passed in.

import { daysBetween } from "./rules.js";

const open = t => t.state === "todo" || t.state === "progress";
const reachOf = c => c.reach ?? 0;

/** {contacts, festivals, steps} for the week; the caps keep it to what fits in about 30 minutes. */
export function planWeek({ contacts = [], festivals = [], tasks = [], today, caps = { contacts: 5, steps: 3 }, window = 14 }) {
  const byId = new Map(contacts.map(c => [c.id, c]));
  const campaign = tasks.filter(t => t.game && open(t)).sort((a, b) => a.rank - b.rank);
  const listed = new Set();
  const out = [];
  for (const t of campaign.filter(x => x.contact)) {
    if (listed.has(t.contact)) continue;
    listed.add(t.contact);
    out.push({ id: t.contact, name: byId.get(t.contact)?.name ?? `contact ${t.contact}`, game: t.game, ref: `${t.project}/${t.id}`, why: "campaign" });
  }
  const due = contacts.filter(c => c.status === "active" && c.next && c.next <= today && c.fit?.length && !listed.has(c.id))
    .sort((a, b) => a.next.localeCompare(b.next) || reachOf(b) - reachOf(a));
  for (const c of due) out.push({ id: c.id, name: c.name, game: c.fit[0].game, why: "due" });
  return {
    contacts: out.slice(0, caps.contacts),
    festivals: festivals
      .filter(f => (!f.event.state || f.event.state === "watching") && f.event.deadline && f.games?.length)
      .map(f => ({ id: f.id, name: f.name, year: f.event.year, deadline: f.event.deadline, daysLeft: daysBetween(today, f.event.deadline), games: f.games }))
      .filter(f => f.daysLeft >= 0 && f.daysLeft <= window)
      .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.name.localeCompare(b.name)),
    steps: campaign.filter(t => !t.contact).slice(0, caps.steps).map(t => ({ ref: `${t.project}/${t.id}`, title: t.title, game: t.game })),
  };
}

/** Contacts for a campaign: active, fit the game, not due after `until` (empty: no limit), not in `taken` (ids); largest reach first. */
export function pickContacts({ contacts, game, until = "", taken = [], limit = 10 }) {
  const skip = new Set(taken);
  return contacts
    .filter(c => c.status === "active" && c.fit?.some(f => f.game === game) && !skip.has(c.id) && (!until || !c.next || c.next <= until))
    .sort((a, b) => reachOf(b) - reachOf(a) || a.id - b.id)
    .slice(0, limit);
}

/** The morning report's outreach lines. */
export function outreachLines(plan) {
  const { contacts, festivals, steps } = plan;
  if (!contacts.length && !festivals.length && !steps.length) return ["Outreach this week: nothing"];
  const part = (label, items) => items.length ? `${label} ${items.length}: ${items.join("; ")}` : `${label}: none`;
  return [
    part("Outreach contacts", contacts.map(c => `${c.name} (${c.game}, ${c.why})`)),
    part("Festival deadlines within 14 days", festivals.map(f => `${f.name} ${f.year} (${f.deadline}, ${f.daysLeft} days)`)),
    part("Campaign steps", steps.map(s => `${s.ref} ${s.title}`)),
  ];
}
