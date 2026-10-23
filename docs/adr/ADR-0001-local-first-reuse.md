# ADR-0001 — Local-first bounded modular reuse

- **Status:** ACCEPTED FOR VS-01 DESIGN by owner directive EROS-OWNER-2026-10-23-01.
- **Decision:** Use Node ESM + PGlite and targeted r2 reuse for personal/offline slice, preserve accepted L4 as rollback baseline. Institutional React/TypeScript/PostgreSQL Option C direction remains future/conditional.
- **Why:** Strong existing candidate contract/recovery evidence and minimum integration risk. Avoid full stack rewrite.
- **Tradeoff:** No present institutional identity/multiuser guarantee; future migration may require adapters.
- **Alternatives rejected now:** wholesale Option C restart, new microservices, forced immediate React conversion.
- **Reversal:** Separate owner ADR/decision and migration/acceptance study.
