// DoneNotifier: tells subscribers, with plain values, that a task with a contact is done.

import { splitGames } from "./rules.js";

export class DoneNotifier {
  constructor(onError = () => {}) { this.listeners = []; this.onError = onError; }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  /** `now` is the stamp "YYYY-MM-DD HH:MM". A listener's failure never undoes the change already written; it goes to `onError(fact, error)`. */
  announce(task, now) {
    if (!task.contact) return;
    const fact = { ref: `${task.project}/${task.id}`, project: task.project, epic: task.epic, title: task.title, contact: task.contact, game: task.game ?? null, games: splitGames(task.game), date: now.slice(0, 10) };
    for (const l of this.listeners) { try { l({ ...fact }); } catch (e) { this.onError(fact, e); } }
  }
}
