#!/usr/bin/env python3
"""Verify admitted historical source bytes after recorded transformations."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((root/'docs/engineering/R2_SOURCE_ADMISSION.json').read_text())
for e in m['files']:
    p=root/e['path']
    assert p.resolve().is_relative_to((root/'app').resolve()), 'Path outside app'
    assert hashlib.sha256(p.read_bytes()).hexdigest()==e['import_sha256'], 'Admission hash mismatch: '+e['path']
print('PASS:',len(m['files']),'admitted historical source hashes; new files are reviewed separately')
