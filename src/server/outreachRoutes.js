// The outreach routes of the JSON API, as [method, pattern, handler] rows for HttpServer.
// A refusal from Outreach (not a campaign, bad limit) is an Error, so it reaches the client as 400.

const fail = msg => { throw new Error(msg); };

export function outreachRoutes(outreach) {
  return [
    ["GET", /^\/api\/outreach$/, () => outreach.week()],
    ["POST", /^\/api\/campaigns$/, (q, b) => ({ id: outreach.startCampaign(b.projects ?? String(b.project ?? ""), String(b.name ?? "").trim() || fail("Give the campaign a name"), { event: b.event || undefined }) })],
    ["POST", /^\/api\/campaigns\/([^/]+)\/([^/]+)\/contacts$/, (q, b, m) => ({ refs: outreach.addContacts(m[1], m[2], b.limit === undefined ? 10 : b.limit) })],
  ];
}
