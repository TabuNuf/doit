// Contact names for task cards: /api/contacts is fetched once and names are kept by id.

import { esc, api, redraw } from "./state.js";

let names = null, loading = false;

/** Fills the cache from a contact list (the fetch calls this; tests call it with a fixture). */
export function setContactNames(list) {
  names = new Map(list.map(c => [String(c.id), c.name]));
}

/** Loads the names once, then redraws; a failed load leaves ids shown. */
export async function ensureContactNames() {
  if (names || loading) return;
  loading = true;
  try { setContactNames(await api("GET", "/api/contacts")); redraw(); } catch { /* ids are shown */ } finally { loading = false; }
}

export const contactName = id => (names && names.get(String(id))) || `Contact ${id}`;

/** A button with the contact's name; a click opens the Marketing view on it. */
export const contactButton = id => `<button class="pill st" data-task-contact="${esc(id)}" title="Open the contact">${esc(contactName(id))}</button>`;
