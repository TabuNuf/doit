# EPIC-013: Mail

Status: Active
Goal: Tabu sends personal pitch mails to contacts from Doit through the Workspace account, from Claude's drafts that Tabu approves, and replies show on the contact without opening Gmail.
Design: Design.md, section Marketing (step 3)

## Scope

- Decided: IMAP and SMTP to Google Workspace (`imap.gmail.com:993`, `smtp.gmail.com:465`) over `node:tls`, no packages. The app password is kept in the macOS Keychain and read with `security`, never written to a file.
- Decided: Doit opens only the Inbox (headers only, to find contacts' mail) and the **Marketing** label. Mail from an address on the contact list is moved to Marketing and logged as a reply touch; other mail is never fetched beyond its From header.
- Decided: a template is a Markdown file in the Polyspice Marketing project, `Docs/Templates/<name>.md`: subject, body with `{{name}}`, `{{personal}}`, `{{game}}` and the pitch (hook, trailer, Steam link, the ask).
- Decided: a draft is a template filled for one contact, plus one or two personal lines Claude writes from the contact's research. Claude only writes drafts; Tabu approves each one in the page before it is sent. Nothing is sent from the CLI.
- Decided: a sent mail is logged as a touch for the contact and its game, and a copy is labeled Marketing.
- Proposed: at most 20 mails sent per day from Doit, so a batch never looks like bulk mail to Google.
- Out of this epic: reading full mail bodies and attachments (EPIC-016).

## Tasks

- [x] T-013.1 Architecture and design: mail modules in the layer table and class diagram; `node:tls` and `node:child_process` (for `security`) allowed in the store only (done when: the boundaries test allows them in `src/store/` only and passes)
- [x] T-013.2 Domain: `Template` (fields, placeholders, refusal when one is unfilled) and `Draft` (contact, game, template, personal lines, state draft/approved/sent/failed), drafts stored in `marketing.db` (done when: domain tests fill a template for a contact and refuse a draft with an unfilled placeholder)
- [x] T-013.3 Store: `SmtpSender`, a minimal SMTP client (EHLO, AUTH PLAIN, plain text UTF-8 mail with Message-ID) and the Keychain reader (done when: a test against a scripted fake server sends a mail and checks the exact dialogue; a wrong password is reported, not thrown)
- [x] T-013.4 Store: `ImapMailbox`, a minimal IMAP client: LOGIN, SELECT, SEARCH FROM, FETCH headers, MOVE, COPY by Message-ID, with encoded-word subjects decoded (done when: tests against recorded Gmail responses find a contact's mail in Inbox and move it to Marketing)
- [x] T-013.5 `Mailroom` facade: send an approved draft (log the touch, copy to Marketing), and a reply sweep (contacts' mail in Inbox moved to Marketing and logged as reply touches); the sweep runs on page load and with `doit mail sweep` (done when: domain tests over fake ports send, log and sweep, and a draft over the daily cap waits)
- [x] T-013.6 CLI: `doit templates`, `doit draft add <contact> --template <name> --game <game> --personal <text>`, `doit drafts [--state]`, `doit mail sweep` (done when: CLI tests cover each command and `draft add` refuses an unknown template)
- [x] T-013.7 Server and web: a Drafts pane in the Marketing view: each draft rendered as the mail will look, editable, with Approve and send and Discard; the contact's touches show sent mail and replies (done when: server and web tests cover approve, discard and edit; in the app a test mail to Tabu's own address arrives and is labeled Marketing)
- [x] T-013.8 Close audit: the API refuses writes from another site or a foreign host name, so no other page can send a draft (done when: server test refuses a cross-site POST and a foreign Host; the page still edits)

## Test plan

- Batch A: T-013.1 to .4 (docs, domain, store): development
- Batch B: T-013.5 to .7 (domain, cli, server, web): development
- Performance: none

## Check in play

- T-013.7: set up the app password in the Keychain, approve a draft to Tabu's own address, see it arrive, see it under the Marketing label, reply to it and see the reply touch after a sweep.

## Notes

Decisions and deviations, newest first.

- T-013.7 (coordinator, in-app check): "Approve and send" without a mail account approved the draft before refusing, leaving it approved and no longer editable; it now refuses first. A skipped sweep leaves no line, since the status line already says mail is not set up.

- T-013.7: the Drafts pane replaces the Contacts column in the Marketing view when chosen (a Drafts button in the Contacts header, a Contacts button in the Drafts header), since the view has three columns; the detail pane stays. The sweep runs from the Marketing button click (`openMarketing`), not from live reloads. There is no `POST /api/drafts`: drafts are made by the CLI. A waiting (`approved`) draft shows a `Send now` button that calls the same send route. Editing a text field saves on change (blur); the page's `reloadHeld` already holds reloads while typing.

- T-013.6: `Cli.run` returns a promise of the exit code for an async command (`mail sweep`) and a number otherwise; `bin/doit.js` awaits it. `draft add` prints `Draft <id>` and the mail; `mail sweep` prints one `Reply from <name>: <subject>` line per reply and a summary line, exits 1 on a mailbox error, and prints `Mail is not set up` (exit 0) with no account.

- T-013.5: the root has `makeMarketing(options)` (one `MarketingDb`, the `ContactBook` and the `Mailroom` over it) beside `makeContacts` (which now takes an optional `db`) and `makeMailroom`; `makeMailroom` takes `ports` to swap account, sender, mailbox or random in tests.
- T-013.5: `approveAndSend` also takes an `approved` draft that waited for the cap and sends it; the cap-wait result is the draft itself, still `approved`. Drafts come back with `contactName` and `to` added. `edit` with only `personal` refills the template (subject and body are replaced); with a subject or body it stores the text as given. A reply whose Message-ID is missing is logged without a `ref`, so it cannot be deduped. `status()` is async (it reads the account); with no account `cap` is 20.

- T-013.4: header decoding (`decodeHeader`, `parseMessageHeaders`) is pure and lives in `domain/mail.js`, not the store; `headers()` returns `from` as the bare address (original case), `date` as an ISO UTC string (`""` if unparsable; the Mailroom takes the local day) and `messageId`, `inReplyTo` with their angle brackets (In-Reply-To is the first id).
- T-013.4: `session` returns `{ok: true, value}` (the callback's result) or `{ok: false, error}`; only IMAP and network errors become results, a bug in the callback still throws. `move`, `copyByMessageId` and `select` name a missing mailbox as `Mailbox <name> not found`. `ImapMailbox` also takes `timeoutMs`. The test responses are inline in `test/imap.test.js` in Gmail's format, no fixture files.

- T-013.3: `SmtpSender.send(account, {from, to, text})` takes the envelope addresses and `composeMail`'s text; it also takes a `timeoutMs` option (default 30 s) so a test of the timeout is fast. QUIT is best effort after the mail is accepted (waits at most 1 s) so it cannot turn a sent mail into a failure.
- T-013.3: `MailAccount.read()` is async (the Keychain read is); `run(cmd, args)` resolves to stdout or null on failure.

- T-013.2: `SqliteContacts.close()` stays and closes the shared `MarketingDb` (older tests and the profiles test call it); the root builds one `MarketingDb` per `makeContacts` call, and mail's `makeMailroom` must reuse the same one.
- T-013.2: a draft's `contact` is the contact id and its `id` is the table's integer id; `created` and `sentAt` are local `YYYY-MM-DDTHH:MM:SS` strings so `sentOn(day)` counts by the local day. `SqliteDrafts.all()` is newest first.
- T-013.2: `editDraft` also takes `personal` (stored as text only; the Mailroom decides whether to refill). Approving is from `draft` only.
- T-013.2: `composeMail` returns `{from, to, messageId, text}`; `To` is the bare address; a subject past 45 bytes of non-ASCII is split into several encoded words.
- T-013.1: `node:child_process` was already in the store's list; the Architecture row now says it is also used for `security`.

## Close audit

## For the standard
