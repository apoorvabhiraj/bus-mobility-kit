# API contract policy

- Contracts live in `schemas/contracts/`.
- Select one canonical format (e.g. OpenAPI or JSON Schema) before implementation.
- Every breaking change requires a versioning/deprecation plan and approval from affected module owners.
- CI validates syntax, generated clients where applicable, and backward compatibility against the target branch.
- Provider-specific implementation details must not leak into shared contracts.
- Backend/frontend contract tests are required.
- A green schema linter alone does not prove semantic compatibility.
