# Stack decision — Intelligent Bus Mobility & Crowdedness-Aware Journey Planner

Decision: adopt the recommended stack below as the project's application stack.
Status: proposed (awaits `git init` + first task branch before CI/enforcement applies).
Approved by: project human owner.

## Selected stack

| Layer | Selection |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Frontend state | Zustand |
| Backend | Node.js + Express + TypeScript |
| API style | REST + OpenAPI |
| Runtime validation | Zod |
| Database | PostgreSQL |
| ORM / migrations | Prisma |
| JavaScript package manager | pnpm |
| Python package manager | uv |
| Monorepo | pnpm workspaces + Turborepo |
| Unit testing | Vitest |
| API integration testing | Supertest |
| E2E testing | Playwright |
| API compatibility | OpenAPI diff / breaking-change checks |
| CI | GitHub Actions |

## Notes

- Python / `uv` is included in the stack but no Python application surface is defined yet. Keep `uv` only if Python tooling is added; otherwise remove it to avoid an unused lockfile.
- The kit already reserved `pnpm-lock.yaml` / `pyproject.toml` + `uv.lock` as dependency-manifest options and `schemas/contracts/` for versioned shared interfaces. This stack selects the pnpm side of that choice.
- OpenAPI contracts live in `schemas/contracts/` and must be versioned; database changes must be ordered Prisma migrations.

## What still must be done (per SETUP_CHECKLIST.md)

1. `git init` the folder; set `main` as protected default branch.
2. Configure GitHub Ruleset / branch protection: PR required, no direct pushes, no force pushes, at least one independent approval, require all CI status checks.
3. Add real API contracts (OpenAPI) in `schemas/contracts/` + compatibility checks.
4. Add real ordered Prisma migrations + migration tests.
5. Generate authentic `pnpm-lock.yaml` (and `uv.lock` only if Python is used).
6. Add unit, contract, integration, E2E, build and smoke tests wired to CI.
7. Fill in `CODEOWNERS` with real reviewers; add `.github/CODEOWNERS` entries for `schemas/contracts/`, `database/migrations/`, `.github/`, `governance/`.
8. Trial the controls on a non-production branch before relying on them.

## Related

- `ARCHITECTURE.md` — updated with the selected stack.
- `coordination/TASK_REGISTRY.md` — task BUS-001 is the first implementation task; stack selection is its prerequisite.
- `governance/DEPENDENCY_POLICY.md`, `governance/API_CONTRACT_POLICY.md`, `governance/DATABASE_MIGRATION_POLICY.md` — govern changes to this stack going forward.
