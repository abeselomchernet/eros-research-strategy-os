#!/usr/bin/env python3
"""Cheap deterministic EROS freeze/admission guard. Not a security certificate."""
import hashlib, json, pathlib, re, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'docs/freeze/FROZEN_FILES_SHA256.json'
ERRORS=[]
def bad(m): ERRORS.append(m)
try:
    checks=json.loads(BASE.read_text(encoding='utf-8'))
    for name,expected in checks['immutable'].items():
        path=ROOT/name
        if not path.is_file(): bad(f'Frozen file missing: {name}'); continue
        got=hashlib.sha256(path.read_bytes()).hexdigest()
        if got!=expected: bad(f'Frozen baseline MODIFIED: {name}; expected {expected}, found {got}')
except Exception as e: bad(f'Freeze manifest missing/invalid: {e}')
required=['AGENTS.md','README.md','docs/engineering/STATUS.md','docs/plan/VS01_BACKLOG.md', '.github/CODEOWNERS', '.github/workflows/governance.yml']
for name in required:
    if not (ROOT/name).is_file():bad(f'Required governance file missing: {name}')
try:
    files=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).splitlines()
except Exception:
    files=[str(x.relative_to(ROOT)).replace('\\','/') for x in ROOT.rglob('*') if x.is_file()]
for name in files:
    n=name.replace('\\','/'); lo=n.lower(); fn=n.split('/')[-1].lower()
    if any(part in lo.split('/') for part in ['node_modules','.git','.venv','__pycache__','dist','coverage']):bad(f'Generated dir tracked: {n}')
    if fn in ['.env','id_rsa','id_ed25519','credentials.json','service_account.json','postgresql.conf','pg_hba.conf'] or fn.startswith('.env.') and fn!='.env.example':bad(f'Unallowed potential secret file: {n}')
    if n.endswith(('.db','.db-wal','.db-shm','.sqlite','.sqlite3','.p12','.pfx','.pem','.key','.zip','.7z','.bak','.dump')):bad(f'Binary/secret/archive not allowlisted for tracked repo: {n}')
    if n.startswith(('data/world_bank/raw/','app/data/world_bank/raw/','private/','backups/')):bad(f'Rights/sensitive path blocked: {n}')
    if n.startswith('.github/workflows/') and n!='.github/workflows/governance.yml':
        try:
            t=(ROOT/n).read_text(encoding='utf-8').lower()
            if any(k in t for k in ['deploy','aws-actions','azure/login','gcloud','api.worldbank.org']):bad(f'Workflow requires fresh owner review: {n}')
        except Exception: bad(f'Unreadable workflow: {n}')
for pat in [r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'ghp_[A-Za-z0-9]{36}',r'github_pat_[A-Za-z0-9_]{30,}']:
    for name in files:
        if name.endswith(('.md','.py','.yml','.yaml','.json','.txt','.mjs','.js','.ts','.sh','.ps1')):
            p=ROOT/name
            if p.is_file() and p.stat().st_size < 1000000:
                if re.search(pat,p.read_text(encoding='utf-8',errors='replace')):bad(f'Secret-like token pattern in {name}')
if ERRORS:
    for x in ERRORS:print('FAIL:',x,file=sys.stderr)
    raise SystemExit(1)
print(f'PASS: frozen governance checks, {len(files)} tracked/visible files considered; does not certify code security or release')
