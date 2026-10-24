import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,stable,id,text,createLocalBackend} from '../src/local_backend.mjs';
test('backend validation rejects malformed identifiers and excessive/untyped text',()=>{
 for(const bad of ['../escape','x'.repeat(36),'00000000-0000-0000-0000-000000000000',null,42])assert.throws(()=>id(bad),/UUID/);
 for(const bad of [null,{},[],42,'x'.repeat(4001)])assert.throws(()=>text(bad,'note'),/Invalid/);
 assert.equal(hash({b:null,a:[1,2]}),hash({a:[1,2],b:null}));assert.notEqual(hash({a:null}),hash({a:0}));assert.equal(stable({b:2,a:1}),' {"a":1,"b":2}'.trim());
});
test('backend rejects invalid operations before starting a transaction',async()=>{
 let transactions=0;const p='11111111-1111-4111-8111-111111111111';
 const backend=createLocalBackend({query:async()=>({rows:[{id:p}]}),transaction:async()=>{transactions++;throw Error('unexpected transaction');}});
 await assert.rejects(()=>backend.write(p,{kind:'fictional'},'local fixture claim'),/Missing or unknown fields/);
 await assert.rejects(()=>backend.write(p,{id:null,kind:'research',expected_version:-1,operation:'create',state:'draft',content:{},rationale:'fixture rationale',request_key:'fixture-key-0001',links:[]},'fixture'),/integer/);
 assert.equal(transactions,0);
});
