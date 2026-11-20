#!/usr/bin/env python3
"""Claude Code PreToolUse hook: refuses a whole read of a large text file.

Every turn re-sends what was read, so a 100 KB file read whole rides along for the
rest of the session. Wired in .claude/settings.json for the Read and Bash tools.
Exit code 2 blocks the call and shows the message to Claude.
"""
import json
import os
import re
import shlex
import sys

LIMIT = 40 * 1024
BINARY = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".ipynb", ".psd"}
OWN = (os.path.realpath(os.path.expanduser("~/.claude")) + os.sep,)
SCRATCH = re.compile(r"/tmp/claude-\d+/")
CAT = re.compile(r"(?:^|[;&|(\n])\s*cat\s+([^;&|<>\n]*)([|>]?)")


def too_big(path, cwd):
    """True when the path is a text file over the limit."""
    if not os.path.isabs(path):
        path = os.path.join(cwd, path)
    if os.path.splitext(path)[1].lower() in BINARY or claude_own(path):
        return False
    try:
        return os.path.isfile(path) and os.path.getsize(path) > LIMIT
    except OSError:
        return False


def claude_own(path):
    """True for Claude's saved tool output and scratchpad: already ranged, refusing costs a turn."""
    real = os.path.realpath(path)
    return real.startswith(OWN) or bool(SCRATCH.search(real))


def refuse(path, how):
    """Blocks the call with the way out."""
    kb = os.path.getsize(path) // 1024 if os.path.isfile(path) else 0
    sys.stderr.write(
        f"read_guard: {path} is {kb} KB; a whole read is refused over {LIMIT // 1024} KB. "
        f"Find the part first (grep -n '^## \\|^### ' for a document, Grep for code), then {how}.\n"
    )
    sys.exit(2)


def main():
    try:
        call = json.load(sys.stdin)
    except ValueError:
        return
    tool = call.get("tool_name")
    args = call.get("tool_input") or {}
    cwd = call.get("cwd") or os.getcwd()
    if tool == "Read":
        path = args.get("file_path") or ""
        if not args.get("limit") and too_big(path, cwd):
            refuse(path, "Read it with offset and limit")
    elif tool == "Bash":
        for m in CAT.finditer(args.get("command") or ""):
            if m.group(2):
                continue
            try:
                words = shlex.split(m.group(1))
            except ValueError:
                words = m.group(1).split()
            for path in (w for w in words if not w.startswith("-")):
                full = path if os.path.isabs(path) else os.path.join(cwd, path)
                if too_big(full, cwd):
                    refuse(full, "print a range with sed -n 'A,Bp'")


if __name__ == "__main__":
    main()
