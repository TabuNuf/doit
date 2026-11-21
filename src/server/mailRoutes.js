// The mail routes of the JSON API, as [method, pattern, handler] rows for HttpServer (handlers may be async).
// A refused action is a MailError: 400 for the value, 404 for a missing draft.

export function mailRoutes(mailroom) {
  return [
    ["GET", /^\/api\/drafts$/, q => mailroom.drafts({ state: q.get("state") || undefined })],
    ["GET", /^\/api\/drafts\/([^/]+)$/, (q, b, m) => mailroom.getDraft(m[1])],
    ["PATCH", /^\/api\/drafts\/([^/]+)$/, (q, b, m) => mailroom.edit(m[1], { subject: b.subject, body: b.body, personal: b.personal })],
    ["POST", /^\/api\/drafts\/([^/]+)\/send$/, (q, b, m) => mailroom.approveAndSend(m[1])],
    ["DELETE", /^\/api\/drafts\/([^/]+)$/, (q, b, m) => { mailroom.discard(m[1]); return {}; }],
    ["POST", /^\/api\/mail\/sweep$/, () => mailroom.sweep()],
    ["GET", /^\/api\/mail\/status$/, () => mailroom.status()],
  ];
}
