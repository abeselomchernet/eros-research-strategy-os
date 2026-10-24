import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateRunResult,validateArchiveReplay,createIngestSuccessResult,createValidEmptyResult,createTransportFailureResult} from '../src/source_contracts.mjs';
const bytes=Buffer.from('OFFLINE TEST ONLY capture');
const hash=createHash('sha256').update(bytes).digest('hex');
const base={runId:'11111111-1111-4111-8111-111111111111',providerId:'world_bank',datasetId:'WB_WDI',startedAtUtc:'2026-10-22T10:00:00Z',finishedAtUtc:'2026-10-22T10:00:01Z',rawCaptureSha256:hash};
const success=()=>createIngestSuccessResult({...base,validationStatus:'validation_passed',parsedObservations:1,acceptedObservations:1});
test('R3 success and empty require positive requests/responses independently',()=>{
 for(const run of [success(),createValidEmptyResult(base)]) for(const counts of [{requestAttemptCount:0},{responsesReceived:0,persistedRawCaptures:0},{requestAttemptCount:0,responsesReceived:0,persistedRawCaptures:0}]) assert.throws(()=>validateRunResult({...run,...counts}));
 assert.equal(validateRunResult({...success(),httpStatusCode:206}).valid,true);
 assert.equal(validateRunResult(createValidEmptyResult(base)).type,'valid_empty');
});
test('R3 all aliases reject contradictions in either direction; one-sided values retain invariants',()=>{
 for(const [canonical,legacy] of [['parsedObservations','recordsAttempted'],['acceptedObservations','recordsLoaded'],['rejectedObservations','recordsRejected']]) {
  for(const value of [0,2]) if(value!==success()[canonical]) assert.throws(()=>validateRunResult({...success(),[legacy]:value}),/must agree/);
  const canonicalOnly={...success()};delete canonicalOnly[legacy];assert.equal(validateRunResult(canonicalOnly).valid,true);
  const legacyOnly={...success()};delete legacyOnly[canonical];assert.equal(validateRunResult(legacyOnly).valid,true);
 }
 assert.throws(()=>createIngestSuccessResult({...base,validationStatus:'validation_passed',parsedObservations:1,recordsAttempted:2}),/must agree/);
 assert.throws(()=>validateRunResult({...success(),parsedObservations:undefined,recordsAttempted:0}),/cannot exceed/);
});
test('R3 retained error captures require actual receipt; timeout stays valid without capture',()=>{
 for(const transportStatus of ['parse_error','schema_drift']) {
  const input={...base,transportStatus,errorMessage:'OFFLINE TEST ONLY malformed response',responsesReceived:1,persistedRawCaptures:1};
  const result=createTransportFailureResult(input);assert.equal(result.rawCaptureSha256,hash);
  assert.throws(()=>createTransportFailureResult({...input,responsesReceived:0,persistedRawCaptures:0}),/without response/);
  assert.throws(()=>createTransportFailureResult({...input,requestAttemptCount:0}));
  assert.throws(()=>createTransportFailureResult({...input,rawCaptureSha256:'bad'}));
 }
 assert.equal(createTransportFailureResult({...base,rawCaptureSha256:null,transportStatus:'transient_failed',errorMessage:'Offline timeout'}).responsesReceived,0);
});
test('R3 archive replay verifies bytes and prior capture without claiming current network acquisition',()=>{
 const replay={kind:'archive_replay',priorRun:success(),rawBytes:bytes,requestAttemptCount:0,responsesReceived:0};
 assert.equal(validateArchiveReplay(replay).rawCaptureSha256,hash);
 for(const change of [{rawBytes:Buffer.from('changed')},{rawBytes:'text'},{responsesReceived:1},{requestAttemptCount:1},{priorRun:{...success(),responsesReceived:0}}]) assert.throws(()=>validateArchiveReplay({...replay,...change}));
 assert.throws(()=>validateRunResult(replay));
});
