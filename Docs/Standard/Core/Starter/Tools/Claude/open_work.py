#!/usr/bin/env python3
"""Lists the work in flight in this repo: epic worktrees, unmerged epic branches,
uncommitted files in the main checkout.

Wired as a Claude Code SessionStart hook in .claude/settings.json, so every session
starts knowing what else is open; its output goes into the session's context.
Also run by hand: python3 Tools/Claude/open_work.py
Rule in <Docs>/Standard/Core/01-Tasks.md, Parallel work.
"""
import datetime as dt
import os
import pathlib
import subprocess
import sys

SHOWN_PATHS = 5
STALE_DAYS = 7


def git(*args, cwd, strip=True):
    result = subprocess.run(["git", *args], cwd=cwd, text=True, capture_output=True)
    if result.returncode != 0:
        return None
    return result.stdout.strip() if strip else result.stdout


def dirty(cwd):
    out = git("status", "--porcelain", cwd=cwd, strip=False) or ""
    return [line[3:] for line in out.splitlines() if line.strip()]


def describe_dirty(paths):
    shown = ", ".join(paths[:SHOWN_PATHS]) + (", ..." if len(paths) > SHOWN_PATHS else "")
    return f"{len(paths)} uncommitted ({shown})"


def last_commit_age(branch, cwd):
    stamp = git("log", "-1", "--format=%ct", branch, cwd=cwd)
    if not stamp:
        return None
    return (dt.datetime.now() - dt.datetime.fromtimestamp(int(stamp))).days


def branch_state(branch, base, cwd):
    """'N commits not on main, last commit D days ago', plus a stale mark."""
    ahead = git("rev-list", "--count", f"{base}..{branch}", cwd=cwd) or "?"
    age = last_commit_age(branch, cwd)
    text = f"{ahead} commits not on {base}"
    if age is not None:
        text += f", last commit {age} days ago"
        if age > STALE_DAYS:
            text += " (stale?)"
    return text


def main():
    start = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    common = git("rev-parse", "--path-format=absolute", "--git-common-dir", cwd=start)
    here = git("rev-parse", "--show-toplevel", cwd=start)
    if not common or not here:
        return  # not a git repo: nothing to report
    main_root = pathlib.Path(common).parent.resolve()
    here = pathlib.Path(here).resolve()
    base = "main" if git("rev-parse", "--verify", "--quiet", "main", cwd=main_root) else "master"

    lines = []
    worktree_branches = set()
    path = branch = None
    porcelain = (git("worktree", "list", "--porcelain", cwd=main_root) or "").splitlines() + [""]
    for line in porcelain:
        if line.startswith("worktree "):
            path = pathlib.Path(line.split(" ", 1)[1]).resolve()
        elif line.startswith("branch "):
            branch = line.split(" ", 1)[1].replace("refs/heads/", "")
        elif line == "" and path:
            mine = "  <- this session" if path == here else ""
            if path == main_root:
                parts = []
                if branch != base:
                    parts.append(f"on '{branch}', not {base}")
                if path.exists():
                    files = dirty(path)
                    if files:
                        parts.append(describe_dirty(files))
                if parts:
                    lines.append(f"- main checkout {path}: {'; '.join(parts)}{mine}")
            else:
                worktree_branches.add(branch)
                parts = [branch_state(branch, base, main_root)] if branch else ["detached HEAD"]
                if not path.exists():
                    parts.append("missing on disk (git worktree prune)")
                else:
                    files = dirty(path)
                    if files:
                        parts.append(describe_dirty(files))
                lines.append(f"- {branch or '(detached)'} in worktree {path}: {'; '.join(parts)}{mine}")
            path = branch = None

    unmerged = git("branch", "--list", "epic/*", "--no-merged", base, "--format=%(refname:short)", cwd=main_root) or ""
    for name in unmerged.splitlines():
        if name and name not in worktree_branches:
            lines.append(f"- {name}, no worktree: {branch_state(name, base, main_root)}")

    repo = main_root.name
    if not lines:
        print(f"Open work in {repo}: none beyond {base}.")
        return
    print(f"Open work in {repo} (Core/01-Tasks.md, Parallel work):")
    print("\n".join(lines))
    print("Name this to the designer before starting anything beside it, and start only on their yes. "
          "Continuing the open work this session started in needs no yes.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # a hook must never block a session from starting
        print(f"open_work.py failed: {error}", file=sys.stderr)
