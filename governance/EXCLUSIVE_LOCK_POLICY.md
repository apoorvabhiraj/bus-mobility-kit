# Exclusive lock policy

A text file in Git is not an atomic lock. Two agents can race and both believe they own it.

Required lock record:
- resource/path;
- task ID;
- human owner;
- agent/session identifier;
- acquired-at and expiry;
- heartbeat/renewal;
- release status.

Acquire/release must be atomic through a trusted lock service, GitHub App, database transaction, or single serialized maintainer. Expired locks require human review before takeover. Never auto-steal a lock solely because a heartbeat is late.

If no atomic lock service exists, use the safe fallback: one designated maintainer serializes edits to shared files; other agents submit proposed patches without editing those files.
