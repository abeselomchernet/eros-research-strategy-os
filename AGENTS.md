# EROS — Binding instructions for all coding agents and engineers

Read `README.md`, `docs/freeze/OWNER_DECISION_2026-10-23.md`, `docs/freeze/CANONICAL_ARCHITECTURE_BASELINE_v1_0.md`, `docs/plan/VS01_BACKLOG.md`, and `docs/engineering/CHANGE_CONTROL.md` **before working**.

## Mandatory rules

1. The active owner-approved scope is **bounded VS-01 personal, local, offline implementation**. Do not generalize into full EROS v1.1, cloud, commercial release, PSS data, AI, live providers, D3, institution credentials, or unrestricted T3.
2. L4 is preserved as accepted historical recovery baseline. C1-r3/r1/r2 remain unaccepted candidate evidence. Never overwrite original sources, archives, logs or approval records.
3. Use r2 selectively, but never treat historical `/api/v1` staged institutional contracts as connected to local `/api` automatically. Preserve identities, rights, review semantics and provenance.
4. Every engineering change: approved ticket → branch → tests/negative cases → PR with evidence → owner review where required → merge. No direct push to protected main. Avoid broad rewrites.
5. Required invariant: proposed actions can predate decisions; commitments cannot predate an **explicit positive decision revision** authorizing the matching proposal. Enforce at service AND DB boundary, atomically.
6. Never label operator-entered rights as legal permission. Synthetic and WDI capture lanes must not be conflated. No uncontrolled network fetch or embedded secret.
7. Never call a frozen decision record a current executive operating report; preserve revision cutoff, action state timestamp and user-visible caveat.
8. Do not claim institutional segregation, independent reviewer identity, security certification, licensing, compliance, live ingestion, accepted production or 23 delivered screens.
9. Source provenance, migration namespace collisions (e.g. 010), G-gate collisions, and S-23/W-23 ambiguity require explicit crosswalks; never choose silently.
10. Stop and request a recorded owner change decision for outside-scope functionality or architecture drift. An assistant output, failing CI or unapproved ADR does not silently change the baseline.

Before ending each task, leave a concise resume note with branch/commit, scope, modified paths, tests executed/results, failures, TODO, risks, decision gates, and NEXT ONE TASK. Do not burn credits restating the entire project history.
