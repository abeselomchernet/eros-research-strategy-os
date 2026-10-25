import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir,freemem} from 'node:os';
import {join} from 'node:path';
import {openLocalResearch} from '../src/l3_local_research.mjs';
import {closedBackup,validateBackup} from '../src/local_backup.mjs';
test('closed synthetic-store backup rejects open stores, existing destinations and corruption',async()=>{
 assert.ok(freemem()>=1536*1024*1024,'Owner-authorized local floor: 1536 MiB free');
 const root=await mkdtemp(join(tmpdir(),'eros-vs01-backup-'));
 const active=join(root,'active'),archive=join(root,'empty-archive'),backup=join(root,'backup');let store;
 try{
  await mkdir(join(archive,'data/world_bank'),{recursive:true});
  store=await openLocalResearch(active);await store.createProject('SYNTHETIC backup test');
  await assert.rejects(()=>closedBackup(active,backup,archive),/EEXIST/);
  await store.close();store=null;
  const result=await closedBackup(active,backup,archive);assert.ok(result.file_count>0);
  const manifest=await validateBackup(backup);assert.equal(manifest.archiveFiles.length,0);
  await assert.rejects(()=>closedBackup(active,backup,archive),/must not exist/);
  const versionFile=join(backup,'store/PG_VERSION');const original=await readFile(versionFile);
  await writeFile(versionFile,'corrupt');await assert.rejects(()=>validateBackup(backup),/corruption/);
  await writeFile(versionFile,original);await validateBackup(backup);
 }finally{if(store)await store.close();await rm(root,{recursive:true,force:true});}
});
