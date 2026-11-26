// The contact routes of the JSON API, as [method, pattern, handler] rows for HttpServer.
// A refused value reaches the client as a ContactError: 400 for the value, 404 for a missing contact.

const FIELDS = ["name", "types", "topic", "email", "reach", "genres", "about", "special", "notes", "status", "next", "channels", "event", "reddit", "scales", "scaleNote", "checked"];
const on = v => v === "1" || v === "true";

export function contactRoutes(book) {
  return [
    ["GET", /^\/api\/contacts$/, q => book.list({
      type: q.get("type") || undefined, except: q.get("except") || undefined, fits: q.get("fits") || undefined, genre: q.get("genre") || undefined, status: q.get("status") || undefined,
      reach: q.get("reach") || undefined, due: on(q.get("due")),
      scale: q.get("scale") || undefined, relevant: on(q.get("relevant")), irrelevant: on(q.get("irrelevant")), nowRelevant: on(q.get("nowRelevant")), parked: on(q.get("parked")), all: on(q.get("all")),
      contacted: q.get("contacted") || undefined, notContacted: q.get("notContacted") || undefined, noAbout: on(q.get("noAbout")),
    })],
    ["GET", /^\/api\/genres$/, () => book.genres()],
    ["GET", /^\/api\/contacts\/([^/]+)$/, (q, b, m) => book.get(m[1])],
    ["PATCH", /^\/api\/contacts\/([^/]+)$/, (q, b, m) => book.update(m[1], Object.fromEntries(FIELDS.filter(k => k in b).map(k => [k, b[k]])))],
    ["POST", /^\/api\/contacts\/([^/]+)\/fit$/, (q, b, m) => book.setFit(m[1], b.game, b.reason)],
    ["DELETE", /^\/api\/contacts\/([^/]+)\/fit\/([^/]+)$/, (q, b, m) => book.removeFit(m[1], decodeURIComponent(m[2]))],
    ["POST", /^\/api\/contacts\/([^/]+)\/games$/, (q, b, m) => book.addGame(m[1], b)],
    ["DELETE", /^\/api\/contacts\/([^/]+)\/games\/([^/]+)$/, (q, b, m) => book.removeGame(m[1], decodeURIComponent(m[2]))],
    ["POST", /^\/api\/contacts\/([^/]+)\/touch$/, (q, b, m) => book.addTouch(m[1], { kind: b.kind, game: b.game, date: b.date })],
    ["GET", /^\/api\/profiles$/, () => book.profiles()],
    ["PUT", /^\/api\/projects\/([^/]+)\/profile$/, (q, b, m) => book.saveProfile(m[1], b)],
  ];
}
