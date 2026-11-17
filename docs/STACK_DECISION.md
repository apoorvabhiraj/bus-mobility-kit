# Stack decision — Intelligent Bus Mobility & Crowdedness-Aware Journey Planner

Decision: adopt the recommended stack below as the project's application stack.
Status: adopted (git repository initialized, feature/BUS-001-infrastructure integrated, monorepo verified).
Approved by: project human owner.

## Selected stack

| Layer | Selection |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Frontend state | Zustand |
| Backend | Node.js + Express + TypeScript |
| API style | REST + OpenAPI 3.1.0 |
| Runtime validation | Zod |
| Database | PostgreSQL |
| ORM / migrations | Prisma |
| JavaScript package manager | pnpm (v12 workspaces) |
| Python package manager | uv (reserved for offline batch data pipelines) |
| Monorepo | pnpm workspaces (`packages/*`) |
| Unit testing | Vitest |
| API integration testing | Supertest |
| E2E testing | Playwright |
| API compatibility | OpenAPI 3.1.0 validation & breaking-change checks (`scripts/check-openapi-compatibility.js`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

## OpenAPI Contract Structure Decision

### Decision: Hybrid Gateway + Modular Domain Contracts (Standardized on OpenAPI 3.1.0)

We evaluated two architectural approaches for contract management:
1. **Single Monolithic Contract**: Merging all endpoints (GPS ingestion, passenger load estimation, time-series, and journey planning) into one large YAML document.
2. **Purely Segregated Contracts**: Maintaining completely independent specifications with distinct data models and no canonical consumer contract.

**Adopted Decision**: A **Hybrid Gateway Architecture with Unified OpenAPI 3.1.0 Versioning**:
- **Canonical Unified Gateway Contract (`schemas/contracts/journey-api-v1.yaml`)**:
  - The single source of truth for application clients (`packages/frontend`) and backend service implementations (`packages/backend`).
  - Combines multimodal transit routing with Problem 1 GPS travel-time distributions (`p50DurationMinutes`, `p90DurationMinutes`, `trafficDelayMinutes`) and Problem 2 crowdedness load proxy metrics (`overallCrowdingLevel`, `peakCrowdingLevel`, `averageOccupancyProxy`, `standingLikelihood`, `dataCaveatNotice`).
  - Exposes `/health`, `/journeys/plan`, `/stops`, and `/routes/{routeId}/metrics`.
- **Specialized Problem Domain Contracts**:
  - **Problem 1 Engine (`schemas/contracts/travel-time-openapi.yaml`)**: Standalone specification for DTC bus GPS trace analysis and travel-time estimation (`/journey/travel-time`).
  - **Problem 2 Engine (`schemas/contracts/crowdedness-api.yaml`)**: Standalone specification for e-ticketing issuance proxy analysis, route-segment occupancy proxies, and load time-series (`/crowdedness/estimate`, `/crowdedness/route-summary`, `/crowdedness/time-series`, etc.).
- **Universal OpenAPI 3.1.0 Standard**:
  - All contracts upgraded and unified to OpenAPI 3.1.0.
  - Aligns with modern JSON Schema 2020-12 specifications (e.g. type arrays replacing legacy `nullable: true`).
  - Duplicate YAML server definitions resolved.
- **Automated Monorepo Enforcement**:
  - `pnpm contract:check` validates all specifications in `schemas/contracts/` against OpenAPI 3.1.0 syntax and verifies composite schema completeness.
  - Enforced in `.github/workflows/ci.yml` on all PRs and pushes to `main`.

## Monorepo & Pipeline Structure

- **Workspaces**: `packages/backend` (`@delhi-transport/backend`) and `packages/frontend` (`delhi-journey-planner-frontend`).
- **Scripts**:
  - `pnpm install`: installs and locks all workspace dependencies.
  - `pnpm typecheck`: runs `tsc --noEmit` across backend and frontend packages.
  - `pnpm lint`: runs type-level lint verification across all packages.
  - `pnpm test`: runs full Vitest test suites (15 tests: 12 backend + 3 frontend).
  - `pnpm build`: builds backend (`tsc`) and frontend (`tsc && vite build`).
  - `pnpm contract:check`: verifies all OpenAPI contracts.
  - `pnpm dev`: parallel development mode for backend and frontend.

## Related

- `ARCHITECTURE.md` — updated with the selected stack and system topology.
- `schemas/contracts/README.md` — complete specification of contracts, endpoints, and governance labels.
- `coordination/TASK_REGISTRY.md` — task tracking and ownership.
- `governance/DEPENDENCY_POLICY.md`, `governance/API_CONTRACT_POLICY.md`, `governance/DATABASE_MIGRATION_POLICY.md` — govern changes going forward.
