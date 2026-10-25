import test from 'node:test';
import assert from 'node:assert/strict';
import {assertLocalRequest} from '../src/l4_loopback_guard.mjs';
const port=4187, host='127.0.0.1:4187', origin='http://127.0.0.1:4187';
const req=(method,headers={})=>({method,headers:{host,...headers}});
test('allows loopback read and exact-origin write',()=>{
  assert.equal(assertLocalRequest(req('GET'),port),true);
  assert.equal(assertLocalRequest(req('POST',{origin,'sec-fetch-site':'same-origin'}),port),true);
});
test('blocks rebinding, cross-origin and unproven mutations',()=>{
  for(const bad of [
    req('GET',{host:'evil.example'}),
    req('GET',{host:'localhost:4187'}),
    req('POST'),
    req('POST',{origin:'http://evil.example'}),
    req('POST',{origin,'sec-fetch-site':'cross-site'}),
    req('TRACE'),
  ]) assert.throws(()=>assertLocalRequest(bad,port));
  assert.throws(()=>assertLocalRequest(req('GET'),80));
});
