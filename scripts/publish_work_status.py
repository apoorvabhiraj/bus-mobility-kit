#!/usr/bin/env python3
\"\"\"Publish a privacy-minimized local Git status report to a shared folder.

This is voluntary reporting, not remote inspection or a security guarantee.
It publishes path names and dirty-state metadata, never diffs or file contents.
\"\"\"
import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(repo), *args],
        text=True, stderr=subprocess.STDOUT
    ).strip()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--repo", default=".")
    p.add_argument("--developer", required=True)
    p.add_argument("--out-dir", default="coordination/work-status")
    args = p.parse_args()
    repo = Path(args.repo).resolve()
    branch = git(repo, "branch", "--show-current")
    porcelain = git(repo, "status", "--porcelain")
    paths = sorted({line[3:].strip() for line in porcelain.splitlines() if len(line) > 3})
    report = {
        "developer": args.developer,
        "reported_at_utc": datetime.now(timezone.utc).isoformat(),
        "branch": branch,
        "working_tree_dirty": bool(porcelain),
        "changed_paths": paths,
        "limitations": "Voluntary local report; may be stale or incomplete; no diff/content included."
    }
    out = repo / args.out_dir / f"{args.developer}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    print(f"Wrote {out.relative_to(repo)}")
    print("Review the report for secrets or sensitive path names before committing/publishing.")

if __name__ == "__main__":
    main()
