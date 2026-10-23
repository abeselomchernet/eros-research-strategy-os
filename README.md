# EROS — Governed Engineering Workspace (VS-01)

**Status:** OWNER-DIRECTED bounded implementation kickoff; **NOT a product release**.  
**Repository:** intended private `abeselomchernet/eros-research-strategy-os` (creation and push NOT YET EXECUTED).  
**Source state:** governance starter only. The r2 application source must be admitted as an explicit reviewed import, not copied blindly.  
**Controlling decision:** [`docs/freeze/OWNER_DECISION_2026-10-23.md`](docs/freeze/OWNER_DECISION_2026-10-23.md) and [`docs/freeze/CANONICAL_ARCHITECTURE_BASELINE_v1_0.md`](docs/freeze/CANONICAL_ARCHITECTURE_BASELINE_v1_0.md).

The approved *direction* is an Ethiopia-first evidence-governed intelligence and research operating system (M01–M15 preserved), delivered first through a narrow local/offline evidence → research → review → positive decision → authorized action → Frozen Decision Record journey (VS-01). The team must reuse and correct existing engineering, not rewrite by default.

## Source of truth (in descending order)

1. Current dated owner decision and explicitly approved bounded scope.
2. Frozen architecture baseline and locked artifacts/hash register.
3. Accepted L4 v0.4.0 provenance (recovery baseline) and observed candidate source/contract evidence.
4. Versioned accepted ADRs and implementation tickets with tests.
5. Historical blueprints and proposed UI/UX: requirements evidence, not unrestricted implementation authority.
6. AI research reports: secondary, never a substitute for code, logs, tests, and owner acceptance.

A new engineer or coding agent **MUST** read `AGENTS.md`, the two frozen decision files, `docs/plan/VS01_BACKLOG.md`, `docs/engineering/CHANGE_CONTROL.md`, and `docs/engineering/BASELINE_PROVENANCE.md` before editing.

## Source-reference copies

The full reconstructed v1.1-R architecture, reconstructed OD review sheet, Stage 2 parent report and challenge addendum are in `docs/references/` as **immutable historical sources**. Their presence does not itself approve a release; the owner decision and bounded baseline above control.

## Engineering policy

- `main` is protected where account features permit; use a short-lived branch and reviewed PR.
- Every PR links to an approved VS-01 task, an acceptance case, and current evidence; architecture changes need a new approved ADR.
- CI is **not** release certification. This starter only checks repository governance; import and qualify application tests separately.
- No real provider acquisition, confidential/customer data, PSS institutional records, cloud deployment, OIDC production, AI, external sharing or D3.
- No automatic release promotion. The owner expressly decides release acceptance after independent qualification.
- Do not amend or overwrite frozen decision files. New owner decisions become new append-only records, with newly computed digests.

## Activation

1. Create a **new private GitHub repository** (do not reuse `v-macro-indicator-studio` or another unrelated repo).
2. Commit this starter **alone** to the new repo, run Governance CI, and configure PR/review rules according to available GitHub plan features.
3. Import the verified r2 application source into `app/` in a separate branch **after** secret, license, fixture, generated-file and rights scanning.
4. Establish a fresh source manifest and clean local test baseline; record failures honestly.
5. Implement VS-01 incrementally on protected PR branches; owner accept only after independent tests and the full browser journey.

No push or repository creation is claimed by these files.
