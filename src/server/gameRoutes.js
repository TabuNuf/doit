// The game routes of the JSON API, as [method, pattern, handler] rows for HttpServer.
// `:key` is the entry's key (the title in lower case); the server has already decoded the path. A refused value is a ContactError: 400, a missing game 404.

const FILTERS = ["genre", "keyword", "scale", "stage", "store", "rating", "reviews", "covered", "comp", "similar", "noFacts"];

export function gameRoutes(games) {
  return [
    ["GET", /^\/api\/games$/, q => games.list(Object.fromEntries(FILTERS.filter(k => q.get(k)).map(k => [k, q.get(k)])))],
    ["GET", /^\/api\/game-tags$/, () => games.tags()],
    ["POST", /^\/api\/games$/, (q, b) => games.add(b.title)],
    ["GET", /^\/api\/games\/(.+)$/, (q, b, m) => games.get(m[1])],
    ["PATCH", /^\/api\/games\/(.+)$/, (q, b, m) => games.set(m[1], b)],
    ["POST", /^\/api\/games\/(.+)\/comp$/, (q, b, m) => games.setComp(m[1], b.game, b.reason)],
    ["DELETE", /^\/api\/games\/(.+)\/comp\/([^/]+)$/, (q, b, m) => games.removeComp(m[1], m[2])],
  ];
}
