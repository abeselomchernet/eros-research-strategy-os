import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir,freemem} from 'node:os';
import {join} from 'node:path';
import {startResearchBrowser} from '../src/l4_personal_browser.mjs';
import {openLocalResearch} from '../src/l3_local_research.mjs';
import {closedBackup,restoreBackup} from '../src/local_backup.mjs';

test('synthetic browser refuses source capture and restores without an archive', async () => {
  assert.ok(freemem() >= 1536 * 1024 * 1024, 'Owner-authorized local floor: 1536 MiB free');
  const root=await mkdtemp(join(tmpdir(),'eros-vs01-synthetic-'));
  const active=join(root,'active'),backup=join(root,'backup'),restored=join(root,'restored');
  let app,store;
  try {
    app=await startResearchBrowser({directory:active,port:0,unlockCode:'synthetic-test-unlock-code',dataMode:'synthetic-records'});
    const home=await fetch(app.url+'/api/home');
    assert.equal(home.status,401);
    const login=await fetch(app.url+'/api/unlock',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json'},body:JSON.stringify({code:'synthetic-test-unlock-code'})});
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
    const session=await fetch(app.url+'/api/home',{headers:{Cookie:cookie}});
    const overview=await session.json();
    assert.equal(session.status,200);assert.equal(overview.data_mode,'synthetic-records');assert.equal(overview.sources.length,0);
    const capture=await fetch(app.url+'/api/source-reviews',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/json',Cookie:cookie,'X-EROS-CSRF':csrf},body:'{}'});
    assert.equal(capture.status,403);assert.equal((await capture.json()).code,'ACQUISITION_DISABLED');
    await app.close();app=null;
    store=await openLocalResearch(active);await store.createProject('SYNTHETIC browser restore proof');await store.close();store=null;
    const saved=await closedBackup(active,backup,root,{dataMode:'synthetic-records'});
    const result=await restoreBackup(backup,restored,{minimumFreeMiB:1536});
    assert.equal(saved.file_count>0,true);assert.equal(result.integrity.data_mode,'synthetic-records');
    assert.equal(result.integrity.checked_series,0);assert.equal(result.counts.backend_records,0);
    store=await openLocalResearch(restored);assert.equal((await store.listProjects()).length,1);await store.close();store=null;
  } finally { if(app)await app.close();if(store)await store.close();await rm(root,{recursive:true,force:true}); }
});
