# Atomic lock service requirements

The included kit documents locking but does not implement a distributed lock server.

A real service must provide:
- atomic acquire-if-unowned operation;
- unique lock token;
- resource/path and task ID;
- owner identity;
- lease expiry and heartbeat;
- compare-and-release using the lock token;
- audit log;
- stale-lock recovery requiring authorization;
- authenticated access and least privilege.

A plain file committed to Git is not sufficient for race-free locking. Until a service exists, serialize shared-file edits through one maintainer.
