// Outreach: the campaign facade. Over the Board and the ContactBook; the Board knows no contacts,
// so the root subscribes taskDone to the board's done facts.

import { planWeek, pickContacts } from "./outreachPlan.js";
import { checkDate, ContactError } from "./contacts.js";
import { splitGames } from "./rules.js";

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

  /** A campaign epic in `project` for one or more games (profiles, a list or comma-separated; by default the project itself, which needs a kind), optionally tied to a festival id or a date. The Game line lists them. Returns the epic id. */
  addCampaign(project, name, { game = project, event } = {}) {
    const games = splitGames(game);
    if (!games.length) throw new Error("A campaign needs a game, application or podcast");
    for (const g of games) if (!this.book.profiles().some(p => p.game === g)) throw new Error(`No profile for game "${g}": a game, application or podcast is a project with a kind, or a profile file`);
    const when = event ? this.#checkEvent(String(event).trim()) : null;
    return this.board.addEpic(project, name, { status: "Active", game: games.join(", "), event: when });
  }

  /** A campaign for `game` (one project with a kind, or several) in the marketing project, as + Campaign in the page starts it. */
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
    const picked = pickContacts({ contacts: this.book.list({}), games: splitGames(epic.game), until: this.#until(epic.event), taken, limit: n });
    return picked.map(c => {
      const t = this.board.addTask({ project, epic: epicId, title: `Reach out to ${c.name}`, owner: "human", state: "todo", doneWhen: "a mail or message sent", contact: c.id });
      return `${project}/${t.id}`;
    });
  }

  /** A contact task was ticked: log a mail touch per game of the campaign; the ref (with the game when there are several) makes a re-tick log once.
   *  A game without a profile logs it without the game, an unknown contact is skipped, any other failure is thrown to the notifier. */
  taskDone(fact) {
    const known = (fact.games ?? splitGames(fact.game)).filter(g => this.book.profiles().some(p => p.game === g));
    const games = known.length ? known : [""];
    try {
      for (const game of games) {
        const ref = games.length > 1 ? `${fact.ref}#${game}` : fact.ref;
        this.book.addTouch(fact.contact, { kind: "mail", date: fact.date, note: `${fact.epic}: ${fact.title}`, ref, game });
      }
    } catch (e) { if (!(e instanceof ContactError && e.status === 404)) throw e; }
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
