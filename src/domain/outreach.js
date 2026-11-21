// Outreach: the campaign facade. Over the Board and the ContactBook; the Board knows no contacts,
// so the root subscribes taskDone to the board's done facts.

export class Outreach {
  constructor(board, book, now = () => new Date()) {
    this.board = board;
    this.book = book;
    this.now = now;
  }

  /** A contact task was ticked: log a mail touch for the campaign's game; the ref makes a re-tick log once. */
  taskDone(fact) {
    const touch = { kind: "mail", date: fact.date, note: `${fact.epic}: ${fact.title}`, ref: fact.ref };
    // A game without a profile still logs the touch, without the game; a missing contact is ignored.
    for (const game of fact.game ? [fact.game, ""] : [""]) {
      try { this.book.addTouch(fact.contact, { ...touch, game }); return; } catch { /* try next */ }
    }
  }
}
