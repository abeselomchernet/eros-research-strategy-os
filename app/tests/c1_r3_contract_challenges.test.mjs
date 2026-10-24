// Independent acceptance probes. Candidate implementation and its 87 tests remain untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRunResult} from '../src/source_contracts.mjs';
const sample = () => ({
  runId:'11111111-1111-4111-8111-111111111111',providerId:'world_bank',datasetId:'WB_WDI',
  startedAtUtc:'2026-10-22T10:00:00Z',finishedAtUtc:'2026-10-22T10:00:01Z',httpStatusCode:200,
  transportStatus:'transport_success',validationStatus:'validation_passed',approvalStatus:'awaiting_review',
  requestAttemptCount:1,responsesReceived:1,parsedObservations:1,acceptedObservations:1,
  rejectedObservations:0,persistedRawCaptures:1,recordsAttempted:1,recordsLoaded:1,recordsRejected:0,
  rawCaptureSha256:'a'.repeat(64),errorMessage:null,
});
test('Independent contract: successful HTTP transport cannot report zero attempts and zero responses',()=>{
  const input={...sample(),requestAttemptCount:0,responsesReceived:0,persistedRawCaptures:0};
  // Rejection is exercised inside assert.throws; original diagnostic call threw outside it.
  assert.throws(()=>validateRunResult(input));
});
test('Independent contract: explicit observation counts and their legacy aliases cannot contradict each other',()=>{
  const input={...sample(),acceptedObservations:0,recordsLoaded:1};
  // Rejection is exercised inside assert.throws; original diagnostic call threw outside it.
  assert.throws(()=>validateRunResult(input));
});
test('Independent contract: retained parse-error capture cannot coexist with explicitly zero received responses',()=>{
  const input={...sample(),transportStatus:'parse_error',validationStatus:'not_evaluated',approvalStatus:null,
    responsesReceived:0,persistedRawCaptures:0,parsedObservations:0,acceptedObservations:0,
    recordsAttempted:0,recordsLoaded:0,errorMessage:'Offline malformed response fixture'};
  // Rejection is exercised inside assert.throws; original diagnostic call threw outside it.
  assert.throws(()=>validateRunResult(input));
});
