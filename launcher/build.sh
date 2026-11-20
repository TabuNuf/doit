#!/bin/sh
# Builds "Doit.app" next to this script, a stay-open AppleScript
# applet with this project folder's path written into it. Run it again if
# you move the project folder. The .app is gitignored.
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
project="$(cd "$here/.." && pwd)"
src="$here/Doit.applescript"
out="$here/Doit.app"
tmp="$(mktemp -t doit-launcher)"

# Escape the path for an AppleScript string literal (backslash and quote),
# then substitute it for __PROJECT_DIR__.
perl -pe 'BEGIN { $d = shift; $d =~ s/([\\"])/\\$1/g } s/__PROJECT_DIR__/$d/g' "$project" "$src" > "$tmp"

chmod +x "$here/start-server.sh"
rm -rf "$out"
osacompile -s -o "$out" "$tmp"
rm -f "$tmp"
echo "Built: $out"
