import test from 'node:test';
import assert from 'node:assert/strict';
import {captureWdiReview} from '../src/l5_wdi_review.mjs';
test('VS01 capture rejects missing transport before archive reads or global fetch', async () => {
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('unexpected network');};
  try {
    await assert.rejects(()=>captureWdiReview('nonexistent-fixture-root'), /acquisition disabled/);
    await assert.rejects(()=>captureWdiReview('nonexistent-fixture-root',{fetchImpl:null}), /acquisition disabled/);
    assert.equal(calls,0);
  } finally { globalThis.fetch=original; }
});
