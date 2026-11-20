"""Tokens per Claude session in this project: first-turn context, turns and total, main sessions and sub-agents apart.

Run from the repo root; an optional argument is the number of days back (default 7).
"""
import json, glob, os, re, sys, time, collections, statistics as st
root = os.path.expanduser("~/.claude/projects/" + re.sub(r"[^A-Za-z0-9]", "-", os.getcwd()))
files = glob.glob(root + "/*.jsonl") + glob.glob(root + "/*/subagents/*.jsonl")
cut = time.time() - float(sys.argv[1] if len(sys.argv) > 1 else 7) * 86400
rows = []
buckets = collections.Counter(); bturns = collections.Counter()
for f in files:
    if os.path.getmtime(f) < cut: continue
    sub = "/subagents/" in f
    seen = set(); ctxs = []; out = 0; cc = 0; model = None; compacts = 0
    for line in open(f, errors="replace"):
        try: d = json.loads(line)
        except Exception: continue
        if d.get("isCompactSummary") or d.get("subtype") == "compact_boundary": compacts += 1
        if d.get("type") != "assistant": continue
        m = d.get("message") or {}; u = m.get("usage") or {}
        if m.get("id") in seen or not u: continue
        seen.add(m.get("id")); model = m.get("model") or model
        c = (u.get("input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0)
        if c == 0: continue
        ctxs.append(c); out += u.get("output_tokens") or 0; cc += u.get("cache_creation_input_tokens") or 0
        b = min(c // 50000, 8); buckets[(sub, b)] += c; bturns[(sub, b)] += 1
    if ctxs: rows.append((sub, model, len(ctxs), ctxs[0], int(st.median(ctxs)), max(ctxs), sum(ctxs), compacts, os.path.basename(f)[:8]))
for sub in (False, True):
    r = [x for x in rows if x[0] == sub]
    print("SUB" if sub else "MAIN", "sessions", len(r), "turns", sum(x[2] for x in r), "ctx-tokens processed", sum(x[6] for x in r))
    print("  first-turn ctx: median", int(st.median(x[3] for x in r)), "min", min(x[3] for x in r), "max", max(x[3] for x in r))
    print("  median turns/session", int(st.median(x[2] for x in r)), "max", max(x[2] for x in r), " median peak ctx", int(st.median(x[5] for x in r)), "max peak", max(x[5] for x in r))
    for b in range(9):
        if bturns[(sub, b)]: print(f"   ctx {b*50:>3}-{b*50+50}K: turns {bturns[(sub,b)]:>5}  tokens {buckets[(sub,b)]:>12}")
print("top 12 sessions by processed tokens")
for x in sorted(rows, key=lambda x: -x[6])[:12]:
    print("  ", "sub " if x[0] else "main", x[1], "turns", x[2], "first", x[3], "median", x[4], "peak", x[5], "total", x[6], "compacts", x[7], x[8])
