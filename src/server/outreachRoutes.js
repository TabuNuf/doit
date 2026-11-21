// The outreach routes of the JSON API, as [method, pattern, handler] rows for HttpServer.
// A refusal from Outreach (not a campaign, bad limit) is an Error, so it reaches the client as 400.

export function outreachRoutes(outreach) {
  return [
    ["GET", /^\/api\/outreach$/, () => outreach.week()],
    ["POST", /^\/api\/campaigns\/([^/]+)\/([^/]+)\/contacts$/, (q, b, m) => ({ refs: outreach.addContacts(m[1], m[2], b.limit === undefined ? 10 : b.limit) })],
  ];
}
