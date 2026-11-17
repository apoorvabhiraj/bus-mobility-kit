# Agent permission policy

- Agents receive least-privilege credentials.
- Agents work on task branches, not `main`.
- Do not give coding agents repository-admin or ruleset-bypass permissions.
- Require human approval for secrets, production access, releases, migrations, shared contracts and dependency policy exceptions.
- Instructions are not enforcement. Use branch protections, CI, CODEOWNERS, protected environments and server-side checks.
- A malicious or misconfigured agent with broad credentials can bypass local conventions; restrict credentials accordingly.
