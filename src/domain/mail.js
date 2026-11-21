// Mail vocabulary, pure: templates, drafts and the text of a mail.

export const DRAFT_STATES = ["draft", "approved", "sent", "failed"];

/** A refused mail action: 400 by default, 404 for a missing draft or template. */
export class MailError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;
const KEYS = ["name", "personal", "game"];

/** A template from its file text: first line `Subject: <subject>`, then the body (leading blank lines dropped). */
export function parseTemplate(name, text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const m = lines[0].match(/^Subject:\s*(.*?)\s*$/i);
  if (!m || !m[1]) throw new MailError(`Template ${name} must start with "Subject: <subject>"`);
  const body = lines.slice(1).join("\n").replace(/^\s*\n/, "").trimEnd();
  if (!body) throw new MailError(`Template ${name} has no body`);
  return { name, subject: m[1], body };
}

/** The first `{{...}}` left in `text`, or null. */
export function leftover(text) {
  const m = new RegExp(PLACEHOLDER.source).exec(String(text ?? ""));
  return m ? m[0] : null;
}

/** Subject and body with {{name}}, {{personal}}, {{game}} filled. An unknown placeholder, or one with an empty value, is refused naming it. */
export function fillTemplate(template, values) {
  const fill = text => text.replace(PLACEHOLDER, (all, key) => {
    const v = KEYS.includes(key) ? String(values?.[key] ?? "").trim() : "";
    if (!v) throw new MailError(`Template ${template.name} has ${all} with no value`);
    return v;
  });
  return { subject: fill(template.subject), body: fill(template.body) };
}

const text1 = v => String(v ?? "").replace(/\s+/g, " ").trim();

/** A new draft in state `draft`. `subject` and `body` are the filled text. */
export function makeDraft({ id = null, contact, game, template, personal = "", subject, body, created }) {
  return {
    id, contact, game: text1(game), template: text1(template), personal: String(personal ?? "").trim(),
    subject: text1(subject), body: String(body ?? "").trim(), state: "draft", created: created ?? "",
    sentAt: "", messageId: "", error: "", labeled: false,
  };
}

/** Edited fields of a draft that is `draft` or `failed` (a failed one goes back to `draft`); empty subject or body is refused. */
export function editDraft(draft, { subject, body, personal } = {}) {
  if (draft.state !== "draft" && draft.state !== "failed") throw new MailError(`A ${draft.state} draft cannot be edited`);
  const next = {
    ...draft,
    subject: subject === undefined ? draft.subject : text1(subject),
    body: body === undefined ? draft.body : String(body).trim(),
    personal: personal === undefined ? draft.personal : String(personal).trim(),
    state: "draft", error: "",
  };
  if (!next.subject) throw new MailError("A mail needs a subject");
  if (!next.body) throw new MailError("A mail needs a body");
  return next;
}

/** `draft` to `approved`; refused when subject or body still has a {{...}}. */
export function approveDraft(draft) {
  if (draft.state !== "draft") throw new MailError(`Only a draft can be approved; this one is ${draft.state}`);
  const left = leftover(draft.subject) ?? leftover(draft.body);
  if (left) throw new MailError(`The mail still has ${left}`);
  return { ...draft, state: "approved" };
}

export const markSent = (draft, sentAt, messageId) => ({ ...draft, state: "sent", sentAt, messageId, error: "" });
export const markFailed = (draft, error) => ({ ...draft, state: "failed", error: String(error) });

const b64 = bytes => btoa(String.fromCharCode(...bytes));
const ascii = s => /^[\x20-\x7e]*$/.test(s);

/** A header value as RFC 2047 encoded words when it is not plain ASCII (split on characters, at most 45 bytes a word). */
export function encodeHeader(value) {
  const s = String(value).replace(/[\r\n]+/g, " ").trim();
  if (ascii(s)) return s;
  const enc = new TextEncoder();
  const words = [];
  let chunk = "";
  for (const ch of s) {
    if (enc.encode(chunk + ch).length > 45) { words.push(chunk); chunk = ""; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map(w => `=?UTF-8?B?${b64(enc.encode(w))}?=`).join("\r\n ");
}

const pad = n => String(n).padStart(2, "0");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** RFC 5322 date in the local zone of `d`. */
export function mailDate(d) {
  const off = -d.getTimezoneOffset();
  const zone = `${off < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(off) / 60))}${pad(Math.abs(off) % 60)}`;
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${zone}`;
}

function wrap76(s) { return s.match(/.{1,76}/g)?.join("\r\n") ?? ""; }

/** The mail as text with CRLF line ends, for an approved draft to `contact`, from `identity` {address, name}.
 *  `random` is the Message-ID's random part, passed in so the function stays pure. Returns {from, to, messageId, text}. */
export function composeMail(draft, contact, identity, now, random) {
  const to = text1(contact.email);
  if (!to) throw new MailError("The contact has no email");
  const address = text1(identity.address);
  const domain = address.split("@")[1];
  if (!domain) throw new MailError("The mail address is not valid");
  const messageId = `<doit-${draft.id}-${random}@${domain}>`;
  const name = text1(identity.name);
  const from = !name ? address : ascii(name) ? `"${name.replace(/["\\]/g, "\\$&")}" <${address}>` : `${encodeHeader(name)} <${address}>`;
  const body = String(draft.body).replace(/\r\n?|\n/g, "\r\n");
  const text = [
    `From: ${from}`, `To: ${to}`, `Subject: ${encodeHeader(draft.subject)}`, `Date: ${mailDate(now)}`, `Message-ID: ${messageId}`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "",
    wrap76(b64(new TextEncoder().encode(body))), "",
  ].join("\r\n");
  return { from: address, to, messageId, text };
}
