# VS-01 — Bounded Implementation Backlog and Acceptance Gates

**Approved scope:** local/offline candidate only. No production or release acceptance.

| Ticket | Deliverable | Mandatory completion evidence | Gate |
|---|---|---|---|
| VS01-001 | Private repo, immutable owner decision, CODEOWNERS, repo CI and baseline | Repo URL/commit, CI run, ruleset review, no secret exposure | Foundation |
| VS01-002 | Import and qualify r2 source with manifest | Hash, code/data allowlist, dependency/license/security audit, isolated clean tests, no external traffic | Source |
| VS01-003 | Normalize contract index and migration namespace | Routes/entities/states/rights/permission/screen map, no destructive migration | Contract |
| VS01-004 | Specify and implement INV-DA-01/02 below UI | Exact positive decision revision, same-project/proposal binding, atomic transaction, strict DB guard; negative tests: missing/held/rejected/stale/wrong-project/replay/direct DB | Integrity |
| VS01-005 | Controlled synthetic rights-qualified fixtures | Q0/Q1/Q2 record; synthetic numeric import if required; no false WDI rights; no live request | Rights |
| VS01-006 | Integrated local UX (research → review → decision → action) | Browser journey; identities/rights/cutoff visible; valid and denied paths | Workflow |
| VS01-007 | Frozen Decision Record, separate live action status | Immutable exact exported bytes, cited ancestry, recorded cutoff and new timestamped state | Output |
| VS01-008 | Recovery, security and acceptance evidence | Clean serial, negative HTTP/DB, Edge, isolated backup-restore, release manifest, owner usability observation | Qualification |

### Hard acceptance conditions

1. Commitment without a matching exact positive accepted decision must fail at API AND direct database boundary.
2. A proposed action may exist before decision; acceptance of research or decision review is NOT positive disposition.
3. Demonstration must distinguish synthetic/owned positive fixture from archived WDI rights-restricted evidence.
4. Frozen export is a historical decision snapshot; current action state explicitly separately timestamped.
5. Local operator identity must not be called institutional reviewer/approver assurance.
6. The research-to-decision user journey must run in browser without manipulating the DB manually.
7. No fresh product release until independent qualification + separate owner release acceptance.

Out-of-scope issues must go to `docs/plan/FUTURE_SCOPE.md` and cannot sneak into VS-01 PRs.
