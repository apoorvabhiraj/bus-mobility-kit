# Universal Agent Instructions

## Mandatory bootstrap
Before editing:
1. Read `AGENTS.md`, `SOUL.md`, `PROJECT.md`, `ARCHITECTURE.md`, `CURRENT_STATUS.md`, relevant governance policies, and the assigned task.
2. Fetch the latest remote state and inspect relevant branches and open PRs.
3. Run `git status --short --branch`; inspect `git diff` and `git diff --cached`.
4. Check task ownership, permitted paths, dependencies, shared contracts, and active locks.
5. Request the other developer's latest work-status report for relevant shared files. A missing report means **unknown**, not "no changes".
6. Do not begin if ownership is ambiguous or a shared-file lock cannot be acquired.

## Scope and ownership
- Work only on the assigned task and authorized paths.
- One accountable human owner per task.
- One active editor/agent per file at a time.
- Treat shared contracts, migrations, root manifests, lockfiles, CI, and architecture docs as protected shared resources.
- Never overwrite, reset, stash, rebase, or amend another person's work without explicit authorization.
- Never infer that remote Git state includes another developer's uncommitted local work.

## Changes
- Use a dedicated task branch and isolated worktree.
- Keep PRs small and focused.
- Shared API/schema/database/dependency changes require a design note and designated human approval.
- Do not independently regenerate shared lockfiles.
- Do not modify ownership records to authorize your own work.

## Before push / PR
- Inspect complete staged and unstaged diffs.
- Run format, lint, type checks, unit tests, relevant contract/migration tests, integration tests, and build.
- Fetch the target branch and check mergeability.
- Publish an updated work-status report.
- Report checks actually run; never claim a check passed if it was not run.

## Agent honesty
- `AGENTS.md` is an instruction file, not a security boundary.
- If a tool cannot read this file, stop and tell the human.
- Never claim zero conflicts, zero bugs, or complete integration correctness.
- Report unknowns, uncommitted work visibility gaps, and test limitations.
