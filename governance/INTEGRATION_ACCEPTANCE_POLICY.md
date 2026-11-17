# Integration acceptance policy

A PR is mergeable only when:
1. no unresolved Git conflict exists;
2. task scope and ownership checks pass;
3. required reviews are approved;
4. API contract validation passes;
5. DB migration validation passes;
6. dependency/lockfile checks pass;
7. unit, integration and relevant E2E tests pass;
8. typecheck, lint and build pass;
9. target branch is current or merge queue has validated the merge result.

After merge, run deployment smoke tests and monitor errors. Passing checks prove only that configured checks passed for the tested commit/environment.
