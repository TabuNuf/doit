# EPIC-017: Live updates

Status: Active
Goal: A change Claude or Tabu makes anywhere shows on the open page within about a second, with no refresh.
Design: Design.md, section Tasks (Live updates)

## Scope

- Decided: the server watches with `fs.watch` (recursive, FSEvents on macOS) and pushes to the page with server-sent events on `GET /api/events`. No packages, no WebSocket.
- Decided: watched are each registered project's docs folder, the docs folder of each epic worktree (`EpicWorktrees.find`), and the app's data folder (settings, `activity.log`, later `marketing.db`).
- Decided: events are debounced (300 ms) into one `changed` message, so a git checkout or an epic close that writes many files gives one reload.
- Decided: the watch list is rebuilt when the settings file changes (a project added) and when a project's worktree list changes, so a new project or a new epic worktree is watched without a restart.
- Decided: the message carries no detail; the page reloads what it shows (board, Claude view, the open doc when not editing). The board view is cheap enough to reload whole.
- Decided: the page's own writes also come back as `changed`; the extra reload is accepted rather than tracked.
- Decided: the 10-second poll is removed. On connect the server sends `changed` once, so a page that lost the server reloads when it reconnects (`EventSource` retries by itself).
- Decided: a reload is held while a text field or textarea has focus, while dragging, and while a menu or new-item form is open; it runs when that ends. A focused select, checkbox or radio no longer holds it. A held reload is one pending flag, not a queue.
- Decided: `HttpServer` gets the watcher as a port (`subscribe(listener) → unsubscribe`), so the server never imports the store; the root wires `ChangeWatcher` in. `close()` ends open event streams and stops the watcher.

## Tasks

- [x] T-017.1 Architecture: `ChangeWatcher` in the module list and class diagram, the changes port on `HttpServer`, the 10 s reload gone from the `web/events.js` line (done when: Architecture.md shows both and `test/boundaries.test.js` passes)
- [x] T-017.2 Store: `store/changeWatcher.js`, `ChangeWatcher` over `SettingsFile` and `EpicWorktrees`: watches the folders above, debounces, rebuilds its list on a settings or worktree change, `subscribe` and `close` (done when: tests in a temp `DOIT_HOME` see one event for three quick writes, an event for a file in a project added after start, and none after `close`)
- [x] T-017.3 Server and root: `GET /api/events` as `text/event-stream`, `changed` on connect and on every watcher event, streams ended on `close()`; `makeServer` builds the watcher (done when: a server test reads `changed` on connect and again after a task is written through the `Board`)
- [x] T-017.4 Web: `EventSource` in `events.js`, the 10 s `setInterval` removed, a pure `reloadHeld(state, active)` in `state.js` and a pending flag that reloads when the hold ends (done when: web tests cover the hold for a text input, textarea, drag and open menu, and no hold for a select or checkbox)
- [ ] T-017.5 Launcher check and docs: `check-server.sh` and the stay-open app unaffected by the open stream; Design.md's Data and Running it sections still true (done when: `test/launcher.test.js` passes and, in the app, `doit set doit/T-017.5 state=progress` moves the row within a second)

## Test plan

- Batch A: T-017.1 to .3 (docs, store, server, root): development
- Batch B: T-017.4 to .5 (web, launcher): development
- Performance: none

## Check in play

- T-017.4: with a dropdown just used and focus still on it, a CLI change shows within a second.
- T-017.4: typing in a task's description, a CLI change waits and shows when the field loses focus; the typed text is kept.
- T-017.5: `doit set doit/T-017.5 state=progress` in the terminal moves the row within a second.
- T-017.5: change a task's state from the terminal and watch the row move; edit a Design doc from the terminal with the Docs view open and see it re-render.
- T-017.5: quit and restart the server with the page open; the page reconnects and reloads once.

## Notes

Decisions and deviations, newest first.

- 2026-11-21, checked in a browser on the epic's server (port 4318): a CLI state change reloaded the page within 1.5 s; with a dropdown focused, a CLI comment showed within 1.5 s; with the description box focused, a CLI comment waited and showed when focus left. Reconnect after a server restart not checked by hand.
- Open: 12 projects are registered, some inside Unity projects; only their docs folders are watched, so Unity's Library churn never fires.

## Close audit

## For the standard
