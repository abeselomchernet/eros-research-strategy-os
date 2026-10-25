import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir,freemem} from 'node:os';
import {join} from 'node:path';
import {openLocalResearch} from '../src/l3_local_research.mjs';

test('disposable migrations, stale writes, immutable history, project isolation and restart',async()=>{
 assert.ok(freemem()>=1536*1024*1024,'Owner-authorized local floor: 1536 MiB free');
 const dir=await mkdtemp(join(tmpdir(),'eros-vs01-db-')); let store;
 try {
  store=await openLocalResearch(dir);
  const p=await store.createProject('SYNTHETIC admission test'), other=await store.createProject('SYNTHETIC other project');
  const input={id:null,kind:'question',expected_version:0,operation:'create',state:'draft',content:{title:'Synthetic question',question:'Can revisions persist?',boundaries:'Synthetic fixture only'},rationale:'Source admission test',request_key:'admission-question-0001',links:[]};
  const q=await store.backend.write(p,input,'SYNTHETIC local unverified actor');
  const update={...input,id:q.record_id,expected_version:q.version,operation:'edit',request_key:'admission-question-0002',content:{...input.content,title:'Revised synthetic question'}};
  const revised=await store.backend.write(p,update,'SYNTHETIC local unverified actor');
  await assert.rejects(()=>store.backend.write(p,{...update,request_key:'admission-question-0003'},'SYNTHETIC actor'),/stale/i);
  await assert.rejects(()=>store.backend.get(other,q.record_id),/not in project/i);
  await assert.rejects(()=>store.dbHandle.query('DELETE FROM local_research.backend_events'),/Immutable/i);
  assert.equal((await store.backend.history(p,q.record_id)).length,2);
  await store.close();store=null;
  store=await openLocalResearch(dir);
  assert.equal((await store.backend.get(p,q.record_id)).version,revised.version);
  assert.equal((await store.backend.get(p,q.record_id,1)).content.title,'Synthetic question');
  assert.equal((await store.listSources()).length,0);
 } finally {if(store)await store.close();await rm(dir,{recursive:true,force:true});}
});
