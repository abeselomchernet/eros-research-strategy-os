# ADR-0002 — Positive decision before action commitment

- **Status:** ACCEPTED AS MANDATORY DESIGN REQUIREMENT; implementation pending.
- Action proposal may exist ahead of a decision.
- An exact, immutable, positive/accepted decision revision must authorize that exact proposal **before** commitment.
- Service AND database transaction enforce it atomically; wrong-project, stale, negative/held/rejected, absent or mismatched authorizations must fail closed.
- Separate research acceptance, decision review, action authority, completion and outcome verification. Preserve history and define effects of revised/revoked decisions.
- Authorize an engineered solution under VS01-004 with tests; no claim existing r2 already implements this.
