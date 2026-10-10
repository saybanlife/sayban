#!/usr/bin/env python3
"""Search the local Cursor profile conversation history for the Sayban project.

Usage:
  python scripts/cursor-history.py --list
  python scripts/cursor-history.py --search "یادآور"
  python scripts/cursor-history.py --show 56            # by search-index rowid
  python scripts/cursor-history.py --show d8df3b09       # by conversation id prefix
  python scripts/cursor-history.py --profile C:/Cursor-Profile-2

Read-only everywhere. Never writes to the Cursor profile.
"""
import argparse
import datetime
import json
import os
import sqlite3
import sys

DEFAULT_PROFILE = os.environ.get("CURSOR_PROFILE", "C:/Cursor-Profile-2")


def connect(profile):
    base = f"{profile}/User/globalStorage"
    search = sqlite3.connect(f"file:{base}/conversation-search.db?mode=ro", uri=True)
    state = sqlite3.connect(f"file:{base}/state.vscdb?mode=ro", uri=True)
    return search, state


def sayban_convos(state):
    """Return [(composer_id, title, updated_at)] for conversations tracking this repo."""
    cur = state.cursor()
    cur.execute("SELECT composerId, value FROM composerHeaders")
    out = []
    for cid, val in cur.fetchall():
        try:
            d = json.loads(val)
        except Exception:
            continue
        repos = d.get("trackedGitRepos") or [{}]
        repo = (repos[0] if repos else {}).get("repoPath", "") or ""
        if "sayban" in repo.lower():
            out.append((cid, d.get("name", "") or "(untitled)", d.get("lastUpdatedAt") or 0))
    out.sort(key=lambda r: -(r[2] or 0))
    return out


def cmd_list(args, search, state):
    convos = sayban_convos(state)
    sc = search.cursor()
    sc.execute("SELECT fts_rowid, id FROM conversations")
    id_to_fid = {r[1]: r[0] for r in sc.fetchall()}
    print(f"{'date':17} {'rowid':>6} {'chars':>7}  title")
    for cid, title, ts in convos:
        fid = id_to_fid.get(cid)
        n = 0
        if fid is not None:
            sc.execute("SELECT length(c1) FROM conversation_fts_content WHERE id=?", (fid,))
            row = sc.fetchone()
            n = row[0] if row else 0
        when = datetime.datetime.fromtimestamp((ts or 0) / 1000).strftime("%Y-%m-%d %H:%M")
        print(f"{when:17} {str(fid or '-'):>6} {n:>7}  {title}")


def cmd_search(args, search, state):
    sc = search.cursor()
    q = f"{args.match}" if args.match else args.search
    sql = (
        "SELECT rowid, title, snippet(conversation_fts, 1, '⟨', '⟩', ' … ', ?) "
        "FROM conversation_fts WHERE conversation_fts MATCH ? ORDER BY rank LIMIT ?"
    )
    sc.execute(sql, (args.tokens, q, args.limit))
    rows = sc.fetchall()
    if not rows:
        print("no matches")
        return
    for rid, title, snip in rows:
        print(f"[{rid}] {title}\n    {snip}\n")


def cmd_show(args, search, state):
    sc = search.cursor()
    rid = args.show
    if not rid.isdigit():
        sc.execute("SELECT fts_rowid, title FROM conversations WHERE id LIKE ?", (f"{rid}%",))
        row = sc.fetchone()
        if not row:
            sys.exit(f"no conversation with id prefix {rid!r}")
        rid, title = row[0], row[1]
    else:
        rid = int(rid)
        sc.execute("SELECT c0 FROM conversation_fts_content WHERE id=?", (rid,))
        row = sc.fetchone()
        title = row[0] if row else "?"
    sc.execute("SELECT c1 FROM conversation_fts_content WHERE id=?", (rid,))
    body = sc.fetchone()
    print(f"### {title}\n")
    print(body[0] if body else "(no body)")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--profile", default=DEFAULT_PROFILE, help="Cursor profile root")
    p.add_argument("--list", action="store_true", help="list Sayban conversations")
    p.add_argument("--search", help="full-text query (implicit AND of terms)")
    p.add_argument("--match", help="exact phrase query, quoted")
    p.add_argument("--show", help="show full body by rowid or conversation-id prefix")
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--tokens", type=int, default=24, help="words per search snippet")
    args = p.parse_args()

    try:
        search, state = connect(args.profile)
    except sqlite3.OperationalError as e:
        sys.exit(f"cannot open Cursor profile at {args.profile}: {e}")

    if args.list:
        cmd_list(args, search, state)
    elif args.search or args.match:
        cmd_search(args, search, state)
    elif args.show:
        cmd_show(args, search, state)
    else:
        p.print_help()


if __name__ == "__main__":
    main()
