# Contract Index — Authoritative/Implemented/Proposed Boundaries

| Domain | Existing candidate evidence | VS-01 change | Owner gate |
|---|---|---|---|
| Source/indicator | L4 `/api/sources`; r2 source-contracts and archived WDI | Preserve source IDs, provenance and rights disclaimers | Offline only |
| Evidence/rights | r2 evidence_refs and versioned rights determinations | Clearly split permission evidence from operator-entered statuses | VS01-005 |
| Research | r2 questions/revisions/review events | Browser usability, exact versions, counterevidence | VS01-006 |
| Decisions | r2 versioned decision memo | Typed positive disposition and action authorization reference | VS01-004 |
| Actions | r2 `proposed→decided→completed→outcome_verified` | `decided` must become semantically bound to exact positive decision revision, service + DB transaction | VS01-004 |
| Exports | r2 frozen exports and hashes | Frozen Decision Record only; current action separate timestamp | VS01-007 |
| Institutional assurance | Historical G3–G8 staged RLS/OIDC APIs | NO automatic integration into local API | D3 HOLD |

M01–M15 / R01–R07 / S-00–S-23 / W-23 / OC-G vs PKG-G / C and P milestones are separate namespaces. No migration `010_strategy_workspace` should reuse r2's actual `010_local_backend.sql` number.
