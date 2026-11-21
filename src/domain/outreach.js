// Outreach: the campaign facade. Over the Board and the ContactBook; the Board knows no contacts,
// so the root subscribes taskDone to the board's done facts.

import { planWeek, pickContacts } from "./outreachPlan.js";
import { checkDate, ContactError } from "./contacts.js";

export class Outreach {
  /** `campaignHome()` names the marketing project, where campaigns started from the page live; the root reads it from the settings. */
  constructor(board, book, now = () => new Date(), campaignHome = () => "polyspice-marketing") {
    this.board = board;
    this.book = book;
    this.now = now;
    this.campaignHome = campaignHome;
  }

  /** The weekly list: contacts, festival deadlines within 14 days and campaign steps. */
  week() {
    const { tasks } = this.board.view({ project: "all" });
    const festivals = new Map();
    for (const { game } of this.book.profiles()) {
      for (const f of this.book.festivals({ fits: game, open: true })) {
        const known = festivals.get(f.id) ?? { ...f, games: [] };
        known.games.push(game);
        festivals.set(f.id, known);
      }
    }
    return planWeek({ contacts: this.book.list({}), festivals: [...festivals.values()], tasks, today: this.book.today() });
  }

  /** A campaign epic in `project` for a game (a profile; by default the project itself, which needs a kind), optionally tied to a festival id or a date. Returns the epic id. */
  addCampaign(project, name, { game = project, event } = {}) {
    if (!this.book.profiles().some(p => p.game === game)) throw new Error(`No profile for game "${game}": a game, application or podcast is a project with a kind, or a profile file`);
    const when = event ? this.#checkEvent(String(event).trim()) : null;
    return this.board.addEpic(project, name, { status: "Active", game, event: when });
  }

  /** A campaign for `game` (a project with a kind) in the marketing project, as + Campaign in the page starts it. */
  startCampaign(game, name, { event } = {}) {
    return this.addCampaign(this.campaignHome(), name, { game, event });
  }

  /** One task per picked contact on an open campaign. Returns the made refs. */
  addContacts(project, epicId, limit = 10) {
    const epic = this.board.view({ project }).epics.find(e => e.id === epicId);
    if (!epic) throw new Error(`No open epic ${epicId} in ${project}`);
    if (!epic.game) throw new Error(`${epicId} is not a campaign: it has no Game line`);
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1) throw new Error(`Limit must be a whole number, 1 or more: ${limit}`);
    const taken = this.board.view({ project, archived: true }).tasks.filter(t => t.epic === epicId && t.contact).map(t => t.contact);
    const picked = pickContacts({ contacts: this.book.list({}), game: epic.game, until: this.#until(epic.event), taken, limit: n });
    return picked.map(c => {
      const t = this.board.addTask({ project, epic: epicId, title: `Reach out to ${c.name}`, owner: "human", state: "todo", doneWhen: "a mail or message sent", contact: c.id });
      return `${project}/${t.id}`;
    });
  }

  /** A contact task was ticked: log a mail touch for the campaign's game; the ref makes a re-tick log once.
   *  A game without a profile logs it without the game, an unknown contact is skipped, any other failure is thrown to the notifier. */
  taskDone(fact) {
    const touch = { kind: "mail", date: fact.date, note: `${fact.epic}: ${fact.title}`, ref: fact.ref };
    const game = fact.game && this.book.profiles().some(p => p.game === fact.game) ? fact.game : "";
    try { this.book.addTouch(fact.contact, { ...touch, game }); }
    catch (e) { if (!(e instanceof ContactError && e.status === 404)) throw e; }
  }

  #festival(id) {
    try { const c = this.book.get(id); return c.event ? c : null; } catch { return null; }
  }

  #checkEvent(event) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(event)) return checkDate(event, "Event");
    if (!this.#festival(event)) throw new Error(`Event must be a date (YYYY-MM-DD) or the id of a festival or conference: ${event}`);
    return String(Number(event));
  }

  /** The last day a contact may be due: a festival's start (else its deadline), or the date; "" for no limit. */
  #until(event) {
    if (!event) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(event)) return event;
    const f = this.#festival(event);
    return f ? f.event.starts || f.event.deadline || "" : "";
  }
}
