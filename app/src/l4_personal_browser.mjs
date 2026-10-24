// Personal single-workspace browser. No institutional identity or network data fetches.
import http from 'node:http';
import {captureWdiReview} from './l5_wdi_review.mjs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,mkdir,rm} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {openLocalResearch} from './l3_local_research.mjs';
import {assertLocalRequest} from './l4_loopback_guard.mjs';
import {buildVerifiedCatalog} from './l2_source_catalog.mjs';
import {auditLocalSnapshots} from './l4_snapshot_integrity.mjs';
import {localBackendRoute} from './local_backend_routes.mjs';
import {BackendError} from './local_backend.mjs';
const secret=()=>randomBytes(32).toString('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export async function startResearchBrowser({directory,archiveRoot=resolve(import.meta.dirname,'..'),port=4084,unlockCode,sessionMs=3600000,captureMode='disabled',captureTransport}){
 if(!['disabled','fixture'].includes(captureMode))throw Error('Live source acquisition is not supported by this local candidate');
 if(captureMode==='fixture'&&typeof captureTransport!=='function')throw Error('Fixture transport required');
 if(typeof unlockCode!=='string'||unlockCode.length<16)throw Error('Unlock code must contain at least 16 characters');
 const data=resolve(directory),rel=relative(archiveRoot,data);
 if(!rel.startsWith('..')&&!rel.includes(':'))throw Error('Research data must be outside application files');
 await mkdir(data,{recursive:true});
 const lock=join(data,'.l4-browser-lock');
 try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('Research database already owned; close its browser before opening again');throw e;}
 let store,server,closed=false;
 const sessions=new Map();let consumed=false,attempts=0;
 const assets=new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/styles.css',['styles.css','text/css']]]);
 try{
  store=await openLocalResearch(data);await store.importVerifiedWdi(archiveRoot);await store.close();store=null;
  const integrity=await auditLocalSnapshots(data,archiveRoot);
  const catalog=await buildVerifiedCatalog(archiveRoot);
  if(integrity.status!=='PASS')throw Error('Stored source integrity failed; inspect with L4 audit CLI');
  store=await openLocalResearch(data);
  // Serialize requests because a personal PGlite instance has one database session.
  let pending=Promise.resolve();
  server=http.createServer({requestTimeout:15000,headersTimeout:10000},(req,res)=>{pending=pending.then(()=>handle(req,res)).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('Local request failed');});});
  async function handle(req,res){
   const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
   const send=(code,value,type='application/json',extra={})=>{res.writeHead(code,{...headers,'Content-Type':type,...extra});res.end(req.method==='HEAD'?'':type==='application/json'?JSON.stringify(value):value);};
   let actualPort=server.address().port;
   try{assertLocalRequest(req,actualPort);}catch{return send(403,{error:'Local request boundary rejected'});}
   try{
    const url=new URL(req.url,'http://127.0.0.1:'+actualPort),path=url.pathname;
    if(assets.has(path)&&['GET','HEAD'].includes(req.method)){const [file,type]=assets.get(path);return send(200,await readFile(join(archiveRoot,'public/l4',file)),type);}
    if(!path.startsWith('/api/'))return send(404,{error:'Not found'});
    let body={};
    if(['POST','PATCH'].includes(req.method)){
     if(req.headers['content-type']!=='application/json')return send(415,{error:'JSON required'});
     let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>40000){send(413,{error:'Request too large'});return;}chunks.push(c);}
     try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(400,{error:'Invalid JSON'});}
     if(!body||Array.isArray(body)||typeof body!=='object')return send(400,{error:'JSON object required'});
    }
    if(path==='/api/unlock'&&req.method==='POST'){
     if(consumed||attempts>=10||!equal(body.code,unlockCode)){attempts++;return send(401,{error:'Unlock rejected; restart for a new one-time code if consumed'});}
     consumed=true;unlockCode=null;const id=secret(),csrf=secret();sessions.set(id,{csrf,expires:Date.now()+sessionMs});
     return send(200,{csrf,expires_at:new Date(sessions.get(id).expires).toISOString(),server_time:new Date().toISOString()},'application/json',{'Set-Cookie':'eros_l4='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+Math.floor(sessionMs/1000)});
    }
    const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('eros_l4='))?.slice(8);
    const session=sessions.get(id);
    if(!session||session.expires<=Date.now()){sessions.delete(id);return send(401,{error:'Local session required'});}
    if(!['GET','HEAD'].includes(req.method)&&!equal(req.headers['x-eros-csrf'],session.csrf))return send(403,{error:'CSRF proof required'});
    if(path==='/api/session'&&req.method==='GET')return send(200,{csrf:session.csrf,expires_at:new Date(session.expires).toISOString(),server_time:new Date().toISOString(),scope:'Personal local workspace only; no institutional roles'});
    if(path==='/api/logout'&&req.method==='POST'){sessions.delete(id);return send(200,{closed:true},'application/json',{'Set-Cookie':'eros_l4=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
    if(await localBackendRoute({store,path,method:req.method,body,url,send}))return;
    if(path==='/api/home'&&req.method==='GET'){
     const projects=await store.listProjects(),recentNotes=[];
     for(const p of projects){const detail=await store.getProject(p.id);for(const n of detail.notes)recentNotes.push({project:p.title,body:n.body.slice(0,180),kind:n.kind,updated_at:n.updated_at});}
     recentNotes.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
     return send(200,{projects,recentNotes:recentNotes.slice(0,8),sources:await store.listSources(),integrity,scope:'Personal, local research; source rights pending review; one archived publisher capture'});
    }
    if(path==='/api/ontology/indicators'&&req.method==='GET')return send(200,await store.listCanonicalIndicators());
    if(path==='/api/ontology/aliases'&&req.method==='GET'){
     const providerId=url.searchParams.get('provider_id')||null;
     const mappingStatus=url.searchParams.get('status')||null;
     return send(200,await store.listIndicatorAliases({providerId,mappingStatus}));
    }
    if(path==='/api/ontology/providers'&&req.method==='GET')return send(200,await store.listSourceProviders());
    if(path==='/api/ontology/datasets'&&req.method==='GET')return send(200,await store.listProviderDatasets(url.searchParams.get('provider_id')));
    if(path==='/api/ontology/series'&&req.method==='GET')return send(200,await store.listProviderSeries({countryIso3:url.searchParams.get('country')}));
    if(path==='/api/ontology/resolve'&&req.method==='GET'){
     const providerId=url.searchParams.get('provider_id');
     const nativeCode=url.searchParams.get('code');
     const datasetId=url.searchParams.get('dataset_id')||null;
     if(!providerId||!nativeCode)return send(400,{error:'provider_id and code query parameters required'});
     const resolved=await store.resolveIndicator(providerId,nativeCode,datasetId);
     if(resolved.status==='ambiguous')return send(400,resolved);
     return send(200,resolved);
    }
    if(path==='/api/ontology/aliases'&&req.method==='POST')return send(201,await store.registerIndicatorAlias(body));
    const aliasHistory=path.match(/^\/api\/ontology\/aliases\/([0-9a-f-]{36})\/history$/i);
    if(aliasHistory&&req.method==='GET')return send(200,await store.getIndicatorAliasHistory(aliasHistory[1]));
    const aliasPatch=path.match(/^\/api\/ontology\/aliases\/([0-9a-f-]{36})\/(promote|reject|revoke|supersede)$/i);
    if(aliasPatch&&req.method==='POST'){
     const [,aliasId,action]=aliasPatch;
     if(action==='promote')return send(200,await store.promoteIndicatorAlias(aliasId,body.reviewer,body.notes||'',body.evidence||''));
     if(action==='reject')return send(200,await store.rejectIndicatorAlias(aliasId,body.reviewer,body.notes||''));
     if(action==='revoke')return send(200,await store.revokeApprovedAlias(aliasId,body.reviewer,body.reason||''));
     if(action==='supersede')return send(200,await store.supersedeApprovedAlias(aliasId,body.new_alias_id,body.reviewer,body.reason||''));
    }
    if(path==='/api/sources'&&req.method==='GET'){const result=[];for(const s of await store.listSources()){const item=await store.getSource(s.series_key,s.capture_utc);const meta=catalog.indicators.find(i=>i.code===item.indicator_uid);result.push({...item,indicator_name:meta.name,unit:meta.unit});};return send(200,result);}
    if(path==='/api/projects'&&req.method==='POST')return send(201,{id:await store.createProject(body.title,body.description||'')});
    if(path==='/api/source-reviews'&&req.method==='GET')return send(200,await store.listSourceReviews());
    if(path==='/api/source-reviews'&&req.method==='POST'){
     if(captureMode!=='fixture')return send(403,{error:'External acquisition disabled by operating policy',code:'ACQUISITION_DISABLED'});
     const packet=await captureWdiReview(archiveRoot,{fetchImpl:captureTransport});
     packet.acquisition_mode='injected_fixture';packet.catalog.scope='Injected fixture replay; no live acquisition or new publisher vintage claimed';
     return send(201,{id:await store.addSourceReview(packet),provenance:'injected fixture transport; not a live capture',promoted:false});
    }
    const reviewHistory=path.match(/^\/api\/source-reviews\/([0-9a-f-]{36})\/history$/i);
    if(reviewHistory&&req.method==='GET')return send(200,await store.sourceReviewHistory(reviewHistory[1]));
    const review=path.match(/^\/api\/source-reviews\/([0-9a-f-]{36})$/i);
    if(review){const item=await store.getSourceReview(review[1]);if(!item)return send(404,{error:'Source review not found'});if(req.method==='GET')return send(200,item);if(req.method==='PATCH'){if(!Number.isInteger(body.expected_version))throw new BackendError(400,'VALIDATION','expected_version required');return send(200,await store.reviewSourceCapture(review[1],body.analyst_note,body.expected_version,body.actor_claim||'local unlocked session; identity unverified'));}}
    const m=path.match(/^\/api\/projects\/([0-9a-f-]{36})(?:\/(sources|notes|brief.md)(?:\/([0-9a-f-]{36}))?)?$/i);
    if(!m)return send(404,{error:'Route not found'});
    const [,pid,action,nid]=m;const project=await store.getProject(pid);
    if(!project)return send(404,{error:'Project not found'});
    if(!action&&req.method==='GET')return send(200,project);
    if(!action&&req.method==='PATCH')return send(200,await store.updateProject(pid,body));
    if(action==='sources'&&req.method==='POST'){await store.attachSource(pid,body);return send(201,{attached:true});}
    if(action==='notes'&&!nid&&req.method==='POST')return send(201,{id:await store.addNote(pid,body.body,body.source||null,body.kind)});
    if(action==='notes'&&nid&&req.method==='PATCH'){
     if(!project.notes.some(n=>n.id===nid))return send(404,{error:'Note not in project'});
     await store.editNote(nid,body.body);return send(200,{edited:true});
    }
    if(action==='brief.md'&&req.method==='GET')return send(200,await store.exportBrief(pid),'text/markdown; charset=utf-8',{'Content-Disposition':'attachment; filename="eros-research-'+pid+'.md"'});
    return send(405,{error:'Method not allowed'});
   }catch(e){if(e instanceof BackendError)return send(e.status,{error:e.message,code:e.code});if(/^\/api\/projects\/[^/]+\/backend\//.test(req.url)){if(['23502','23503','23514','22P02'].includes(e.code))return send(400,{error:'Invalid backend record or reference',code:'VALIDATION'});if(['23505','P0001'].includes(e.code))return send(409,{error:'Backend invariant conflict',code:'CONFLICT'});return send(500,{error:'Local backend operation failed',code:'FAILURE'});}return send(400,{error:e.message});}
  }
  await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
  return {url:'http://127.0.0.1:'+server.address().port,address:server.address(),integrity,async close(){if(closed)return;closed=true;sessions.clear();await new Promise(ok=>{server.close(ok);server.closeAllConnections();});await pending;await store.close();await rm(lock,{recursive:true});}};
 }catch(e){if(server?.listening)await new Promise(ok=>server.close(ok));if(store)await store.close();await rm(lock,{recursive:true});throw e;}
}
