# Implementation status and limits

| Control | Included here | Still required |
|---|---|---|
| Agent instructions | AGENTS.md, SOUL.md | Configure each agent to load them |
| File ownership | Policy + sample CODEOWNERS | Fill in real owners and enforce in CI |
| Exclusive locks | Protocol | Implement a trusted atomic lock service or bot |
| Local work visibility | Reporting script | Both developers must run it; cannot inspect private machines |
| API contracts | Directory + policy | Choose OpenAPI/JSON Schema/Protobuf and add real contracts |
| DB migrations | Policy + placeholder directory | Choose DB/migration tool and add real migrations |
| Dependencies | Policy | Choose stack and generate authentic lockfiles |
| Git conflicts | PR workflow guidance | Configure rulesets; conflicts can still occur |
| Agent compliance | Instructions + scope checker | Agent bootstrap integration and protected permissions |
| Integration correctness | CI template | Add real tests and meaningful test data |

## Three impossible guarantees

### Reveal all uncommitted private work
Impossible from GitHub alone. Uncommitted changes exist only on the developer's machine. A voluntary report can disclose changed paths and state, but it can be stale, omitted, or falsified. Stronger visibility requires both developers to work in managed/shared workspaces or use approved endpoint-management/telemetry. Do not upload source code or secrets in status reports.

### Prove all possible bugs are eliminated
Not realistically achievable for this application. Testing, static analysis, type systems, fuzzing, review, and runtime monitoring reduce risk; they do not prove absence of every bug. Formal verification can prove specific properties under explicit assumptions, not the entire system's correctness.

### Guarantee zero Git conflicts
Impossible in general. Concurrent edits can conflict. The practical guarantee is narrower: do not merge unresolved conflicts; serialize protected-file changes; require up-to-date branches and CI; resolve conflicts explicitly and re-run tests.

## Correct acceptance language
Use: "All configured required checks passed for this commit."
Do not use: "Bug-free", "conflict-free forever", "all private work detected", or "100% safe".
