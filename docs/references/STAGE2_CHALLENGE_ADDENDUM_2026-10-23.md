# EROS — Stage 2 Final Design Challenge and Owner Decision Readiness Addendum

**Project:** MASTER END-PRODUCT ARCHITECTURE  
**Date:** 23 October 2026  
**Status:** **INDEPENDENT DESIGN-CHALLENGE ADDENDUM — OWNER REVIEW REQUIRED; NO OWNER APPROVAL OR IMPLEMENTATION AUTHORITY**  
**Parent:** *EROS — Canonical End-Product Architecture and Controlled Implementation Strategy: Owner-Review Candidate*, 23 October 2026  
**Scope:** Critical corrections A–E; not a reissue of Stage 1 inventories or the complete Stage 2 document. No tests, programs, connectors, migrations, package builds, or deployments were executed.

## Evidence key and authoritative boundaries

The references below are **exact archive-relative primary-source paths**, not internet citations. Prefixes `RC:` refer to `repeat-candidate-r2.zip`; `UX:` refer to members under `EROS_v1_1_UI_UX_Design_Study/` in `EROS_v1_1_UI_UX_Design_Study.zip`; `OG:` refer to members under `Ethiopia Research Strategy OS/` in `Ethiopia Research Strategy OS.zip`. The parent report's P01–P18 register is incorporated **without treating that report as a replacement for primary evidence**.

- **OG/P01:** `10_Blueprints/Archives/Ethiopia_Research_Strategy_OS_Blueprint_Review_Package_v1_1.zip!01_Blueprint_v1_0.docx`, §04 (M01–M15) and §§02, 05–10 (user jobs, source, economics, sector intelligence, markets and product work).
- **OG/P02:** same nested package `!02_Blueprint_Completion_Addendum_v1_1.docx` (research-to-decision completeness, management/knowledge workflows).
- **OG/P03:** `30_Approved_Architecture/Archives/EROS_Option_C_Engineering_Package_v1_0.zip!EROS_Option_C_Implementation_Architecture_v1_0.docx` (Option C as approved architecture direction, not a deployed integrated system).
- **RC/P08:** `docs/LOCAL_BACKEND_CONTRACT.md`, §§Versioned command, Evidence and rights, Frozen exports and operations, Validation and response details.
- **RC/P09:** `src/local_backend.mjs`, notably lines 14–22, 24–64, 65–72, 80–98, 99–158; `src/local_backend_routes.mjs`, lines 1–33; `src/l4_personal_browser.mjs` (actual local interface/session boundary).
- **RC/P10:** `postgres/010_local_backend.sql`, notably lines 44–82 (entities) and 83–149 (guards and immutable events).
- **RC/P11:** `docs/REAL_WORLD_BANK_SOURCE_REGISTER.md`; `data/world_bank/SOURCE_MANIFEST.json`; `src/l3_local_research.mjs`; `src/source_contracts.mjs` (the retained WDI evidence and limits).
- **UX/P14:** `02_navigation_and_journeys/01_NAVIGATION_MAP_AND_JOURNEYS.md`; `01_information_architecture/01_DOMAIN_MODEL_AND_HIERARCHY.md` (initial evidence-centric navigation and journeys, including obsolete OIDC assumptions).
- **UX/P15:** `03_screen_inventory/01_SCREEN_REGISTRY_AND_FIELD_DICTIONARIES.md`; `09_r1_corrections/05_SCREEN_REGISTRY_CORRECTIONS_r1.md`; `09_r1_corrections/06_PROTOTYPE_PLAN_PHASE1_r1.md` (S-00–S-22 and W-23; distinct static prototype proposal).
- **UX/P16:** `10_Codex_API_Contract_Verification/05_CAPABILITY_AND_NAVIGATION_RECONCILIATION.md`; `10_Codex_API_Contract_Verification/08_OWNER_DECISION_AND_GATE_RECOMMENDATION.md`; `EROS_UIUX_Independent_Owner_Review_2026-10-22.md` (proposed reconciliation, not owner approval).
- **Stage 2 parent:** §§1–15, specifically §§4.1–4.3, 7.2–7.4, 8, 9, 10.1–10.6, 13–15 and REL-14/REL-15.

**Notation:** [SOURCE CODE VERIFIED] means observed code/SQL, not successful execution. [PRIMARY DOCUMENT VERIFIED] is a primary historical/design document, not present system behavior. [PROPOSED CORRECTION] is normative **only if separately adopted by the owner**. [UNVERIFIED] denotes evidence not available or not sufficient for the claim. “Accepted” on a local record is not authenticated institutional approval.

---

# 1. Five-point independent design challenge: findings and corrections

| Challenge | Stage 2 weakness | Source-grounded challenge | Exact required correction | Severity for canonical design |
|---|---|---|---|---|
| **A: IA** | Economic/financial/policy work placed as many children of **Evidence** | Blueprint M03–M09 are intelligence products, while M01–M02 are evidence infrastructure; Evidence-first menu foregrounds data plumbing over enterprise value [OG/P01 §04; UX/P14] | Elevate **Intelligence** to a first-class destination; separate **Sources & Evidence**; Workspace pinned utility; preserve all M/S/W identifiers | **AMEND** |
| **B: commitment** | UI-level action gate cited as sufficient to represent management sequence | `action proposed→decided` is independently accepted by service and SQL; `decision` contains `action_ref` but not an authorizing disposition [RC/P09 `.validate`, `.write`; RC/P10 event guard] | Add a typed **positive decision disposition** and a **transactionally verified, version-pinned action authorization** at API, service and database layers; reject generic legacy bypass | **BLOCKING SEMANTIC GAP** |
| **C: rights** | “Local PERMITTED” could be mistaken for legally qualified demonstration | Rights are caller-entered and scope/use-specific; WDI terms have potential third-party exceptions [RC/P08 Rights; RC/P11] | Two-track fixtures: genuine archived WDI **restricted evidence path** and **operator-controlled synthetic happy path** with provenance/rights dossier. No fake publisher clearance | **AMEND / FIXTURE GATE** |
| **D: briefing** | Workflow illustration might imply frozen executive brief includes subsequent commitment/outcomes | `.exportFrozen()` pins accepted research/decision lineage; `.collect()` follows decision `action_ref` to *proposed* action revision; later action events are not appended to the immutable export [RC/P09 lines 65–72, 146–158] | Rename current output **Frozen Decision Record**; show current action as separately timestamped live panel; defer cross-object executive snapshot as new development | **AMEND / TRUTH-IN-OUTPUT GATE** |
| **E: completeness** | A successful research/decision demo risks being narrated as a finished EROS | Original M01–M15 expressly includes domain studios and feasibility; present sector/regulatory/media/dossier services not demonstrated [OG/P01; Stage 2 §§4.1, 8, 14] | Publish a module-by-module **preservation and phase map**; constrain VS-01 success to *one integration vertical slice* | **AMEND** |

**Independent decision:** Retain the local modular-monolith direction **as a candidate research/engineering option**, but replace the Stage 2 navigation recommendation, strengthen the action invariant, and narrow the truthful export claim. These are genuine modifications to the parent candidate, not an endorsement of its current §4 or §10 as written.

# 2. A — Intelligence-first canonical navigation and information architecture

## 2.1 Comparison of competing structures

| Structure | Benefit | Architectural cost / failure mode | Judgment |
|---|---|---|---|
| **A0: Parent proposal** — Home + Evidence / Research / Decisions / Output / Platform | Five compact domain groups; easy to reflect the initial UX IA | M03–M09 invisibly buried as “evidence”; poorly communicates strategic-intelligence value and executive return journey | **REPLACE** |
| **A1: Separate macro, financial, market and policy tabs all at top level** | Immediate prominence and short click paths | Seven-plus high-level studios, duplicated controls, many conspicuous empty tabs before real data/services exist; expands with new domains | **REJECT for initial canonical shell** |
| **A2: Role-specific separate researcher and executive product navigations** | Optimizes two personas in isolation | Risk of inconsistent object identities, duplicated workflow logic and need for real multi-actor authorization absent in personal L4; increased navigation complexity | **DEFER role-specific views** |
| **A3: Intelligence-led shared shell** — Home / **Intelligence** / **Sources & Evidence** / Research / Decisions & Feasibility / Briefings; Workspace as utility | Makes original M03–M09 explicit; preserves evidence backbone and end-to-end journey; scales within Intelligence without multiplying main destinations | Requires care not to imply unbuilt Intelligence studios are operable; temporary historical-data-first dashboard may look sparse | **RECOMMEND AS DESIGN** |

Selection rationale: A3 best balances **15 original modules, analyst discovery, researcher provenance, manager/executive consumption, seven future intelligence domains, and bounded present UI**. Group labels express user value; module IDs remain authoritative; components can be reused across roles. In the present personal product, **“Intelligence” means a place to discover available historical intelligence and planned future studios—not a verified daily feed**. [OG/P01 §04; UX/P14; Stage 2 §§4.1–4.3]

## 2.2 Corrected navigation tree (exact identifiers preserved)

```text
PRODUCT PRIMARY NAVIGATION (six destinations)
  HOME — S-01
    Actual local projects, recent notes, source/integrity status;
    future contextual executive briefing, not current daily news

  INTELLIGENCE — visible first domain destination after Home
    Economic Intelligence Studio — M03 — S-12; S-13 as embedded comparison
      Archived WDI indicator browser is bounded present capability;
      macro vintage/quality/scenario functions are future work
    Financial Sector Observatory — M04 — S-19 [FUTURE]
    Regulatory and Policy Intelligence — M05 — S-18 [FUTURE]
    Media and Ecosystem Radar — M06 — [FUTURE; no invented screen ID]
    Market and Institution Intelligence — M07 — S-20 [FUTURE]
    Public Prospect / Partner Discovery — M08 — S-20 shared identity,
      separate assertions/roles [FUTURE]
    Peer Country Lessons — M09 — S-21 [FUTURE]

  SOURCES & EVIDENCE
    Source Registry, versions, rights, issue triage — M01 — S-02, S-03, S-05
    Evidence Library, citations, relationship exploration — M02 —
      S-04 evidence drawer; W-23 read-only lineage projection

  RESEARCH
    Research Workbench — M10 — S-06 projects/questions/notes,
      S-07 claims/hypotheses, S-08 human local review

  DECISIONS & FEASIBILITY
    Product / Opportunity / Feasibility — M11 — S-11 criterion/portfolio;
      S-22 scenario studio [FUTURE]
    Decision and Execution — M12 — S-09 proposed/committed actions;
      S-10 versioned decisions

  BRIEFINGS
    Briefing and Export Centre — M13 — S-14 frozen decision/research
      record, S-15 history/restricted-delivery view (may be a tab)

PINNED UTILITY (outside the six business destinations)
  WORKSPACE & OPERATIONS — M15 — S-00 local unlock;
    S-16 personal settings, S-17 read-only closed-store backup guidance

GLOBAL CONTROL/CONTEXT
  Active project + scope, session assurance (local/unverified),
  last saved/version/conflicts, pinned-source rights markers,
  breadcrumbs and contextual evidence drawer

NOT ACTIVE / NOT IN PRIMARY NAV
  Controlled AI Assistance — M14 — separate future authorization gate
```

**Precise UI rule:** S-00 is an entry gate, **not** a navigable signed-in dashboard. `W-23` remains a **wireframe identifier** until the owner amends the official S-screen registry. M14 is neither lost nor shown as an available assistant. S-13 and S-15 remain preserved identifiers but may render as panels inside S-12 and S-14. M07/M08 reuse an eventual organization identity with **distinct market-role and prospect-role assertions**, not a second duplicate dossier service. [UX/P15; Stage 2 §4.3]

**Availability states:** (i) *available and qualified*, (ii) *candidate backend present but frontend not qualified*, (iii) *design only*, (iv) *on HOLD*. In the executable initial shell, active navigation is **only** to demonstrated interfaces; future studios may appear in a **clearly noninteractive roadmap/catalogue** rather than as enabled operational pages. No mock feeds, “live watch”, institutional login, financial-sector datasets or source connectors are implied. Responsive layouts collapse *subsections*, not module identity. Executives can deep-link from Home to a briefing or decision; researchers can deep-link from an indicator to evidence and research, without role-specific separate products.

**Target navigation versus actual initial build:** the tree is a **full-product IA**; VS-01 is a **case-level journey** reusing S-00/01/02/03/04/06/07/08/09/10/12/14/15 and optionally S-05/W-23, mostly as coordinated panels. Full standalone delivery of 23 screens is **not** a VS-01 prerequisite.

# 3. B — Corrected decision/action state model and enforceable cross-record invariant

## 3.1 Current code reality — material defects

**Existing r2 [SOURCE CODE VERIFIED]:**

1. `action.content` requires `{title,research_ref,owner_claim,due_at,priority,rationale,alternatives,evidence_requirements,risks}`; its `research_ref` must resolve to an **accepted research revision** (`RC:src/local_backend.mjs` lines 24–43). It starts `proposed` and permits `edit→proposed`, `decide→decided`, `complete→completed`, `verify→outcome_verified` (lines 105–112). `completion` and `outcome` evidence are required for corresponding later states (lines 127–128).
2. `decision.content` requires `{title,action_ref,recommendation,alternatives,uncertainties,blockers}`; its `action_ref` can resolve **any valid action version**, not necessarily a proposed one (line 43). It follows draft/submitted/accepted/returned/rejected review states (lines 105–109). It has **no typed `authorize/defer/decline` disposition**.
3. **No reverse cross-record check** exists in `api.write()` when an action receives operation `decide`; `postgres/010_local_backend.sql` lines 101–106 likewise allow an action state transition without consulting decision events. The SQL `backend_event_finalize` (lines 124–141) checks cited evidence, not accepted management authorization. A front-end-only gate can be bypassed through `POST /api/projects/:p/backend/records` or direct database inserts that satisfy present record-local guards.
4. As currently implemented, when transitioning from `proposed`, the application and SQL do **not explicitly require unchanged action content**; the immutable-content check applies only after the previous state ceases to be `proposed`. The canonical contract should prohibit changing the proposal in the same command that purports to approve it.
5. Every `actor_claim` and `owner_claim` is `local_unverified_claim`. Local decision acceptance **cannot** be represented as a verified management signature or external authority. [RC/P08–P10]

## 3.2 Canonical invariant (future development requirement, not current behavior)

**INV-DA-01 — Authorization-before-commitment:** An action `A` in project `P` may transition from exact **proposed revision** `A@vP` to its first **decided/committed revision** `A@vC` **if and only if**, within the **same atomic transaction**, there is **exactly one explicitly selected controlling decision** `D@vD` satisfying all of:

1. `D.project_id = A.project_id = P`, `D.kind = decision`, `D.state = accepted`; the accepted decision is immutable, cited and revision-pinned.
2. `D.content.action_ref = {id:A.id, version:vP}`. No “latest action” inferred reference and no earlier/later proposal substitution.
3. `D` has a **typed, immutable resolution** `AUTHORIZE_ACTION` (not `DEFER`, `DECLINE`, or an empty / natural-language-only recommendation). Reviewer acceptance of a `DECLINE` memo **does not** authorize execution.
4. The transition command explicitly pins `authorizing_decision_ref = {id:D.id,version:vD}`, `expected_proposed_version=vP`, and a stable `request_key`; it cannot silently select among two conflicting memos.
5. The committed action snapshot retains the **exact proposed plan content**; any required change creates a new proposed revision followed by a fresh decision, not a hidden change inside `decide`.
6. An immutable, project-scoped **commitment edge/event** links `A@vC → D@vD → A@vP → accepted research`. Exactly one controlling authorization can be recorded for this particular proposed action revision. A later superseding/reversal decision is a **new explicit event**; it does not mutate accepted ancestry.
7. Existing local-project restrictions, `local_research` rights checks, submission evidence, and unverified actor-assurance labels are retained. `AUTHORIZE_ACTION` in this personal tool means **recorded local case authorization**, not a legally binding institutional spending or operating approval.

**INV-DA-02 — Completion/outcome isolation:** `A@completed` requires a valid committed predecessor plus a `completion` evidence relationship; `A@outcome_verified` requires a completed predecessor plus a separate `outcome` relationship. Evidence of activity does **not** automatically prove results; a local “verified” state remains an **unverified person’s recorded assertion**, not external audit. The current completion/outcome evidence guards are reusable but their ancestry to INV-DA-01 must be preserved. [RC/P08–P10; PROPOSED CORRECTION]

## 3.3 Recommended minimal contract changes (not authorized for implementation)

| Layer | Future design requirement | Concrete implications |
|---|---|---|
| **Decision DTO / API** | Add versioned `resolution: AUTHORIZE_ACTION \| DEFER \| DECLINE` (and optionally selected alternative ID) to **new decision contract version**, frozen on submission; do **not** silently reinterpret old r2 memo content | Historical decision rows lacking `resolution` are **legacy unresolved** and cannot authorize action by inference. Old accepted memo ≠ positive resolution |
| **Dedicated command** | **Proposed** `POST /api/projects/:p/backend/action-commitments` with `{action_id,expected_proposed_version,authorizing_decision_ref:{id,version},request_key,actor_claim,rationale}`; return `{action_id,proposed_version,decided_version,decision_ref,committed_at,actor_assurance}` | One atomic orchestrator; keep existing `/backend/records` for non-commit mutations. This is **NEW ROUTE**, not claimed to exist |
| **Existing generic route** | If `kind=action`, `operation=decide`, reject unless routed through the same authorized service path / proof; choose explicit `COMMITMENT_REQUIRED` 409 error, no UI-specific exemptions | Direct HTTP bypass disabled; `expected_version` and idempotency still enforced |
| **Application service** | Validate exact proposed and accepted decision versions, typed resolution, plan hash equality, rights, project scope, unique controlling link; write event and commitment together | `src/local_backend.mjs` **future modification target**, not present code. Version-pinned lookup must occur in same transaction to avoid TOCTOU |
| **Persistence** | Add **future** append-only `action_commitments` relation with composite project-scoped FKs, unique `(project_id,action_id,proposed_version)`, pinned decision and decided version; enforce existence and resolution through deferred transaction checks/trigger on `action:decided` insert | This closes direct-SQL bypass; current `010_local_backend.sql` provides version/state/immutability but **no cross-record authorization**. Any migration would require separate explicit approval |
| **Lineage/export/UI** | Show `authorization_ref`, decision resolution, the proposal revision actually authorized, actor assurance and any later status in distinct panels | Do not rewrite accepted research/decision; export decision historical ancestry and current action panel separately |
| **Authorization semantics** | Local `actor_claim` cannot become institution-signed decision. Full managerial RBAC, delegated authority and spending limits remain later scope | No misleading “approved by CFO” or “legally binding management authorization” label |

**Database note:** A solely application-level invariant is not sufficient when the existing schema accepts direct event inserts. If a future implementation elects to avoid a separate commitment table, it must implement an equivalently enforceable deferred database check on a **typed, unambiguous, exact revision-pinned link**. A free-text `recommendation` or generic `supports/origin` edge alone is **not** a reliable authorization grant. Prevent circular foreign-key/service dependencies using historical revision references: `decision@accepted → action@proposed`, then `action@decided → decision@accepted`; the revision graph remains acyclic.

## 3.4 Negative tests required later (specified only; NOT run)

- DA-N01 `decide` without a decision; DA-N02 with merely `draft/submitted/returned/rejected` decision; DA-N03 accepted **DECLINE** or **DEFER** decision; DA-N04 accepted legacy decision **without typed resolution**.
- DA-N05 decision referencing another action/version or project; DA-N06 commit stale proposal after an `edit`; DA-N07 choose an unpinned “latest”; DA-N08 decision accepted but changed after acceptance attempted (must fail immutability).
- DA-N09 two conflicting accepted AUTHORIZE memos: the command must explicitly name one; duplicate controlling commitment must fail; DA-N10 concurrent duplicate commands and idempotent retries; DA-N11 reuse same `request_key` with changed payload; DA-N12 plan-content change bundled with commit.
- DA-N13 direct generic POST bypass; DA-N14 direct SQL insert/transaction bypass; DA-N15 completed/outcome states without the appropriate **distinct** evidence or approved commitment; DA-N16 Cross-project evidence or rights HOLD path; DA-N17 crash/rollback between appending decided event and commitment relation must leave **neither** persisted.

**Acceptance must include explicit HTTP negative results, service-level regression, schema-level direct-insert denial, concurrency/idempotency replay and post-restart lineage equality.** Test cases are *future required work*, not retained test evidence.

# 4. C — Legally conservative VS-01 fixture and rights specification

## 4.1 Key distinction: data provenance vs permission

The actual archived WDI packet comprises six ETH/KEN series, 2015–2025, real observed economic records (not synthetic), according to `RC:docs/REAL_WORLD_BANK_SOURCE_REGISTER.md`; its source register cautions that WDI usage and underlying third-party exceptions require checking. No attached file proves blanket reuse, reproduction, external citation or redistribution permission for every component of that particular packet. **Do not infer licence from public visibility, API access, source tier, an archived capture, the World Bank name, or a generic operator-entered PERMITTED status.** [RC/P11]

The r2 record-level rights fields are `{title,evidence_id,intended_use,determination,rationale,decision_at,expires_at}`; `intended_use` is precisely one of `local_research`, `local_export`, `external_citation`, `redistribution`; status is `UNKNOWN`, `HOLD`, `DENIED`, `PERMITTED`. Existing service matches **exact evidence kind + target** for each use, not global ownership or project clearance. Expiry becomes UNKNOWN. For local research UNKNOWN warns, HOLD/DENIED blocks; for frozen local export, **all transitive evidence targets** must have active local `PERMITTED`, and current rights are checked again when retrieving stored Markdown. These controls are **technical** and cannot certify third-party rights. [RC:P08 Evidence and rights; RC:P09 lines 56–64, 146–158]

## 4.2 Mandatory fixture manifest — two distinct lanes

| Fixture ID | Object and exact demonstration use | Origin and custody evidence | Rights disposition / negative constraints |
|---|---|---|---|
| **FX-01** | Archived genuine WDI source snapshots (`snapshot` target `{series_key,capture_utc}`, six ETH/KEN series) for real-source **read and analyse only** | Retained `data/world_bank/SOURCE_MANIFEST.json`, raw byte hashes, dates; no new fetch | Default `local_export=UNKNOWN` unless **source-specific independently checked** terms/exception analysis establishes the intended operation. `external_citation/redistribution=UNKNOWN` pending review. Do **not** force positive export |
| **FX-02** | Operator-authored **clearly artificial** quantitative case series (e.g. `EROS-SYN-ECON-001`, years 2023=100, 2024=110, 2025=`null`, unit “synthetic index”, country/sector label “fictional scenario”) | Original editable source file, fixture manifest hash, creator/source declaration, generation method and timestamp; explicit “not published Ethiopia statistics” marker | Eligible for local `PERMITTED` only on documented **operator-owned/controlled** original material and verified intended use; `external_citation/redistribution` not granted by default. A local assertion is not independent licence verification |
| **FX-03** | Operator-authored research question and note, including hypothesis, competing interpretation and uncertainty, pinned as `note`/`record` references | Authored text version ID/hash, declaration, no institutional data | Local internal research/export may be asserted `PERMITTED` for documented owned materials; independently verified third-party rights status remains N/A/UNVERIFIED as appropriate |
| **FX-04** | Two disagreeing **synthetic** observations or claims to drive `supports` and `contradicts`, `issue` review, and visible unknown | Both original fixture files with conflicting year/unit or time basis recorded, no real publisher impersonation | Contradiction **does not itself change** copyright rights. Source-quality HOLD is distinct from rights HOLD |
| **FX-05** | Exact-version accepted research → proposed action → accepted positive decision → action commitment → frozen decision record | Local records with request/response IDs, case source manifest, decision resolution; all actors labeled `local_unverified_claim` | Positive path only once **all transitive** `local_export` targets have scoped active PERMITTED determinations supported by a documented rights packet; never call it third-party authorization |
| **FX-06** | Negative-rights replay, same or different immutable evidence snapshots | Retain original source/evidence keys for deterministic change | Exercise UNKNOWN, HOLD, DENIED, expiry, local_research vs local_export vs external_citation vs redistribution, revoked-rights download, and rights change not mutating stored hash |
| **FX-07** | Decision/action reversal and temporal replay data | Exact action/decision event versions and event timestamps | Display accepted decision ancestry separate from current action or outcome; no cross-object frozen claims |
| **FX-08** | Negative integrity, identity and cross-project cases | Tampered hash, stale version, changed request key, non-owned target | Fail safely; no escalation of operator claim into verified user or publisher |

**Critical currently missing capability:** r2's `addEvidence(kind='snapshot')` requires an exact `(series_key,capture_utc)` already in `local_research.source_snapshots` **and attached to the project** (RC:`src/local_backend.mjs`, lines 80–88); it does **not** offer a general synthetic indicator-creation HTTP endpoint. Therefore **FX-02 cannot be claimed available in the current personal browser**. A later *authorized, isolated fixture-load mechanism* and service qualification are required for a true synthetic numeric indicator happy path. A shorter positive **owned-note** evidence test can exercise the current note/evidence/export semantics, but must **not be called a demonstrated numeric indicator-source flow**. No fixture was inserted during this read-only review.

## 4.3 Exact fixture-rights qualification packet required for a positive frozen demo

For **every transitive exported target** store in a separate fixture ledger (outside, but traceable to, the r2 rights assertion):

`fixture_id, material_id, source_type(synthetic_original|operator_owned_note|archived_third_party), exact evidence kind+target, source file hash, creator/provenance, creator declaration and basis, underlying third-party components, licence/terms text or URL+retrieval date+version where relevant, permitted operations (view/store/analyse/quote/internal_export/external_citation/redistribute), geographic/audience/medium restrictions, attribution requirement, expiry, reviewer identity and assurance, rationale, qualifying evidence file references, unresolved exceptions, approval scope and timestamp.`

**Qualification levels:** **Q0** unknown or disputed third-party licence → no positive export; **Q1** local operator assertion backed by original fixture/source-control evidence → may authorize a **strictly local synthetic research demo** with clear local-only and unverified assurances; **Q2** independently corroborated licence/authority for the exact intended material and use → eligible for corresponding permitted third-party operation, still not an institution-wide grant. For FX-02/FX-03, “operator original” must be substantiated and third-party assets excluded; do not call Q1 an independently audited legal opinion. The external-source workstream is not used here because no independently evidenced qualifying conclusions from it were supplied.

**Avoid fake permission changes:** Never automatically seed `PERMITTED` simply to pass an export test; never change a genuine WDI snapshot's status to PERMITTED because it appears under an open data label alone; never substitute a source-issue resolution for permission. `HOLD`/`DENIED` must block dependent reuse at the service even when a user manipulates the UI. No external delivery or public-facing executive publication is part of the local demo.

## 4.4 Rights negative scenarios (acceptance fixtures)

R-N01 `UNKNOWN local_research` returns warning; `UNKNOWN local_export` blocks frozen create. R-N02 `HOLD local_research` blocks dependent analytical use but allows investigation and rights recording. R-N03 `DENIED local_export` blocks creation and download. R-N04 `PERMITTED` for local_research only **does not** imply local_export. R-N05 `PERMITTED local_export` does **not** imply external citation/redistribution. R-N06 expiration reverts effective permission to UNKNOWN. R-N07 later HOLD after frozen creation blocks subsequent delivery; original content/hash remains stored and audit-only integrity is separate. R-N08 duplicate evidence spans on same target do not change rights scope; another source target needs its own permission. R-N09 every `record`/`note` wrapper in transitive lineage requires its own correctly scoped status where referenced. R-N10 project or source ownership claim without supporting fixture dossier is reported **UNVERIFIED** to the operator and cannot be presented as independent clearance.

# 5. D — Executive briefing integrity and temporal consistency

## 5.1 Four different truths cannot be flattened

| Layer | Pinning/time | What r2 can truthfully prove | What it cannot prove |
|---|---|---|---|
| **Accepted decision history** | `decision_record_id@accepted_version`, local `created_at` and hashed immutable content | Specific locally accepted memo, its alternatives/uncertainties/actor-claim, exact action proposal ref, supports/counterevidence ancestry | Institutional signed approval or legal permission to execute |
| **Proposed action ancestry** | `decision.content.action_ref = action_id@proposed_version` | Which *proposal* the decision considered (including owner/due/priority assumptions **as then recorded**) | That action was executed, committed or later successful |
| **Current action commitment** | latest action event `@decided_version` with accepted authorizing decision reference **after INV-DA-01 future work** | A separate current local commitment status and event time | Contemporaneous frozen export if not separately snapshotted |
| **Completion and outcomes** | `action@completed`, `action@outcome_verified` and their evidence links | Recorded local completion/outcome assertions with evidence references | External impact assurance or verified causal attribution |

**Time axes [must display separately]:** observation year/period, publisher's dataset `lastupdated`/release or vintage where actually present, local `capture_utc`, evidence/reference creation time, research `analysis_as_of`, decision revision acceptance time, action state-event time, brief/export `exported_at`, and **current rights-check time**. Do not replace them with one unqualified “as of today” stamp. [RC/P09 `.collect`/`.exportFrozen`; RC/P11 source register]

## 5.2 First VS-01 frozen output: allowed claims and explicit exclusions

**Existing candidate output (once actual rights and later acceptance gates pass):** `POST /api/projects/:p/backend/exports` with `{record_id,version,request_key,actor_claim}` freezes an **accepted research or accepted decision revision**. The `manifest` currently contains the accepted root, immutable recorded ancestor revisions, edges, evidence snapshots, local per-use rights decisions **as evaluated at export time**, attribution, limits, `exported_at`, and actor assurance; content is a programmatically escaped Markdown representation of record content plus serialized manifest, **not a curated interactive executive report** (RC:`src/local_backend.mjs` lines 146–154). Exact Markdown SHA-256 persists, and retrieval rechecks **current** local_export rights. [SOURCE CODE VERIFIED]

**Canonical UI label:** **“Frozen Decision Record — locally reviewed, revision [v], exported [UTC]; local actor identity unverified.”** The first VS-01 may truthfully state: *the analyst's cited assessment; the proposed plan's historical vP; the locally accepted decision's literal recommendation/alternatives/uncertainties and explicit positive/negative disposition only once added and qualified; evidence/rights limitations and export timestamp*. It must **not** state inside the frozen bytes that the action was later committed, completed or successful, even if the adjacent live-local action panel displays that progression.

**Do not use the noun “executive brief” without qualification** for the existing export's raw serialized DTO presentation. A composed 5-minute management narrative or multi-object executive pack is additional presentation/snapshot development, not in r2. In VS-01, the S-14 screen may provide a human-readable **briefing view** containing (a) fixed frozen decision artifact + (b) clearly delimited **“Current local action status — separately retrieved at [time], not part of frozen record”**. If generating a shareable standalone one-file executive report that includes both, it needs an explicit future `brief_package` implementation and qualification.

**Rights drift scenario:** At t0 the frozen record may have been created with PERMITTED local_export for every transitive target. At t1 a source permission changes to HOLD or expires. The original stored content/hash/manifest do not change, but the normal content endpoint now returns a rights denial; the **export history can remain discoverable** without leaking controlled content. A historical PERMITTED marker means “local determination at t0,” not “still permitted” at t1. [RC/P09 lines 146–158]

## 5.3 Temporal test table (illustrative event ordering, NOT observed run)

| Event | Immutable record | Correct presentation at and after event |
|---|---|---|
| T0 | Accepted research `R@vR` | “Research locally accepted”; source rights/status separate |
| T1 | Proposed action `A@v1` | “Proposed plan only; not committed” |
| T2 | Accepted decision `D@vD`, referencing `A@v1`, resolution `AUTHORIZE_ACTION` **future field** | “Locally accepted authorization decision”; does not retroactively set action `decided` |
| T3 | Atomic commitment event `A@v2` with `D@vD` authorization **future service/DB** | Separate “Committed locally at T3”; frozen `D@vD` still points to `A@v1` |
| T4 | Frozen decision export of `D@vD` | Historical decision and proposed ancestry only; current status shown separately |
| T5 | `A@completed` and later `A@outcome_verified`, if supported | Different later claims with distinct evidence and times; not inserted into prior frozen Markdown |
| T6 | Local_export rights become HOLD/expire | Old hash and record remain; delivery blocked; export-time vs current-rights visibly distinguished |

## 5.4 Optional future cross-object executive package — explicit separate scope

**NEW DEVELOPMENT (not required to claim the limited VS-01 passes):** `brief_package_v1` requires a single **consistent database read transaction / snapshot token** selecting `{accepted_decision_ref, controlling_action_proposal_ref, authorizing_commitment_ref, selected_action_state_ref, as_of_utc, evidence_set, rights_set, contradiction_set, actor_assurance}`. Version-pin all objects, record which state happened by the snapshot cut-off, include an append-only manifest of hashes, data/rights snapshots, and an independent current-delivery-rights gate. Later action changes must create a **new brief package**, never alter one. Mixed “latest” values from separate asynchronous GET requests are **not** an equivalent atomic snapshot. Optional external distribution needs independently established rights and a separate publishing workflow. [PROPOSED CORRECTION]

# 6. E — Full-product capability and phase preservation map

**Phase labels are proposed architecture/delivery bands, not implementation approvals:** **P0** governance/contract/fixture design; **P1** bounded VS-01 integrated local research-decision slice; **P2** stronger historical economic/indicator intelligence; **P3** richer intelligence *domain records* (not automatic live feeds); **P4** separately authorized providers/connectors, normalisation and qualification; **P5** feasible product/scenario, controlled AI or institution-specific expansions only with independent gates. Work may be reordered on evidence, budget and dependencies; an identifier's inclusion in a later phase is not a commitment to build it.

| Original module | Screens/interaction | P1 VS-01 evidence seam | Preserved full-product growth boundary and proposed phase | Non-completion evidence / acceptance warning |
|---|---|---|---|---|
| **M01 Source Registry & Ingestion** | S-02, S-03, S-05 | Archived snapshots, version/rights/issue triage | Provider registry, licence/method gates, raw capture and review adapters — **P3/P4** | No approved new provider or live acquisition |
| **M02 Evidence & Knowledge Core** | S-04, W-23 | Pinned evidence, rights, contradiction, lineage projection | Cross-domain knowledge relationships, citations, as-of edges — **P2/P3** | r2 links are not a mature semantic graph/graph UI |
| **M03 Macro Indicator Studio** | S-12, S-13 | Real *archived* WDI visual, isolated synthetic fixture if qualified | Economic Intelligence Studio: normalized releases, comparability, revision/vintage, descriptive diagnostics — **P2/P4** | Six archived series are not national macro surveillance |
| **M04 Financial Sector Observatory** | S-19 | Future linked indicator/evidence IDs, no actual sector data | Bank/system measures, sector dictionary, instrument-specific denominators/vintages — **P3/P4** | Not present as verified sector datasets |
| **M05 Policy & Regulatory Watch** | S-18 | Generic research issue/decision path only | Official instrument registry: draft/enacted/effective/repealed, amendment chain — **P3/P4** | Source issue ≠ legal-instrument corpus |
| **M06 News & Ecosystem Radar** | No additional approved screen | Generic evidence/contradiction reuse | Publisher rights, tiered media source registry, events/claims/clusters — **P3/P4** | No news feed or licensed scraping |
| **M07 Competitor & Institution Intelligence** | S-20 | Reuse evidence and provenance only | Organization identities, dated claims, offerings, competitor-dossier projections — **P3/P4** | No active dossier API in r2 |
| **M08 Potential Customer & Partner Discovery** | S-20 shared identity | None beyond generic evidence | Prospect/partner-specific assessment, consent/privacy/business-status evidence — **P3/P5** | Public prospect ≠ customer/partner; no private contacts assumed |
| **M09 Peer Country Lessons Lab** | S-21 | ETH/KEN descriptive series only | Comparator suitability, context, transferability uncertainty and evidence — **P2/P3** | Comparing series does not prove policy transferability |
| **M10 Research Workbench** | S-06, S-07, S-08 | Central question/research/counterevidence/local review | Methodology/templates, workflow coverage, eventual true collaborator roles — **P1/P3/P5** | Actor claims remain unverified in personal mode |
| **M11 Product, Opportunity & Feasibility** | S-11, S-22 | Generic criteria/portfolio ancestry only | Demand assumptions, scenario model version, cash flow/sensitivity, decision value — **P3/P5** | Criteria PASS/FAIL ≠ viable investment or valid financial model |
| **M12 Decision & Execution Studio** | S-09, S-10 | Plan/decision, **new INV-DA-01**, future commitment guard | Decision option modelling, delegated organizational authority, outcome learning — **P1/P5** | Accepted memo alone does not authorize action |
| **M13 Briefing & Export Centre** | S-14, S-15 | Local frozen decision/research record + separate live action status | Atomic cross-object executive package, audience-specific reports, rights-aware publication — **P1/P3/P5** | r2 Markdown is not full executive cockpit |
| **M14 AI Research Assistant** | Hidden / future | No AI used | Citation-bounded assistant with human-in-loop, source rights and model governance — **P5/HOLD** | No operational AI claimed |
| **M15 Workspace, Security & Operations** | S-00, S-16, S-17 | L4 local unlock, fixed scope and closed-store guidance | Institution identity/RBAC/RLS, legal retention, backups/DR and cloud deployment — **P5 separate authority** | Mock G/OIDC ≠ integrated institutional security |

**Cross-domain propagation contract [PROPOSED]:** Future economic, financial, policy, media or institution evidence must enter the research/decision core by **typed domain object → versioned raw/source citation → normalized claim/observation → evidence ref → research interpretation/review → recommendation → typed decision → guarded action → rights-aware briefing**. Domain-native tables are **not** to be collapsed into the eight existing generic r2 workflow kinds. Reuse project, rights, evidence, review, ancestry and export semantics; develop domain-specific storage, quality and vintage controls separately. [OG/P01–P03; RC/P08–P10; Stage 2 §§8–9]

**Future economic/provider qualification STOP:** Connector design/API outlines are permitted as research only. No current evidence establishes live Ethiopian NBE, ECMA, ESX, ESS, financial-institution, media, regulatory or commercial data-licence approval. A separate external-intelligence research workstream was described in the original brief, but its deliverables were **not provided as independently verified inputs** to this addendum; do not import speculative provider conclusions.

# 7. Revised VS-01 acceptance criteria and scope

**New truthful VS-01 title:** **“A bounded, local, rights-aware research → reviewed decision → controlled action commitment → historical decision record with separate current-status panel.”** No general economic intelligence operating platform, real executive cockpit, new licensed external acquisition, institutional workflow, legal approval or full cross-object brief is claimed.

The parent §10.6 VS01-01 through VS01-24 criteria remain a **proposed future test plan**. Apply these explicit changes; numbering in the parent remains stable for traceability:

| Parent criterion | Stage 2 challenge replacement / addition | Future proof required |
|---|---|---|
| **VS01-01 to -05** | Add prominent Intelligence branch and original M03 S-12 historical badge; preserve S-02/S-04 provenance linkage. Replace terms “daily intelligence” with “archived observation” wherever real-time not available | IA/route mapping, unavailable-studio states |
| **VS01-06 to -07** | Explicitly separate operator `PERMITTED` (local technical determination) from Q1-owned-fixture basis and Q2 verified third-party permission; require rights packet; retained WDI UNKNOWN must not silently become PERMITTED | Fixture dossier + negative rights replay |
| **VS01-08 to -12** | Preserve contradictions, stable evidence snapshots, local review and recorded negative dispositions; ensure visible actor assurance across S-08/S-10/S-14 | Full UI review/lineage assertions |
| **VS01-13 — REPLACE** | Action `proposed→decided` denied unless INV-DA-01 accepted **AUTHORIZE_ACTION** decision, exact proposal/version and **atomic** authenticated local commitment link; rejection at API **and direct database insert** | Service, HTTP, SQL, concurrency, rollback and bypass negative tests DA-N01–17 |
| **VS01-14 — REPLACE** | Decision `action_ref` pins exact proposed action; add typed machine-readable resolution; accepted `DECLINE`/`DEFER` must **not** permit action commitment | Typed DTO, review and ancestry tests |
| **VS01-15** | Completion and outcome cite distinct exact evidence; status says local recorded outcome, not external independent verification; cannot complete uncommitted action | Later-event negative tests |
| **VS01-16 — REPLACE** | Positive frozen-export acceptance uses Q1-qualified operator-controlled fixtures with all transitive `local_export` targets PERMITTED; genuine WDI rights unverified path remains export-blocked until Q2 terms/exception proof | Fixture ledger/hash, `RIGHTS_BLOCKED`, permitted scoped replay |
| **VS01-17** | Retain immutable hash and rights recheck after later expiry/HOLD; UI shows historical vs current rights status separately | t0/t1 rights-change replay |
| **VS01-18 — REPLACE** | Frozen `D@accepted` contains historical `A@proposed`, not later commitment; current action panel must show its **separate query timestamp/version** and “not part of frozen record” | Manifest-to-decision ancestry, later action update UI |
| **VS01-19** | Retain unresolved competing evidence and risks/uncertainties even on accepted decision; positive resolution cannot erase contradiction | UI and manifest contradiction equality |
| **VS01-20 to -23** | Keep security/local session, closed-store recovery, screen accessibility and clean source-to-package qualification as *separate future executed gates* | Distinct reports bound to future qualified artifact |
| **VS01-24** | Expand “no live acquisition” to **no unlicensed third-party positive export**, no executable demo authorization based on unverified local claim, and no “full product complete” statement | Rights+marketing-copy audit |
| **VS01-25 — NEW** | Six-destination intelligence-first primary IA plus Workspace utility; every module M01–M15 has visible roadmap/status mapping | Information-architecture sign-off (design only) |
| **VS01-26 — NEW** | Use of real historical WDI and synthetic numeric fixture have visibly different source badges and permitted-use states; no synthetic values presented as Ethiopia actuals | Data-provenance visual inspection |
| **VS01-27 — NEW** | Numeric synthetic snapshot happy path cannot be declared passed until a future authorized disposable fixture loader exists and is tested | Source-attach/fixture-insertion/lineage verification |
| **VS01-28 — NEW** | Positive authorizing decision selects **exactly one controlling accepted positive disposition**; conflicting/negative decisions cannot silently commit | DA-N03, N04, N09 |
| **VS01-29 — NEW** | Commitment changes must not modify `action@proposed` content or accepted `decision` revision; state is append-only | Immutable-content and hash checks |
| **VS01-30 — NEW** | Frozen decision page never claims included present action state or outcomes; live current-status panel clearly separated with retrieved-at time | Temporal T1–T6 controlled replay |
| **VS01-31 — NEW** | Export output is correctly called **Frozen Decision Record** unless/until separately qualified narrative formatting is built | Screen copy and artifact schema inspection |
| **VS01-32 — NEW** | All selected source/evidence/rights/decision/action objects have pinned project/revision references; export rights checked across transitive ancestry | Lineage, rights packet and cross-project negative |
| **VS01-33 — NEW** | An accepted decision with resolution `DECLINE` can itself be frozen as a **negative decision record** if rights permit, without creating a committed action | Negative decision and immutable export test |
| **VS01-34 — NEW** | Full-product preservation review shows M04/M05/M06/M07/M08/M09/M11/M14 and future M03 expansion **not delivered by VS-01** | Requirements traceability and release-scope statement |

**Two independently reported outcomes** are mandatory when demonstrating VS-01: (A) **research/decision/rights/brief functionality**; (B) **source-specific numeric indicator path**. A pass in (A), including using an authored note, cannot be reported as a pass in (B) if the controlled synthetic indicator fixture has not been inserted and qualified. A correctly blocked WDI export is a **successful rights-negative test**, not a full positive briefing demonstration.

# 8. OD-01 to OD-14 — proposed owner decision matrix

These are **recommendations for the owner's explicit decision**, not decisions already taken. `APPROVE AS DESIGN` means accept specification direction only; it does **not** authorize engineering execution, source access, release promotion or deployment.

| OD | Owner decision subject | Recommended disposition | Exact addendum rationale / condition |
|---|---|---|---|
| **OD-01** | EROS independent product identity | **APPROVE AS DESIGN** | Maintain standalone intelligence, research and strategy OS; no PSS/CAD/Enawuga/Model 6 data or schema merger |
| **OD-02** | Separate module/register/lifecycle/release namespaces | **APPROVE AS DESIGN** | Keep original M IDs, R01–R07 assurance, R0–R7 research stages, G2 public registries, eight r2 record kinds, S and W screens separate |
| **OD-03** | PSS-style public assurance registers | **AMEND** | Retain only explicitly generalized, defensibly sourced assurance semantics; provenance of any borrowed historical patterns marked unresolved; no PSS licences/certificates imported |
| **OD-04** | Canonical IA | **AMEND** | **Replace** Evidence-first with six-destination **Intelligence-first** shell, plus Workspace utility (§2) |
| **OD-05** | Screen inventory and consolidation | **APPROVE AS DESIGN** | Preserve S-00–S-22, keep W-23 as proposed wireframe; implement panels only as justified; no fake S-24 |
| **OD-06** | VS-01 product increment | **AMEND** | Adopt narrowed, source-rights-qualified decision/action journey with two independently reported fixture paths (§7) |
| **OD-07** | Local stack / r2 reuse | **APPROVE AS DESIGN** | Candidate-only local modular monolith / Node / PGlite; accepted L4 remains separate; future qualification, no r2 promotion |
| **OD-08** | Action sequence and authorization | **AMEND** | Adopt enforceable **INV-DA-01** typed positive decision, transaction and DB guard—not UI-only—and INV-DA-02 |
| **OD-09** | Source rights / local review assurances | **AMEND** | Add Q0–Q2 fixture qualification, per-use rights, explicit unverified identity and delivery-rights drift (§4) |
| **OD-10** | Challenge to earlier “B+E” preference | **APPROVE AS DESIGN** | Prefer **bounded local integrated slice**, not an undefined B+E bundle, subject to concrete future implementation alternatives and gates |
| **OD-11** | Final r2 release provenance / acceptance | **DEFER** | Full commit, clean manifest, r1 comparison, final tests and owner release acceptance separate; Stage 2 design research may proceed |
| **OD-12** | Future data/provider/AI access | **DEFER** | Preserve domain contracts for future work, **HOLD** acquisition, claims of approved licences and AI execution |
| **OD-13** | Institutional/cloud environment | **DEFER** | Separate business/security/legal/deployment authorization; mock G-stage OIDC is not current L4 institutional identity |
| **OD-14** | Implementation authorization boundary | **APPROVE AS DESIGN** | **Affirm** that none is granted by this addendum or owner design approval; new separately scoped written authorization required |

**Owner record template:** `OD-ID / chosen disposition / changes to proposed wording / exact document revision and SHA-256 / signature-or-authentic-decision-reference / decision date / whether it authorizes DESIGN ONLY`. Do not auto-populate a decision date or infer acceptance from the presence of this matrix.

# 9. Genuine blockers vs matters that must remain separate

## 9.1 Blockers to **unconditional** canonical architecture approval

1. **INV-DA-01 and decision resolution must be explicitly accepted as normative architecture** (or replaced with an equally enforceable cross-record alternative). Otherwise the proposed management decision workflow is internally unsound because a locally “accepted” negative decision could be mistaken for authorization and because a direct route can bypass a UI-only gate. This is a **design blocker**, not proof that a migration or code change has occurred.
2. **Fixture-rights policy must be fixed**: identify whether VS-01's positive frozen demonstration uses only operator-controlled originals under a documented local-only determination or a qualified third-party source/use packet. A genuine archived WDI/third-party source **cannot** be treated as permitted merely to make the demo pass. A positive **numeric synthetic source** path additionally requires a future isolated fixture-loader design. These are **demonstration fidelity/qualification blockers**, not blockers to naming the target domain.
3. **Output naming and temporal claim must be fixed**: the first export is a frozen *accepted decision record* with proposed-action ancestry, plus independently dated action status in the UI—not an atomic executive operating snapshot. If the owner instead requires an atomic one-file briefing, that is a different **new-development** MVP with its own scope and tests.
4. **Canonical IA must be explicitly selected**: A3 intelligence-first is recommended; retaining the current Evidence-first §4.2 while claiming an intelligence-first product would leave the target contradictory. This is an owner design-decision gate, not a runtime defect.

These four issues are **resolvable on paper by explicit owner design dispositions**. No further source access is needed to make the recommended corrections. If the owner accepts the precise amendments, **conditional architecture approval is technically defensible** while still leaving implementation, release and provider authorities closed.

## 9.2 Important **non-blockers** to conditional owner design approval (but blockers to different gates)

- Missing full final r2 Git commit, stale `SHA256SUMS.txt`, missing independent clean final-r2 test manifest and r1 comparator: **block release qualification/promotion**, not a read-only design choice. Stage 2's existing REL-01–08 remain unresolved.
- L4 accepted baseline versus L5/C1/r2 candidates: **must remain separate**, but does not invalidate a proposed target architecture.
- Unbuilt M04/M05/M06/M07/M08/M09/M11 advanced/M14 and cross-object `brief_package`: **block full-product-complete claims**, not VS-01 architecture design.
- Missing independently verified WDI use rights: **blocks claims of licensed third-party local_export/external distribution as applicable**; does not bar a correctly constrained operator-owned synthetic demonstration.
- Local unverified actors versus institutional RBAC: **block institutional signoff/security claims**, not an explicitly personal local research prototype.
- Undelivered external intelligence research: **blocks current source/provider capability and licence claims**, not a connector-boundary proposal.

**Readiness judgment:** **READY FOR CONDITIONAL OWNER DESIGN DECISION AFTER THE FOUR ABOVE AMENDMENTS; NOT READY FOR UNQUALIFIED APPROVAL, IMPLEMENTATION, RELEASE ACCEPTANCE, OR FULL-PRODUCT COMPLETION CLAIM.**

# 10. Exact Stage 2 revision instructions (addendum adoption ledger)

This is an **overlay** on the 23 October parent candidate, not evidence that the parent file has been silently edited. Each row is an exact proposed text/action replacement for the next owner-controlled document revision.

| Parent report section / identifier | Precise addendum-driven change |
|---|---|
| **§1 Executive architecture decision brief** | Replace “global Home plus five canonical sections” and Evidence-led recommendation with **six main destinations: Home, Intelligence, Sources & Evidence, Research, Decisions & Feasibility, Briefings, plus Workspace utility**. Replace “frozen executive brief” shorthand with **Frozen Decision Record + separately retrieved current action status** until `brief_package` exists |
| **§2 taxonomy, especially §2.2–2.4** | Preserve existing namespace separation; append rule that `accepted decision event` is **review state only**, never by itself `AUTHORIZE_ACTION` |
| **§4.1 module map** | Preserve **all M01–M15 IDs and original module labels**. Retag M03–M09 as Intelligence children, M01–M02 as Sources & Evidence, M10 Research, M11–M12 Decisions & Feasibility, M13 Briefings, M15 utility, M14 hidden/future |
| **§4.2 canonical product IA** | **Replace entire evidence-first tree** with §2.2 of this addendum. Add alternatives A0–A3 and why A3 won. Mark planned Intelligence items noninteractive until qualified |
| **§4.3 screen plan** | Preserve the exact S-00–S-22/W-23 mapping; change IA parent labels and status chips. No mandatory 23-page MVP. Clarify W-23 registry status, embedded S-13/S-15, S-00 local unlock |
| **§5 researcher-to-executive journeys** | Make Intelligence domain discovery the product entry point for economic/sector/market analysts; research and decision handoffs use one shared case/evidence spine. Display independently dated executive action-status panel |
| **§6 reuse matrix** | Change local-backend action/decision reuse status from unconditional “adapt” to **ADAPT + BLOCKING COORDINATION INVARIANT NOT YET PRESENT**; avoid labelling acceptance semantics as implemented |
| **§7.2 API inventory** | Existing `/backend/records` remains actual route. Add **PROPOSED** `/backend/action-commitments` and DTO with exact `authorizing_decision_ref`. Label it unavailable until separately implemented. No new route claimed to be present |
| **§7.3 current vs future database** | Add proposed append-only project-scoped `action_commitments`, exact proposal and decision revision refs, uniqueness, FKs, deferred cross-record authorization constraint; existing SQL `010` does not contain it |
| **§7.4 review and action state machines** | Add explicit `AUTHORIZE_ACTION / DEFER / DECLINE` as a **new decision semantic**, INV-DA-01/02, commitment transaction and direct SQL guard, and actor-assurance restrictions |
| **§8 extension architecture** | Preserve existing source/connector plans but connect future M03–M09 typed observations/dossiers/instruments/signals to pinned evidence/review/decision core; do not claim external workstream evidence exists |
| **§9 relationship model** | Add typed cross-record authorization edge with exact `action@proposed → decision@accepted → action@decided` **temporal** ordering (reference direction explicitly pinned). Add export versus current-action as-of separation |
| **§10.1 vertical-slice statement** | Rename slice per §7; require positive `AUTHORIZE_ACTION` plus atomic commitment. Clarify proposed action is pre-decision **only**, committed action is post-decision |
| **§10.2 workflow and §10.3 DTO examples** | Add synthetic/real fixture lane distinction; proposed `resolution` in *future* decision DTO; proposed action-commitment request contract. Do not present the additions as present r2 |
| **§10.4 UI/error/empty states** | New `COMMITMENT_REQUIRED` and `DECISION_NOT_AUTHORIZING` negative statuses (names **proposed**), Q0/Q1/Q2 rights labels, blocked WDI export and “current, not frozen” action-state panel |
| **§10.5 ancestry/temporal semantics** | Replace any implication of decision+action atomic brief with T0–T6 table, revision-pinned frozen `decision@accepted`, proposed ancestry, latest action status retrieved separately; future `brief_package_v1` requires its own snapshot transaction |
| **§10.6 VS-01 acceptance** | Retain IDs 01–24 but apply explicit replacements in §7; append **VS01-25–VS01-34**. Future negative testing at service, HTTP and SQL layers is mandatory for authorization invariant |
| **§11–12 stack and alternatives** | Local modular monolith remains a candidate, conditional on proper cross-record invariant and fixture path; reject naive B+E shorthand. Additional orchestration is **bounded purposeful adaptation**, not a platform rewrite |
| **§13 roadmap** | Replace initial slice gate with P0 fixture/rights and invariant-contract design **before** P1 future implementation qualification; preserve M03–M09 and M11 domain-development roadmap and external acquisition HOLD |
| **§14 REL-14 / REL-15** | REL-14 must now demand typed decision resolution + DB-enforced atomic authorization, not merely UI gate; REL-15 explicitly separates frozen decision vs cross-object brief snapshot. Keep REL-01–13 unclosed |
| **§15 OD-01–OD-14** | Replace recommended OD-04/06/08/09 wording and update all proposed dispositions with §8 matrix. No decision is auto recorded. Update final readiness to **conditional architecture decision-ready, not release or implementation ready** |

**Recommended controlled revision process (later, if owner orders it):** attach this addendum to the existing Stage 2 candidate; obtain owner dispositions per OD; issue a versioned parent revision with a change log; cryptographically bind chosen parent/addendum versions in the owner decision record. **No parent file, repository, deployment or release has been changed by this review.**

---

## Final independent disposition

**RECOMMEND: AMEND THE STAGE 2 CANDIDATE AS SPECIFIED, THEN ALLOW OWNER ARCHITECTURE-ONLY APPROVAL.**

- **Architecture target:** Intelligence-led EROS with one evidence/research/decision spine — **recommended, not approved**.
- **First slice:** Personal, controlled, synthetic-positive and real-archival-rights-conservative research-to-decision demonstration — **specification only**.
- **Action authorization:** Current r2 **fails the proposed stronger cross-record semantic invariant by design**, and must not be represented as having it.
- **First frozen output:** Immutable locally accepted decision/research artifact, **not** a single frozen executive action/outcome report.
- **Full EROS:** M01–M15 remain required product envelope; successful VS-01 covers only a bounded subset.
- **Authority:** No code/test/migration/provider/deployment/release/owner acceptance authorization granted. All separate HOLDs preserved.

**STOP FOR OWNER REVIEW.**
