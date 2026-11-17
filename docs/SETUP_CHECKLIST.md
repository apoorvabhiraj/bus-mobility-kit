# Setup checklist

## Repository and GitHub
- [ ] Choose `main` as the protected default branch.
- [ ] Configure a GitHub Ruleset / branch protection: PR required, no direct pushes, no force pushes.
- [ ] Require at least one independent approval.
- [ ] Require all CI status checks.
- [ ] Require conversation resolution.
- [ ] Require branch up-to-date / merge queue if available.
- [ ] Disable admin bypass where operationally possible.
- [ ] Add and validate `.github/CODEOWNERS`.
- [ ] Restrict workflow permissions to least privilege.

## Collaboration
- [ ] One task, one human owner, one branch.
- [ ] Separate worktree for each concurrently active agent.
- [ ] File/path allowlist recorded for every task.
- [ ] Protected shared files have named owners.
- [ ] Shared-file edits use an atomic lock service or serialized maintainer workflow.
- [ ] Work-status report published before and after work.
- [ ] Missing/stale report treated as unknown state.

## Engineering
- [ ] Select backend/frontend/database/package managers.
- [ ] Add real API contracts and compatibility checks.
- [ ] Add real ordered database migrations and migration tests.
- [ ] Generate authentic lockfiles with the selected package managers.
- [ ] Add unit, contract, integration, E2E, build and smoke tests.
- [ ] Test CI on a non-production branch.
- [ ] Make only validated checks required.

## Operational
- [ ] Define lock expiry, renewal, release and abandoned-lock recovery.
- [ ] Define who can grant exceptions.
- [ ] Define rollback and incident process.
- [ ] Review bot permissions and secrets exposure.
- [ ] Never place secrets, tokens, full diffs, or sensitive data in status reports.
