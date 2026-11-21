// The festival route of the JSON API: events that fit a game, by deadline, none past their deadline;
// `type` keeps festivals or conferences; `platform=1` keeps the store events (Events tab), `platform=0` the rest (Festivals tab).

export function festivalRoutes(book) {
  return [
    ["GET", /^\/api\/festivals$/, q => book.festivals({ fits: q.get("game") || undefined, type: q.get("type") || undefined, platform: q.has("platform") ? q.get("platform") === "1" : undefined, open: true })],
  ];
}
