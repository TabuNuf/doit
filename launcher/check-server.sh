#!/bin/sh
# Does a server on the board's port run the code that is checked out now?
# Exit 0: yes. 1: nothing answers. 3: a server answers on another commit (or none reported).
# DOIT_PORT overrides 4317, as for bin/server.js.
cd "$(dirname "$0")/.." || exit 1
PORT="${DOIT_PORT:-4317}"
reply=$(curl -s --max-time 1 "http://localhost:$PORT/api/version") || exit 1
running=$(printf '%s' "$reply" | sed -n 's/.*"commit":"\([0-9a-f]*\)".*/\1/p')
current=$(git rev-parse HEAD 2>/dev/null)
[ -n "$running" ] && [ "$running" = "$current" ] && exit 0
exit 3
