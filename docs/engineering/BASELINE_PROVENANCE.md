# Engineering Source Provenance and Safe Import

**No source code is automatically uploaded by this starter.** The connected remote Windows Desktop Commander was offline at kickoff and the direct GitHub connector has no create-repository action. This handoff is intentionally **local, non-pushed**.

## Known roots

- Original: `C:\Users\microsoft\Documents\Ethiopia Research Strategy OS`.
- Modernization: `C:\Users\microsoft\Documents\EROS_v1_1_Modernization_C1`.
- UI/UX: `C:\Users\microsoft\Documents\EROS_v1_1_UI_UX_Design_Study`.
- Selected r2 ZIP under modernization `evidence/EROS_Local_Backend_Candidate_v0_6_0_r2.zip`, SHA-256 `c02370befe916c755a4ef752543048498e3df9c0562c46c475b0b6b9ae5d8a3e`.
- Current future repo owner verified via GitHub connection: `abeselomchernet`. No current EROS repository was found among the authenticated account's repositories at preparation time.

## Before first source import

1. Verify SHA-256 and ZIP integrity; match current external `LOCAL_BACKEND_R2_FILE_MANIFEST.json`. Record source commit, timestamp and allowed license.
2. Stage in a fresh isolated clone/branch; NEVER git-init inside original EROS, CAD, V-Macro, PSS or user Documents project trees.
3. Scan all tracked file names AND contents for credentials, tokens, secrets, PII, private/local databases, mutable workspace state, configuration with private addresses, WDI raw captures, third-party files and user-sensitive research.
4. Default-deny `data/world_bank/raw`, personal `.env`, credentials, database/data directories, backups, dumps, logs, historical ZIPs, `.git`, `node_modules`, generated browser artifacts unless explicitly qualified for private repo inclusion.
5. Review dependency lockfiles and package licenses, then admit required source, tests and only expressly permitted synthetic fixtures in one source-import PR.
6. Regenerate NEW import manifest for transformed/staged repo. Preserve the original archive/manifest digests as provenance rather than claiming byte equivalence after exclusions/line-ending normalizations.
7. Run clean offline-scope tests on isolated fixtures. Explicitly audit for network requests before CI executes broad test suites.

## Explicit present uncertainty

Historical r2 `SHA256SUMS.txt` is stale; do not use it for production provenance. No independent source-code acceptance or product release is implied by a hash or old log.
