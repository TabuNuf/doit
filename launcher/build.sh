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

# App icon: render icon.svg with Quick Look, scale it into an iconset and
# replace the applet's default icon.
work="$(mktemp -d -t doit-icon)"
qlmanage -t -s 1024 -o "$work" "$here/icon.svg" >/dev/null 2>&1
png="$work/icon.svg.png"
set="$work/Doit.iconset"
mkdir "$set"
for s in 16 32 128 256 512; do
  sips -z "$s" "$s" "$png" --out "$set/icon_${s}x${s}.png" >/dev/null
  sips -z "$((s * 2))" "$((s * 2))" "$png" --out "$set/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$set" -o "$out/Contents/Resources/applet.icns"
rm -rf "$work"
# osacompile also writes Assets.car with the default script icon, and CFBundleIconName
# makes macOS prefer it over applet.icns; drop both so the logo shows.
rm -f "$out/Contents/Resources/Assets.car"
/usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$out/Contents/Info.plist" 2>/dev/null || true
# The new icon breaks osacompile's ad-hoc signature, so sign again.
codesign --force --sign - "$out" 2>/dev/null
touch "$out"
echo "Built: $out"
