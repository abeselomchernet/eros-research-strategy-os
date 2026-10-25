import {BackendError} from './local_backend.mjs';
// Called only after the L4 authentication and CSRF boundary.
export async function localBackendRoute({store,path,method,body,url,send}){
 if(path==='/api/operations/status'&&method==='GET'){
  send(200,{store:'open',backup_supported:'closed_store_operator_cli',live_copy_permitted:false,instructions:['Stop the Research Browser gracefully (Ctrl+C); wait for close.','node bin/local-backup.mjs backup <closed-store> <NEW-backup-directory>','node bin/local-backup.mjs restore <backup-directory> <NEW-store-directory>','Start the browser with the separate restored directory; a fresh one-time code is required.'],last_backup:'not_tracked_by_running_process',limits:'No fsync, power-loss or multi-process safety claim'});return true;
 }
 const m=path.match(/^\/api\/projects\/([^/]+)\/backend\/(records|evidence|exports)(?:\/([^/]+))?(?:\/(history|lineage|content.md))?$/);
 if(!m)return false;
 const [,p,resource,r,action]=m,b=store.backend;
 if(resource==='records'){
  if(!r&&method==='GET'){send(200,await b.list(p,url.searchParams.get('kind')));return true;}
  if(!r&&method==='POST'){const {actor_claim,...input}=body;send(201,await b.write(p,input,actor_claim));return true;}
  if(r&&method==='GET'){
   const raw=url.searchParams.get('version'),version=raw===null?null:Number(raw);
   if(action==='history')send(200,await b.history(p,r));
   else if(action==='lineage')send(200,await b.lineage(p,r,version));
   else if(!action)send(200,await b.get(p,r,version));
   else throw new BackendError(404,'NOT_FOUND','Route not found');return true;
  }
 }
 if(resource==='evidence'){
  if(!r&&method==='POST'){send(201,await b.addEvidence(p,body));return true;}
  if(method==='GET'&&!action){send(200,r?await b.getEvidence(p,r):await b.listEvidence(p));return true;}
 }
 if(resource==='exports'){
  if(!r&&method==='POST'){const {actor_claim,...input}=body;send(201,await b.exportFrozen(p,input,actor_claim));return true;}
  if(method==='GET'){
   if(!r)send(200,await b.listExports(p));
   else {const item=await b.getExport(p,r);if(action==='content.md')send(200,item.content,'text/markdown; charset=utf-8',{'Content-Disposition':'attachment; filename="eros-frozen-'+item.id+'.md"'});else if(!action)send(200,item);else throw new BackendError(404,'NOT_FOUND','Route not found');}return true;
  }
 }
 throw new BackendError(405,'METHOD_NOT_ALLOWED','Method not allowed');
}
