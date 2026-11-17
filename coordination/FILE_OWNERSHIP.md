# File ownership registry

Fill before implementation. `TBD` means unowned and therefore not authorized for concurrent editing.

| Path / pattern | Primary human owner | Approval required | Notes |
|---|---|---|---|
| schemas/contracts/** | TBD | Both developers | Shared API contracts |
| database/migrations/** | TBD | Both developers | Serialize schema changes |
| package.json, pnpm-lock.yaml | TBD | Dependency maintainer | Only if pnpm is selected |
| pyproject.toml, uv.lock | TBD | Dependency maintainer | Only if uv is selected |
| .github/** | TBD | Both developers | CI and policy |
| ARCHITECTURE.md | TBD | Both developers | Shared architecture |
| coordination/** | Integrator | Integrator | Serialize central records |
