# Architecture status

This document is a starting point, not an implemented architecture.

Logical modules:
1. Data ingestion and validation.
2. GPS trajectory processing and travel-time estimation.
3. Ticketing/passenger processing and occupancy estimation.
4. Route/stop/schedule graph.
5. Journey optimization.
6. API and user interface.
7. Monitoring, evaluation, and data-quality reporting.

Shared interfaces must be versioned in `schemas/contracts/`.
Database changes must be ordered migrations.
No module may silently invent another module's API or data semantics.

## Selected stack (see docs/STACK_DECISION.md)

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

The kit's dependency-manifest placeholders (`pnpm-lock.yaml`, `pyproject.toml` + `uv.lock`) resolve to the pnpm side of that choice; `uv` is retained only while Python tooling is actually used.
