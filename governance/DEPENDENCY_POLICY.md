# Dependency and lockfile policy

- Choose package managers per ecosystem and commit genuine lockfiles.
- One designated dependency maintainer owns shared manifest/lockfile updates.
- Dependency changes must be isolated in their own PR where practical.
- CI checks lockfile consistency using the actual package manager.
- Pin or constrain versions according to project policy; review transitive dependency changes.
- Never hand-edit lockfiles.
- Do not commit placeholder lockfiles as if they were valid.
