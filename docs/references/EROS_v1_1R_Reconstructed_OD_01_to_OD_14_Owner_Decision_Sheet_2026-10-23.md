# EROS — Reconstructed OD-01–OD-14 Owner Design Decision Sheet v1.1-R

**Status:** RECONSTRUCTED FROM SAVED STAGE 2 ADDENDUM — NOT THE MISSING ORIGINAL DECISION SHEET  
**Date prepared:** 23 October 2026  
**Authority:** Proposed design decisions only. **All actual owner dispositions remain OPEN**.  
**Parent source SHA-256:** `e587ad6baefa63333e67480dd00b343f8a5ee4d3c12a6d5ae21ec3031328c723`  
**Addendum SHA-256:** `4f29324ab74fdc4a55824c07ef51ed48e29f729e2df08d440b419d7d77c35189`  
**Candidate v1.1-R SHA-256:** `77f439acbaabd1249d9adae268bc0679b2874985499067d66a0a6a2b035f06e7`

## Explicit boundaries

A design-only approval, should the owner later grant one, would NOT accept local-backend-r2 or authorize engineering, testing, source ingestion, identity changes, cloud deployment, publication, licensing or external institutional use. L4 retains its bounded historical accepted status. No decision is inferred from this generated sheet.

## Decisions for explicit owner review

| ID | Decision subject | Advisor recommendation | Actual owner choice (OPEN) | Owner redline / condition | Decision record reference |
|---|---|---|---|---|---|
| OD-01 | EROS independent product identity | APPROVE AS DESIGN | **OPEN** | — | — |
| OD-02 | Separate module/register/lifecycle/release namespaces | APPROVE AS DESIGN | **OPEN** | — | — |
| OD-03 | PSS-style public assurance registers | AMEND | **OPEN** | — | — |
| OD-04 | Canonical IA | AMEND | **OPEN** | — | — |
| OD-05 | Screen inventory and consolidation | APPROVE AS DESIGN | **OPEN** | — | — |
| OD-06 | VS-01 product increment | AMEND | **OPEN** | — | — |
| OD-07 | Local stack / r2 reuse | APPROVE AS DESIGN | **OPEN** | — | — |
| OD-08 | Action sequence and authorization | AMEND | **OPEN** | — | — |
| OD-09 | Source rights / local review assurances | AMEND | **OPEN** | — | — |
| OD-10 | Challenge to earlier “B+E” preference | APPROVE AS DESIGN | **OPEN** | — | — |
| OD-11 | Final r2 release provenance / acceptance | DEFER | **OPEN** | — | — |
| OD-12 | Future data/provider/AI access | DEFER | **OPEN** | — | — |
| OD-13 | Institutional/cloud environment | DEFER | **OPEN** | — | — |
| OD-14 | Implementation authorization boundary | APPROVE AS DESIGN | **OPEN** | — | — |

## Advisor rationale and precise preconditions (not approved)

**OD-01 — EROS independent product identity.** Recommended: APPROVE AS DESIGN. Maintain standalone intelligence, research and strategy OS; no PSS/CAD/Enawuga/Model 6 data or schema merger

**OD-02 — Separate module/register/lifecycle/release namespaces.** Recommended: APPROVE AS DESIGN. Keep original M IDs, R01–R07 assurance, R0–R7 research stages, G2 public registries, eight r2 record kinds, S and W screens separate

**OD-03 — PSS-style public assurance registers.** Recommended: AMEND. Retain only explicitly generalized, defensibly sourced assurance semantics; provenance of any borrowed historical patterns marked unresolved; no PSS licences/certificates imported

**OD-04 — Canonical IA.** Recommended: AMEND. **Replace** Evidence-first with six-destination **Intelligence-first** shell, plus Workspace utility (§2)

**OD-05 — Screen inventory and consolidation.** Recommended: APPROVE AS DESIGN. Preserve S-00–S-22, keep W-23 as proposed wireframe; implement panels only as justified; no fake S-24

**OD-06 — VS-01 product increment.** Recommended: AMEND. Adopt narrowed, source-rights-qualified decision/action journey with two independently reported fixture paths (§7)

**OD-07 — Local stack / r2 reuse.** Recommended: APPROVE AS DESIGN. Candidate-only local modular monolith / Node / PGlite; accepted L4 remains separate; future qualification, no r2 promotion

**OD-08 — Action sequence and authorization.** Recommended: AMEND. Adopt enforceable **INV-DA-01** typed positive decision, transaction and DB guard—not UI-only—and INV-DA-02

**OD-09 — Source rights / local review assurances.** Recommended: AMEND. Add Q0–Q2 fixture qualification, per-use rights, explicit unverified identity and delivery-rights drift (§4)

**OD-10 — Challenge to earlier “B+E” preference.** Recommended: APPROVE AS DESIGN. Prefer **bounded local integrated slice**, not an undefined B+E bundle, subject to concrete future implementation alternatives and gates

**OD-11 — Final r2 release provenance / acceptance.** Recommended: DEFER. Full commit, clean manifest, r1 comparison, final tests and owner release acceptance separate; Stage 2 design research may proceed

**OD-12 — Future data/provider/AI access.** Recommended: DEFER. Preserve domain contracts for future work, **HOLD** acquisition, claims of approved licences and AI execution

**OD-13 — Institutional/cloud environment.** Recommended: DEFER. Separate business/security/legal/deployment authorization; mock G-stage OIDC is not current L4 institutional identity

**OD-14 — Implementation authorization boundary.** Recommended: APPROVE AS DESIGN. **Affirm** that none is granted by this addendum or owner design approval; new separately scoped written authorization required

## Four critical architecture-choice checks

- **OD-04 navigation:** Owner explicitly chooses A3 intelligence-first IA or records a specific alternative. Do not leave conflicting navigation trees as equally canonical.
- **OD-08 action authorization:** Owner decides INV-DA-01/02 typed positive disposition, exact proposal version, atomic commitment, DB-level enforcement and rejection of generic bypass—or specifies an equally enforceable substitute.
- **OD-06 / OD-09 fixture and rights:** Owner chooses a controlled synthetic/owned local positive path with Q0/Q1/Q2 qualifications and a separate restricted archived-WDI lane. Numeric synthetic fixture-loader remains future engineering.
- **OD-06 frozen-output meaning:** Owner decides first slice delivers the Frozen Decision Record with separately timed current-action UI, or explicitly widens scope to future atomic `brief_package_v1` under a new engineering/design gate.

## Owner decision record (left unexecuted)

```text
EROS document adopted (exact filename): ______________________
Reconstructed v1.1-R hash adopted: ___________________________
Owner/decision-maker reference: _____________________________
OD-01: OPEN        OD-02: OPEN        OD-03: OPEN
OD-04: OPEN        OD-05: OPEN        OD-06: OPEN
OD-07: OPEN        OD-08: OPEN        OD-09: OPEN
OD-10: OPEN        OD-11: OPEN        OD-12: OPEN
OD-13: OPEN        OD-14: OPEN
Date and authenticated decision reference: __________________
Redlines / exceptions / dissent: ___________________________
Authority conferred: DESIGN ONLY / NONE / separately specified
Implementation authorization: NONE
Release acceptance: NONE
Provider/live acquisition/deployment authorization: NONE
```

## Separate qualification blockers

R2 final commit and source-to-package manifest, stale inherited SHA256SUMS, r1 comparator, clean qualification tests, owner r2 release acceptance, synthetic indicator fixture service, licensed external source access, institutional identity/deployment, and full EROS M01–M15 delivery remain outside the effect of a design-only owner decision.

**STOP FOR OWNER REVIEW.**
