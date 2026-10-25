import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseAnnualCsv,validateIndicatorInput,fingerprint,compareIndicatorSnapshots,citedIndicatorBrief,citedComparisonBrief} from '../src/l1_indicator_logic.mjs';
const fixture=JSON.parse(await readFile(new URL('../fixtures/L1_SYNTHETIC_ANNUAL_INDICATOR.json',import.meta.url),'utf8'));
const peer=JSON.parse(await readFile(new URL('../fixtures/L1_SYNTHETIC_PEER_INDICATOR.json',import.meta.url),'utf8'));
const normalize=payload=>validateIndicatorInput({...payload});
const source=(v,id)=>({...normalize(v),id,imported_at:'2026-10-20T12:00:00Z',import_sha256:'a'.repeat(64)});
const ID='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
test('L1 parses annual CSV with explicit missing values, sorted years',()=>{
 const years=parseAnnualCsv('period,value\n2025,NA\n2023,5.5\n2024,0');
 assert.deepEqual(years.map(x=>x.period),[2023,2024,2025]);
 assert.equal(years[2].value,null);assert.equal(years[2].value_status,'missing');
});
test('L1 rejects duplicate years, malformed CSV and unsupported interval',()=>{
 assert.throws(()=>parseAnnualCsv('period,value\n2020,1\n2020,2'),/Duplicate/);
 assert.throws(()=>parseAnnualCsv('year,val\n2020,1'),/header/);
 assert.throws(()=>parseAnnualCsv('period,value\n2101,2'),/range/);
});
test('L1 source classification and HTTPS checks reject private, credential or synthetic mislabelling',()=>{
 for(const change of [{dataset_kind:'private'},{source_url:'http://example.invalid/data'}, {source_url:'https://user:pass@example.invalid/data'},{source_url:'https://example.com/data'},{source_tier:'UN'}]){
  assert.throws(()=>normalize({...fixture,...change}));
 }
});
test('L1 fingerprints are stable for identical normalized evidence',()=>{
 const x=normalize(fixture);assert.equal(fingerprint(x),fingerprint(normalize(fixture)));
 assert.notEqual(fingerprint(x),fingerprint(normalize(peer)));
});
test('L1 source-linked brief discloses missing data and synthetic status',()=>{
 const a=normalize(fixture);const md=citedIndicatorBrief(source(fixture,ID),a.observations);
 assert.match(md,/SYNTHETIC — NOT OBSERVED/);assert.match(md,/2023 \| missing \| missing/);
 assert.match(md,/example.invalid/);assert.match(md,/illustrative-v1/);
});
test('L1 compares two matching sources without extrapolating or interpolating',()=>{
 const a={source:source(fixture,ID),observations:normalize(fixture).observations};
 const b={source:source(peer,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),observations:normalize(peer).observations};
 const c=compareIndicatorSnapshots(a,b);
 assert.equal(c.length,5);assert.equal(c.find(x=>x.period===2023).first,null);assert.equal(c.find(x=>x.period===2022).second,null);
 const md=citedComparisonBrief(a,b);assert.match(md,/Ethiopia|ETH/);assert.match(md,/KEN/);assert.match(md,/Missing values/);
});
test('L1 comparison refuses incompatible indicator code or unit',()=>{
 const a={source:source(fixture,ID),observations:normalize(fixture).observations};
 const b={source:{...source(peer,'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),unit:'percent'},observations:normalize(peer).observations};
 assert.throws(()=>compareIndicatorSnapshots(a,b),/Compare only identical/);
});
