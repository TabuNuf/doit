#!/bin/sh
# Called by the Doit launcher applet (launcher/Doit.applescript). Updates the
# code with a fast-forward `git pull` when it safely can, starts `node bin/server.js` in the background, and prints the
# server's process id for the applet to stop it with later.
#
# Everything goes to server.log in the data folder, overwritten on each
# launch. The applet shows the end of that file if startup fails.
#
# Exit codes: 0 started (pid on stdout), 2 Node.js not found.
set -u

cd "$(dirname "$0")/.." || exit 1

# Same folder src/root.js (dataDir) resolves on a Mac.
DATA_DIR="${DOIT_HOME:-$HOME/Library/Application Support/Doit}"
LOG="$DATA_DIR/server.log"
mkdir -p "$DATA_DIR"
echo "Doit launcher, $(date)" > "$LOG"

# Update. Only on a tree with no uncommitted changes to tracked files, only
# as a fast-forward, never prompting for a password, and given up after 20
# seconds so an offline machine still starts promptly.
if [ -z "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]; then
  if GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=5" \
       perl -e 'alarm 20; exec @ARGV' git pull --ff-only >>"$LOG" 2>&1; then
    echo "git pull done." >>"$LOG"
  else
    echo "git pull failed or timed out; starting the current code." >>"$LOG"
  fi
else
  echo "Uncommitted changes in the project folder; git pull skipped." >>"$LOG"
fi

# An app started from Finder gets a minimal PATH, without Homebrew or nvm.
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin "$HOME/.volta/bin"; do
    [ -x "$d/node" ] && PATH="$d:$PATH"
  done
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install it from https://nodejs.org and try again." >>"$LOG"
  exit 2
fi

echo "Starting $(command -v node) bin/server.js" >>"$LOG"
nohup node bin/server.js </dev/null >>"$LOG" 2>&1 &
echo $!
