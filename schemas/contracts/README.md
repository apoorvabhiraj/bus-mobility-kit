# OpenAPI Contracts Architecture & Specifications

This directory houses the versioned OpenAPI specifications for the Intelligent Bus Mobility & Crowdedness-Aware Journey Planner.

All specifications conform to **OpenAPI 3.1.0** (standardized across the monorepo).

## Contract Hierarchy

```
schemas/contracts/
├── journey-api-v1.yaml          # Canonical Unified Gateway / BFF Contract (OpenAPI 3.1.0)
├── travel-time-openapi.yaml     # Problem 1 Domain Service Contract (OpenAPI 3.1.0)
└── crowdedness-api.yaml         # Problem 2 Domain Service Contract (OpenAPI 3.1.0)
```

### 1. Canonical Unified Gateway Contract (`journey-api-v1.yaml`)
- **Role**: Primary contract between the frontend web client (`packages/frontend`) and the backend REST service (`packages/backend`).
- **OpenAPI Version**: `3.1.0`
- **Endpoints**:
  - `GET /health` (or `/api/v1/health`): Service health, uptime, database connection state.
  - `POST /journeys/plan`: Composite journey planning combining multimodal routing, percentile travel times (Problem 1), and passenger crowdedness proxies (Problem 2).
  - `GET /stops`: Transit stop lookup and spatial proximity search.
  - `GET /routes/{routeId}/metrics`: Route performance metrics, hourly speed profiles, and crowdedness distribution.
- **Reconciliation Features**:
  - Reconciles Problem 1 metrics: `p50DurationMinutes`, `p90DurationMinutes`, `trafficDelayMinutes`, `historicalConfidenceScore`, `gpsObservationCount`.
  - Reconciles Problem 2 metrics: `overallCrowdingLevel`, `peakCrowdingLevel`, `averageOccupancyProxy`, `standingLikelihood`, `occupancyProxyWarningLabel` (`"Ticket issuance proxy estimate; boarding/alighting counts are approximated."`).

### 2. Problem 1 Domain Engine Contract (`travel-time-openapi.yaml`)
- **Role**: Standalone domain contract for GPS trace ingestion, segment speed calculation, and percentile travel-time estimation.
- **OpenAPI Version**: `3.1.0` (upgraded from 3.0.3, duplicate server block removed)
- **Primary Endpoint**: `POST /journey/travel-time`
- **Output**: Travel-time distributions, confidence ratings, and segment durations.

### 3. Problem 2 Domain Engine Contract (`crowdedness-api.yaml`)
- **Role**: Standalone domain contract for e-ticketing issuance ingestion, route-segment passenger load estimation, and time-series crowdedness queries.
- **OpenAPI Version**: `3.1.0` (upgraded from 3.0.3, OpenAPI 3.1 nullable types reconciled)
- **Primary Endpoints**: `/crowdedness/estimate`, `/crowdedness/route-summary`, `/crowdedness/time-series`, `/crowdedness/health`, `/crowdedness/metadata/routes`, `/crowdedness/metadata/segments`.
- **Governance Requirement**: Strictly tags estimates as *demand/crowding proxies* due to ~3-4% e-ticket sample coverage without exhaustive boarding/alighting sensors.

## Architectural Decision: Modular Domain Contracts with Unified Gateway

We adopted a **Hybrid Gateway + Domain Model**:
1. **Unified Application Gateway Contract**: Applications (`packages/frontend` and `packages/backend`) bind to `journey-api-v1.yaml` to avoid client-side orchestration overhead and to provide unified journey options with synchronized travel time and crowdedness data.
2. **Modular Domain Contracts**: `travel-time-openapi.yaml` and `crowdedness-api.yaml` remain standalone domain contracts for individual service boundaries (GPS processing engine vs e-ticketing load modeling engine), enabling independent evolution, specialized batch processing, and testing.
3. **Unified OpenAPI 3.1.0 Specification**: All contracts use OpenAPI 3.1.0 for JSON Schema 2020-12 alignment, uniform tooling, and consistent type validation across the workspace.

## Automated Verification

Run contract validation across all specifications:

```bash
pnpm contract:check
```

Validation is executed by `scripts/check-openapi-compatibility.js` and enforced in CI on every push and pull request.
