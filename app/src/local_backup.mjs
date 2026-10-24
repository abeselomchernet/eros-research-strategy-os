// Closed-store copy only. Does not open the source database.
import {mkdir,readdir,lstat,readFile,writeFile,copyFile,realpath,rm} from 'node:fs/promises';
import {resolve,relative,join,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {freemem} from 'node:os';
import {openLocalResearch} from './l3_local_research.mjs';
import {auditLocalSnapshots} from './l4_snapshot_integrity.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const exists=async p=>{try{await lstat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
function inside(root,name){if(typeof name!=='string'||name.includes('\\')||name.includes(':')||name.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Unsafe manifest path');const p=resolve(root,name),r=relative(root,p);if(isAbsolute(r)||r==='..'||r.startsWith('..'+sep))throw Error('Unsafe manifest path');return p;}
function allowed(path){const p=resolve(path);if(/(?:^|[\\/])(?:Ethiopia Research Strategy OS|CAD_Phase2_Starter_Repo|EROS_CAD_Adaptation_Architecture_Review)(?:[\\/]|$)/i.test(p))throw Error('Protected original path');return p;}
async function tree(root,prefix=''){
 const result=[];for(const e of await readdir(join(root,prefix),{withFileTypes:true})){
  if(['.eros-store-lock','.l4-browser-lock'].includes(e.name))continue;
  if(/(?:^\.env(?:\.|$)|unlock|credential|secret)/i.test(e.name))throw Error('Secret-like path refused without reading');
  const path=prefix?prefix+'/'+e.name:e.name;const st=await lstat(join(root,path));
  if(st.isSymbolicLink())throw Error('Links not permitted in backup');
  if(st.isDirectory())result.push(...await tree(root,path));else if(st.isFile())result.push({path,bytes:st.size,sha256:digest(await readFile(join(root,path)))});else throw Error('Unsupported file type');
 }return result.sort((a,b)=>a.path.localeCompare(b.path));
}
async function directories(root,prefix=''){
 const result=[];for(const e of await readdir(join(root,prefix),{withFileTypes:true})){
  if(['.eros-store-lock','.l4-browser-lock'].includes(e.name))continue;
  const path=prefix?prefix+'/'+e.name:e.name;const st=await lstat(join(root,path));
  if(st.isSymbolicLink())throw Error('Links not permitted in backup');
  if(st.isDirectory()){result.push(path);result.push(...await directories(root,path));}
 }return result.sort();
}
async function safeRoot(path){path=allowed(path);if((await lstat(path)).isSymbolicLink())throw Error('Root links not permitted');return allowed(await realpath(path));}
async function newDestination(path,source){path=allowed(path);if(await exists(path))throw Error('Destination must not exist');const parent=allowed(await realpath(resolve(path,'..')));const resolved=join(parent,path.split(/[\\/]/).at(-1)),rel=relative(source,resolved);if(!rel||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)))throw Error('Destination cannot be inside source');return allowed(resolved);}
export async function closedBackup(source,destination,archiveRoot){
 source=await safeRoot(source);destination=await newDestination(destination,source);archiveRoot=await safeRoot(archiveRoot);
 const held=[];
 try{
  for(const name of ['.l4-browser-lock','.eros-store-lock']){const lock=join(source,name);await mkdir(lock);held.push(lock);}
  const files=await tree(source),archiveFiles=await tree(join(archiveRoot,'data/world_bank')),storeDirectories=await directories(source),archiveDirectories=await directories(join(archiveRoot,'data/world_bank'));
  if(!files.some(f=>f.path==='PG_VERSION'))throw Error('Not a closed PGlite store');
  await mkdir(destination);await mkdir(join(destination,'store'));await mkdir(join(destination,'archive/data/world_bank'),{recursive:true});
  for(const name of storeDirectories)await mkdir(inside(join(destination,'store'),name),{recursive:true});
  for(const name of archiveDirectories)await mkdir(inside(join(destination,'archive/data/world_bank'),name),{recursive:true});
  for(const f of files){const target=inside(join(destination,'store'),f.path);await mkdir(resolve(target,'..'),{recursive:true});await copyFile(inside(source,f.path),target);}
  for(const f of archiveFiles){const target=inside(join(destination,'archive/data/world_bank'),f.path);await mkdir(resolve(target,'..'),{recursive:true});await copyFile(inside(join(archiveRoot,'data/world_bank'),f.path),target);}
  const manifest={schema:'eros-closed-backup-v1',created_at:new Date().toISOString(),files,archiveFiles,storeDirectories,archiveDirectories,scope:'Closed local database and archived WDI bytes; no unlock code or secrets; no power-loss guarantee'};
  await writeFile(join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  await validateBackup(destination);return {destination,manifest_sha256:digest(await readFile(join(destination,'manifest.json'))),file_count:files.length};
 }finally{for(const lock of held.reverse())await rm(lock,{recursive:true});}
}
export async function validateBackup(backup){
 backup=await safeRoot(backup);if((await lstat(join(backup,'manifest.json'))).isSymbolicLink())throw Error('Manifest links not permitted');
 const bytes=await readFile(join(backup,'manifest.json'));if(bytes.length>4000000)throw Error('Backup manifest too large');const manifest=JSON.parse(bytes);
 if(manifest.schema!=='eros-closed-backup-v1'||!Array.isArray(manifest.files)||!Array.isArray(manifest.archiveFiles)||!Array.isArray(manifest.storeDirectories)||!Array.isArray(manifest.archiveDirectories)||!manifest.files.length)throw Error('Invalid backup manifest');
 for(const [root,entries] of [[join(backup,'store'),manifest.files],[join(backup,'archive/data/world_bank'),manifest.archiveFiles]]){
  const actual=await tree(root);if(JSON.stringify(actual)!==JSON.stringify(entries))throw Error('Backup corruption or unexpected file');for(const f of entries)inside(root,f.path);
 }
 for(const [root,entries] of [[join(backup,'store'),manifest.storeDirectories],[join(backup,'archive/data/world_bank'),manifest.archiveDirectories]]){
  if(JSON.stringify(await directories(root))!==JSON.stringify(entries))throw Error('Backup directory corruption');
  for(const name of entries)inside(root,name);
 }return manifest;
}
export async function restoreBackup(backup,destination,{minimumFreeMiB=2048}={}){
 backup=await safeRoot(backup);const manifest=await validateBackup(backup);destination=await newDestination(destination,backup);
 if(!Number.isInteger(minimumFreeMiB)||minimumFreeMiB<1536)throw Error('Invalid restore RAM floor');
 if(freemem()<minimumFreeMiB*1024*1024)throw Error('Restore verification requires at least '+minimumFreeMiB+' MiB free physical RAM');
 await mkdir(destination);
 for(const name of manifest.storeDirectories)await mkdir(inside(destination,name),{recursive:true});
 for(const f of manifest.files){const target=inside(destination,f.path);await mkdir(resolve(target,'..'),{recursive:true});await copyFile(inside(join(backup,'store'),f.path),target);}
 let store;try{
  store=await openLocalResearch(destination);
  const counts={};for(const table of ['backend_records','backend_events','backend_links','evidence_refs','frozen_exports','source_review_events'])counts[table]=(await store.dbHandle.query('SELECT count(*)::int AS n FROM local_research.'+table)).rows[0].n;
  for(const p of await store.listProjects()){
   for(const e of await store.backend.listEvidence(p.id))await store.backend.getEvidence(p.id,e.id);
   for(const r of await store.backend.list(p.id))await store.backend.lineage(p.id,r.record_id,r.version);
   for(const e of await store.backend.listExports(p.id))await store.backend.getExport(p.id,e.id,{auditOnly:true});
  }
  for(const r of await store.listSourceReviews())await store.getSourceReview(r.id);
  await store.close();store=null;
  const integrity=await auditLocalSnapshots(destination,join(backup,'archive'));if(integrity.status!=='PASS')throw Error('Restored source integrity failed');
  return {destination,counts,integrity,backup_preserved:true,scope:'Schema replay, immutable history/citation/export hash reads, archived source audit; not power-loss or multiwriter proof'};
 }finally{if(store)await store.close();}
}
