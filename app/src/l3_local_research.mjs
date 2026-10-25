// L3 personal-only durable research store. Economic data must pass L2 raw-source audit.
import {PGlite} from '@electric-sql/pglite';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {verifyCaptureBytes} from './l5_wdi_review.mjs';
import {buildVerifiedCatalog} from './l2_source_catalog.mjs';
import * as registry from './indicator_registry.mjs';
import {createLocalBackend,BackendError,text as backendText} from './local_backend.mjs';
const required=(v,label,min,max)=>{
 if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw Error('Invalid '+label);
 return v.trim();
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=id=>{if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid ID');return id;};
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/([\[\]()*_!`|])/g,'\\$1').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r?\n/g,' ');
export async function openLocalResearch(directory){
 if(typeof directory!=='string'||!directory.trim())throw Error('A local data directory is required');
 const path=resolve(directory);
 await mkdir(path,{recursive:true});
 const lock=resolve(path,'.eros-store-lock');
 try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('Research database already open; close the other process first');throw e;}
 let db;
 try{db=new PGlite(path);}catch(e){await rm(lock,{recursive:true});throw e;}
 try{
  const schema=await readFile(new URL('../postgres/006_l3_local_research.sql',import.meta.url),'utf8');
  await db.exec(schema);
  await db.exec(await readFile(new URL('../postgres/007_l4_research_browser.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../postgres/008_l5_source_review.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../postgres/009_indicator_ontology.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../postgres/009_alias_history.sql',import.meta.url),'utf8'));
  const backendMigration=await readFile(new URL('../postgres/010_local_backend.sql',import.meta.url),'utf8');
  await db.transaction(tx=>tx.exec(backendMigration));
 }catch(e){await db.close();await rm(lock,{recursive:true});throw e;}
 return {
  backend:createLocalBackend(db),
  directory:path,
  async close(){await db.close();await rm(lock,{recursive:true});},
  async createProject(title,description=''){
   title=required(title,'project title',3,150);
   if(typeof description!=='string'||description.length>4000)throw Error('Invalid description');
   const id=randomUUID();
   await db.query('INSERT INTO local_research.projects(id,title,description) VALUES($1,$2,$3)',[id,title,description]);
   return id;
  },
  async listProjects(){return (await db.query('SELECT * FROM local_research.projects ORDER BY created_at,id')).rows;},
  async importVerifiedWdi(archiveRoot){
   const catalog=await buildVerifiedCatalog(archiveRoot);
   if(catalog.verification.raw_series_sha256!=='verified'||catalog.verification.normalized_values!=='matched_to_archived_raw')throw Error('Source verification required');
   const indicators=new Map(catalog.indicators.map(i=>[i.code,i]));
   let imported=0,already=0;
   await db.exec('BEGIN');
   try{
    for(const s of catalog.series){
     const existing=await db.query('SELECT raw_sha256 FROM local_research.source_snapshots WHERE series_key=$1 AND capture_utc=$2',[s.key,s.capture_utc]);
     if(existing.rows.length){
      if(existing.rows[0].raw_sha256!==s.raw_sha256)throw Error('Conflicting publisher capture: '+s.key);
      already++;continue;
     }
     const meta=indicators.get(s.indicator_uid);
     await db.query(`INSERT INTO local_research.source_snapshots
      (series_key,capture_utc,indicator_uid,country_iso3,endpoint,source_url,raw_sha256,raw_bytes,dataset_lastupdated,licence_status,licence_url,indicator_definition,underlying_providers,observations)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
      [s.key,s.capture_utc,s.indicator_uid,s.country,s.endpoint,s.source_url,s.raw_sha256,s.raw_bytes,
       s.source_dataset_lastupdated,catalog.rights_status,catalog.licence_url,meta.definition,meta.underlying_providers,JSON.stringify(s.observations)]);
     imported++;
    }
    await db.exec('COMMIT');
   }catch(e){await db.exec('ROLLBACK');throw e;}
   return {imported,already,verified_observations:catalog.verification.observation_count,capture_utc:catalog.retrieved_at_utc};
  },
  async listSources(){
   return (await db.query('SELECT series_key,capture_utc,raw_sha256,dataset_lastupdated,licence_status,jsonb_array_length(observations)::int AS observation_count FROM local_research.source_snapshots ORDER BY series_key,capture_utc')).rows;
  },
  async getSource(key,capture){
   const rows=(await db.query('SELECT * FROM local_research.source_snapshots WHERE series_key=$1 AND capture_utc=$2',[key,capture])).rows;
   return rows[0]||null;
  },
  async addNote(projectId,body,source=null,kind='interpretation'){
   if(!['interpretation','factual_extract','hypothesis'].includes(kind))throw Error('Invalid note kind');
   if(kind==='factual_extract'&&!source)throw Error('Factual extracts require an archived citation');
   validId(projectId);body=required(body,'note',1,20000);
   const found=await db.query('SELECT id FROM local_research.projects WHERE id=$1',[projectId]);
   if(!found.rows.length)throw Error('Project not found');
   let key=null,capture=null;
   if(source){
    key=required(source.key,'source key',4,100);capture=required(source.capture_utc,'source capture',10,50);
    if(!await this.getSource(key,capture))throw Error('Source not in verified local archive');
   }
   const id=randomUUID();
   await db.query('INSERT INTO local_research.notes(id,project_id,body,series_key,capture_utc,kind) VALUES($1,$2,$3,$4,$5,$6)',[id,projectId,body,key,capture,kind]);
   return id;
  },
  async editNote(noteId,body){
   validId(noteId);body=required(body,'note',1,20000);
   const r=await db.query('UPDATE local_research.notes SET body=$2,updated_at=now() WHERE id=$1 RETURNING id',[noteId,body]);
   if(!r.rows.length)throw Error('Note not found');
  },
  async getProject(projectId){
   validId(projectId);
   const p=(await db.query('SELECT * FROM local_research.projects WHERE id=$1',[projectId])).rows[0];
   if(!p)return null;
   const notes=(await db.query('SELECT * FROM local_research.notes WHERE project_id=$1 ORDER BY created_at,id',[projectId])).rows;
   const sources=(await db.query('SELECT s.* FROM local_research.source_snapshots s JOIN local_research.project_sources p USING(series_key,capture_utc) WHERE p.project_id=$1 ORDER BY s.series_key',[projectId])).rows;
   return {...p,notes,sources};
  },
  async addSourceReview(packet){
   verifyCaptureBytes(packet);
   return db.transaction(async tx=>{
    const previous=(await tx.query('SELECT id FROM local_research.source_reviews WHERE packet=$1::jsonb ORDER BY created_at,id LIMIT 1',[JSON.stringify(packet)])).rows[0];if(previous)return previous.id;
    const id=randomUUID();await tx.query('INSERT INTO local_research.source_reviews(id,captured_at,change_count,packet) VALUES($1,$2,$3,$4::jsonb)',[id,packet.captured_at_utc,packet.comparison.change_count+packet.metadata_changes.length,JSON.stringify(packet)]);return id;
   });
  },
  async listSourceReviews(){return (await db.query('SELECT id,version,captured_at,status,analyst_note,change_count,created_at,updated_at FROM local_research.source_reviews ORDER BY created_at DESC,id')).rows;},
  async getSourceReview(id){validId(id);const row=(await db.query('SELECT * FROM local_research.source_reviews WHERE id=$1',[id])).rows[0];if(row)verifyCaptureBytes(row.packet);return row||null;},
  async sourceReviewHistory(id){validId(id);if(!await this.getSourceReview(id))throw new BackendError(404,'NOT_FOUND','Source review not found');return (await db.query('SELECT * FROM local_research.source_review_events WHERE review_id=$1 ORDER BY version',[id])).rows;},
  async reviewSourceCapture(id,note,expectedVersion=1,actor='local caller; identity not verified'){
   validId(id);note=required(note,'analyst review note',3,4000);backendText(actor,'actor_claim',1,150);
   if(!Number.isInteger(expectedVersion)||expectedVersion<1)throw new BackendError(400,'VALIDATION','Expected version required');
   return db.transaction(async tx=>{
    const row=(await tx.query('SELECT * FROM local_research.source_reviews WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!row)throw new BackendError(404,'NOT_FOUND','Source review not found');
    if(row.version!==expectedVersion)throw new BackendError(409,'VERSION_CONFLICT','Review version conflict');
    await tx.query("INSERT INTO local_research.source_review_events(review_id,version,event_type,analyst_note,actor_claim) VALUES($1,$2,'review_note',$3,$4)",[id,expectedVersion+1,note,actor]);
    await tx.query("UPDATE local_research.source_reviews SET status='reviewed',analyst_note=$2,version=version+1,updated_at=now() WHERE id=$1 AND version=$3",[id,note,expectedVersion]);
    return {reviewed:true,promoted:false,version:expectedVersion+1};
   });
  },
  async updateProject(projectId,fields){
   validId(projectId);
   const current=await this.getProject(projectId);if(!current)throw Error('Project not found');
   const next={...current,...fields};next.title=required(next.title,'project title',3,150);
   for(const k of ['description','objectives','questions','reference_notes'])if(typeof next[k]!=='string'||next[k].length>4000)throw Error('Invalid '+k);
   if(!['active','paused','archived'].includes(next.status))throw Error('Invalid project status');
   await db.query('UPDATE local_research.projects SET title=$2,description=$3,objectives=$4,questions=$5,reference_notes=$6,status=$7,updated_at=now() WHERE id=$1',[projectId,next.title,next.description,next.objectives,next.questions,next.reference_notes,next.status]);
   return this.getProject(projectId);
  },
  async attachSource(projectId,source){
   if(!await this.getProject(projectId))throw Error('Project not found');
   if(!source||!await this.getSource(source.key,source.capture_utc))throw Error('Source not in verified local archive');
   await db.query('INSERT INTO local_research.project_sources(project_id,series_key,capture_utc) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[projectId,source.key,source.capture_utc]);
  },
  async exportBrief(projectId){
   const p=await this.getProject(projectId);
   if(!p)throw Error('Project not found');
   const captures=new Map(p.sources.map(s=>[s.series_key+'|'+new Date(s.capture_utc).toISOString(),s]));
   for(const n of p.notes)if(n.series_key){const s=await this.getSource(n.series_key,n.capture_utc);if(!s)throw Error('Missing archived citation');captures.set(s.series_key+'|'+new Date(s.capture_utc).toISOString(),s);}
   const rights=await this.backend.rights(projectId,[...captures.values()].map(s=>({id:s.series_key+'|'+new Date(s.capture_utc).toISOString(),kind:'snapshot',target:{series_key:s.series_key,capture_utc:new Date(s.capture_utc).toISOString()}})),'local_export');
   const lines=['# '+esc(p.title),'','**Scope:** Personal, local research draft; not institutionally validated.','',esc(p.description),'','## Research notes',''];
   lines.push('**Project status:** '+p.status,'**Created:** '+new Date(p.created_at).toISOString(),'**Updated:** '+new Date(p.updated_at).toISOString(),'','## Objectives',esc(p.objectives),'','## Questions',esc(p.questions),'','## Analyst references',esc(p.reference_notes),'');
   for(const s of p.sources){
    lines.push('## Archived indicator '+esc(s.series_key),'','World Bank WDI; '+esc(s.underlying_providers),'**Definition:** '+esc(s.indicator_definition),'**Citation:** '+s.source_url,'**API endpoint:** '+s.endpoint,'**Capture UTC:** '+new Date(s.capture_utc).toISOString(),'**Dataset update (not observation publication date):** '+String(s.dataset_lastupdated).slice(0,10),'**SHA-256:** '+s.raw_sha256,'**Rights:** '+s.licence_status+' '+s.licence_url,'','| Year | Publisher value |','| --- | --- |');
    for(const o of s.observations)lines.push('| '+o.year+' | '+(o.value===null?'Missing':o.value)+' |');
    lines.push('');
   }
   if(!p.notes.length)lines.push('No research notes recorded.','');
   for(const n of p.notes){
    lines.push('### Note '+n.id,'','**Classification:** '+n.kind+' (analyst-authored; not external verification)','',esc(n.body),'');
    if(n.series_key){
     const s=await this.getSource(n.series_key,n.capture_utc);
     if(!s)throw Error('Missing archived citation');
     lines.push('**Source:** '+esc(s.series_key)+' · '+s.source_url,
      '**API capture:** '+new Date(s.capture_utc).toISOString()+' · **WDI dataset updated:** '+String(s.dataset_lastupdated).slice(0,10),
      '**Raw SHA-256:** '+s.raw_sha256+' · **Rights:** '+s.licence_status,'');
    }
   }
   lines.push('## Evidence boundaries','','Archived WDI values are actual publisher data but not independently validated. No unverified revisions, interpolated values or institutional endorsement are claimed. Source rights/third-party exceptions require review.');
   for(const r of rights)if(r.warning)lines.push('**Rights warning:** '+esc(r.evidence_id)+' — '+r.warning);
   return lines.join('\n');
  },
  // C1 Indicator Registry & Ontology Governance
  async listCanonicalIndicators(){return registry.listCanonicalIndicators(db);},
  async getCanonicalIndicator(code){return registry.getCanonicalIndicator(db,code);},
  async listSourceProviders(){return registry.listSourceProviders(db);},
  async listProviderDatasets(providerId=null){return registry.listProviderDatasets(db,providerId);},
  async listIndicatorAliases(filter={}){return registry.listIndicatorAliases(db,filter);},
  async getIndicatorAlias(providerId,nativeCode,providerDatasetId=null){return registry.getIndicatorAlias(db,providerId,nativeCode,providerDatasetId);},
  async listProviderSeries(filter={}){return registry.listProviderSeries(db,filter);},
  async resolveIndicator(providerId,nativeCode,providerDatasetId=null){return registry.resolveNativeIndicator(db,providerId,nativeCode,providerDatasetId);},
  async registerCanonicalIndicator(def){return registry.registerCanonicalIndicator(db,def);},
  async registerIndicatorAlias(alias){return registry.registerIndicatorAlias(db,alias);},
  async promoteIndicatorAlias(aliasId,reviewer,notes,evidence=''){return registry.promoteIndicatorAlias(db,aliasId,reviewer,notes,evidence);},
  async rejectIndicatorAlias(aliasId,reviewer,notes){return registry.rejectIndicatorAlias(db,aliasId,reviewer,notes);},
  async getIndicatorAliasHistory(aliasId){return registry.getIndicatorAliasHistory(db,aliasId);},
  async revokeApprovedAlias(aliasId,reviewer,reason){return registry.revokeApprovedAlias(db,aliasId,reviewer,reason);},
  async supersedeApprovedAlias(aliasId,newAliasId,reviewer,reason){return registry.supersedeApprovedAlias(db,aliasId,newAliasId,reviewer,reason);},
  get dbHandle(){return db;}
 };
}
