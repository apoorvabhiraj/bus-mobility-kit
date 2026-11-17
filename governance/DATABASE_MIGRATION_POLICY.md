# Database migration policy

- One migration framework and one canonical migration directory.
- Migrations are immutable after merge; corrections use a new migration.
- Every migration has an ordered unique identifier.
- CI applies all migrations to a clean database and tests upgrade from the supported prior version.
- Concurrent migrations touching the same tables/columns require serialized review and rebase.
- Destructive changes require explicit approval, backup/rollback plan, and staged deployment strategy.
- Never edit production schema manually without recording a corresponding migration.
