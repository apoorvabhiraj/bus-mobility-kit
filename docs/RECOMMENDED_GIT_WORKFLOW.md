# Recommended Git workflow

1. Human assigns task and allowed paths.
2. Agent bootstraps, fetches, inspects, and checks the latest work-status reports.
3. Agent obtains exclusive lock for any protected shared file. If no atomic lock service exists, shared-file edits are serialized by the designated maintainer.
4. Agent works in its own branch and worktree.
5. Agent runs local checks and publishes a fresh status report.
6. Agent opens a small PR.
7. CI validates scope, contracts, migrations, dependencies, tests and build.
8. Independent human reviews the diff and shared-resource impact.
9. Merge queue or up-to-date branch validation tests the merge result.
10. After merge, run smoke tests and monitor.
11. Release shared locks and update task/handoff records.

Never interpret "git status clean" as proof that another developer has no local changes.
Never interpret "mergeable" as proof of runtime correctness.
