# Testing strategy

Minimum layers:
- Unit tests for pure functions and module logic.
- Schema validation for API/data contracts.
- Provider/consumer contract tests.
- Database migration tests from clean and supported prior states.
- Integration tests across ingestion, traffic, crowd, and journey modules.
- End-to-end tests for realistic journey requests.
- Build and deployment smoke tests.
- Data-quality tests for missing GPS/ticket fields, incomplete boarding/alighting data, capacity gaps, and time-window sparsity.

Tests must use representative synthetic or approved datasets. Avoid committing personal or sensitive passenger data.
