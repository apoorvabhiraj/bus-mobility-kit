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
