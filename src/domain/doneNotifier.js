// DoneNotifier: tells subscribers, with plain values, that a task with a contact is done.

export class DoneNotifier {
  constructor() { this.listeners = []; }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  /** `now` is the stamp "YYYY-MM-DD HH:MM". A listener's failure never undoes the change already written. */
  announce(task, now) {
    if (!task.contact) return;
    const fact = { ref: `${task.project}/${task.id}`, project: task.project, epic: task.epic, title: task.title, contact: task.contact, game: task.game ?? null, date: now.slice(0, 10) };
    for (const l of this.listeners) { try { l({ ...fact }); } catch { /* ignored */ } }
  }
}
