# Change Control, Ownership and CI Gates

## Rule of authority

**Owner decision → frozen version → ADR → issue → PR → CI + independent review → merge → qualification evidence → owner release acceptance.** This is the single work-management chain.

- Owner approval is required to change frozen architecture, long-term module meanings, source-permission policy, decision authorization rules, institutional/security boundaries, spend or deployment permissions.
- Engineers may refine within the approved VS-01 envelope by ADR/PR without changing those invariants.
- Historical source is preserved; design changes are additive new versions, never silent edits or checksum rewrites.

## Pull requests

Each PR must state: scope/task ID, changed module/screens/records/routes/migrations, old-vs-new contracts, evidence source, security/rights risks, negative tests, running environment, recovery impact, and owner decision affected. Every architecture-altering PR adds an ADR. CODEOWNERS approval is requested and, if supported by plan, required.

## CI and security

- Minimal `GOVERNANCE-CI` starts on all branches/PRs: baseline-digest check; repo metadata checks; secret-like file block; no forbidden binaries; no deployment workflows; disallow unapproved change of frozen baselines.
- Once application source has passed rights/safety admission, add separate `OFFLINE-TESTS` job with locked Node 22, `npm ci`, serial tests, negative API/DB authorization tests, restore checks. **Do not activate an arbitrary historic test suite until network behavior is audited.**
- Use least-privilege `GITHUB_TOKEN` (`contents: read`), avoid long-lived deploy secrets, no CI job with provider acquisition or cloud deployment.
- Protect `main`: require PRs, at least one genuine qualified review, required status checks, dismiss stale reviews when supported; disallow force-push/deletion. GitHub private-repo protection/CODEOWNERS enforcement depends on GitHub account plan; verify in repository Settings. A file alone cannot enforce a review rule.
- Never claim CI green means EROS product accepted. Only a documented owner acceptance record can promote a candidate.

## Branch naming

`task/VS01-###-short-description`; `fix/VS01-###-short-description`; `docs/ADR-####-summary`. Use squash merge with traceable PR reference, protected tags for accepted releases if supported.

## One-thread engineering and AI-credit policy

- One repository, one canonical owner decision, one project status file (`docs/engineering/STATUS.md`), one active ticket per agent.
- Use source paths and contract index, not full transcript retellings.
- Every session resume from `STATUS.md` + last merged commit + target issue; avoid repeating Stage 1/2 architecture research.
- No parallel agents editing same domain/schema without a delegated owner, baseline and merge order.
- Escalate ambiguity once with a focused ADR instead of generating multiple lengthy reports.
