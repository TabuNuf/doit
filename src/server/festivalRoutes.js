// The festival route of the JSON API: events that fit a game, by deadline, none past their deadline;
// `type` keeps festivals or conferences.

export function festivalRoutes(book) {
  return [
    ["GET", /^\/api\/festivals$/, q => book.festivals({ fits: q.get("game") || undefined, type: q.get("type") || undefined, open: true })],
  ];
}
