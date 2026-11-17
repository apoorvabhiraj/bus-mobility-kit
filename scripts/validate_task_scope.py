#!/usr/bin/env python3
"""Starter scope checker.

Expected task manifest: JSON with `allowed_paths` list.
Usage: python scripts/validate_task_scope.py task.json
This checks changed paths against a simple allowlist. It is not an authorization
boundary unless task manifests are protected and validated server-side.
"""
import json, subprocess, sys
from pathlib import Path
from fnmatch import fnmatch

def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: validate_task_scope.py TASK_MANIFEST.json")
    manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    allowed = manifest.get("allowed_paths", [])
    if not allowed:
        raise SystemExit("FAIL: allowed_paths missing or empty")
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", "origin/main...HEAD"], text=True
    ).splitlines()
    denied = [p for p in changed if not any(fnmatch(p, pat) for pat in allowed)]
    if denied:
        print("FAIL: paths outside task scope:")
        print("\n".join(denied))
        raise SystemExit(1)
    print(f"PASS: {len(changed)} changed path(s) within declared scope")

if __name__ == "__main__":
    main()
