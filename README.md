# Intelligent Bus Mobility & Crowdedness-Aware Journey Planner
## Multi-agent collaboration and integration enforcement kit

This is a **governance and CI starter kit**, not a completed application and not a zero-risk guarantee.

It is designed for two developers using multiple interchangeable AI coding agents in one GitHub repository.

### What it can enforce (after setup and validation)
- PR-only changes to protected branches.
- Task-scoped file ownership checks.
- API/schema and database migration validation hooks.
- Dependency/lockfile consistency checks.
- Required automated tests and build checks.
- Explicit review for sensitive shared files.
- A voluntary local-work status reporting protocol.

### What it cannot guarantee
1. **Private uncommitted work:** GitHub cannot inspect another developer's private working tree, unsaved editor buffers, or unpushed changes. The included `publish_work_status.py` can publish a report only when the developer voluntarily runs it. It reports paths/status metadata, not source contents. A developer can omit or falsify a report unless additional endpoint-management controls exist.
2. **No bugs:** No test suite, AI reviewer, static analyzer, or human review can prove that all possible bugs have been eliminated for a non-trivial application.
3. **Zero Git conflicts:** No workflow can guarantee that conflicts will never occur. This kit aims to detect conflicts, prevent unresolved conflicts from merging, and reduce overlap through ownership, short-lived branches, and serialized shared-file changes.

### Important setup warning
The GitHub workflows are templates. Review and adapt them to the actual stack before making them required checks. The project has not yet selected or implemented its final application stack. Do not treat placeholder scripts as complete API, database, security, or integration validation.

### First setup
1. Copy this kit into the project repository.
2. Choose the stack and real package managers.
3. Replace placeholder test commands in `.github/workflows/ci.yml`.
4. Implement and test the API contract, migration, and integration validators.
5. Configure GitHub Rulesets / branch protection on `main`; require the actual status-check names.
6. Configure CODEOWNERS and at least one independent reviewer.
7. Have both developers publish work-status reports before starting shared-file work and before opening PRs.
8. Trial the controls on a non-production branch before relying on them.

See `docs/IMPLEMENTATION_STATUS.md` and `docs/SETUP_CHECKLIST.md`.
