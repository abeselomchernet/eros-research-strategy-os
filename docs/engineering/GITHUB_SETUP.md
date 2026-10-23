# GitHub setup (private) — manual/Work/Codex step

The connected account is `abeselomchernet`. The Chat GitHub connector can read/write **existing** repos but cannot create a new repository through its available actions. No EROS repo was found in the accessible repository list, and the linked Windows device was offline. **No remote repository/push is claimed.**

1. Open https://github.com/new or use an authorized ChatGPT Work cloud computer. Choose owner `abeselomchernet`, name `eros-research-strategy-os`, visibility **Private**, create EMPTY repo (no auto-generated README/gitignore/license).
2. In a local copy of THIS STARTER DIRECTORY, with Git/GitHub CLI authenticated, run:

```powershell
git init -b main
git add README.md AGENTS.md .gitignore docs scripts .github
git status --short
python scripts/check_governance.py
git commit -m "governance: freeze EROS owner scope and VS-01 architecture"
git remote add origin git@github.com:abeselomchernet/eros-research-strategy-os.git
git push -u origin main
```

Use HTTPS origin instead if SSH not configured. The exact URL is a **proposed** destination until the repo exists.

3. Go to Settings → Rulesets/Branches: require PR before merge, codeowner review and `governance` status check, disallow force/deletion, require resolving conversations. **Verify plan entitlements**: GitHub private-repo rulesets/required codeowner reviews may need GitHub Pro/Team/Enterprise; on Free private repos some safeguards may be advisory only.
4. Restrict repository collaborator roles; enable 2FA/passkeys, dependabot/dependency alerts and secret scanning/push protection where available; set Actions approval policy and minimal `GITHUB_TOKEN` permissions.
5. Create VS01-001 ... VS01-008 issues using `docs/plan/VS01_BACKLOG.md`. Enable issue/PR templates. Record repo URL, main SHA, CI URL/ruleset review in `docs/engineering/STATUS.md` via reviewed PR.
6. Import r2 source in **separate source-admission branch**, NOT with governance freeze, after allowlist/licensing/data-rights scan. Never push `.git` of original, private databases, raw WDI captures, secrets or bundled archives by default.

**This is Git source control, not cloud application deployment.** D3 remains held.
