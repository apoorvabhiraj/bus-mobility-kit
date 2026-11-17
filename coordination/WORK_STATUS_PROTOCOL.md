# Local work-status reporting protocol

GitHub cannot see another developer's private uncommitted changes.

Each developer should run `python scripts/publish_work_status.py --repo . --developer <id>`:
- before starting a task;
- before editing a protected/shared path;
- before opening a PR;
- after finishing or abandoning work.

The report contains branch, timestamp, dirty-state flag, and changed path names only. It does not contain diffs or file contents. Treat reports as voluntary and potentially stale. If a report is missing or older than the agreed freshness window, mark local state UNKNOWN and ask the developer.

For genuine near-real-time visibility, both developers must use a managed shared development environment or an approved telemetry/lock service. A local script cannot remotely inspect another person's computer.
