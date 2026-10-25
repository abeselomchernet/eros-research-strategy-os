// EROS L2: read-only, hash-verified catalog of ACTUAL archived World Bank WDI responses.
// Never infer that a source dataset update date is an observation publication date.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {validateIndicatorInput} from './l1_indicator_logic.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function assert(condition,message){if(!condition)throw Error('Source audit: '+message);}
function inside(root,name){
 assert(typeof name==='string' && !name.includes('\\'), 'invalid relative path');
 const absolute=resolve(root,name),rel=relative(root,absolute);
 assert(rel && rel!=='..' && !rel.startsWith('..'+sep) && !isAbsolute(rel),'path escapes source archive');
 return absolute;
}
async function verifiedJson(root,entry){
 const bytes=await readFile(inside(root,entry.raw_file));
 assert(sha(bytes)===entry.raw_sha256,'raw SHA-256 mismatch: '+entry.raw_file);
 assert(bytes.length===entry.raw_bytes,'raw byte-length mismatch: '+entry.raw_file);
 return JSON.parse(bytes.toString('utf8'));
}
export async function buildVerifiedCatalog(projectRoot){
 const root=resolve(projectRoot);
 const manifest=JSON.parse(await readFile(inside(root,'data/world_bank/SOURCE_MANIFEST.json'),'utf8'));
 assert(manifest.schema==='eros-world-bank-wdi-public-archive-v1','unsupported manifest schema');
 assert(manifest.scope==='actual public World Bank API data, NOT synthetic','wrong archive scope');
 const indicators=[];
 for(const [code,meta] of Object.entries(manifest.indicators)){
  const [header,records]=await verifiedJson(root,meta.provenance);
  assert(header.total===1 && records.length===1,'indicator metadata count mismatch');
  const record=records[0];
  assert(record.id===code && record.source.id==='2','indicator ID or WDI source mismatch');
  assert(record.sourceNote===meta.sourceNote && record.sourceOrganization===meta.sourceOrganization,'metadata differs from original API');
  indicators.push({code,name:record.name,unit:record.unit||null,definition:record.sourceNote,
   underlying_providers:record.sourceOrganization,metadata_endpoint:meta.provenance.endpoint,
   metadata_raw_sha256:meta.provenance.raw_sha256,source_dataset:'World Development Indicators',
   methodology_review:'not_independently_reviewed',licence_review:'provider_and_third_party_exceptions_require_review'});
 }
 const series=[];
 for(const item of manifest.series){
  const [header,records]=await verifiedJson(root,item.provenance);
  assert(item.provider_source_id===2 && item.country && manifest.indicators[item.indicator_uid],'unknown source or indicator');
  assert(header.lastupdated===item.wdi_api_lastupdated,'source update date mismatch');
  assert(records.length===item.observations,'observation count mismatch');
  assert(records.every(r=>r.countryiso3code===item.country && r.indicator.id===item.indicator_uid),'wrong series provenance');
  const proposal=validateIndicatorInput(JSON.parse(await readFile(inside(root,item.normalized_file),'utf8')));
  assert(proposal.dataset_kind==='public_unverified' && proposal.country_iso3===item.country && proposal.indicator_uid===item.indicator_uid,'normalized identity mismatch');
  const values=new Map(proposal.observations.map(p=>[String(p.period),p.value]));
  assert(values.size===records.length && records.every(r=>values.has(r.date)&&Object.is(values.get(r.date),r.value)),'normalized values differ from archived raw API');
  series.push({key:item.country+'/'+item.indicator_uid,country:item.country,country_name:item.country_name,
   indicator_uid:item.indicator_uid,observation_count:records.length,missing_count:records.filter(r=>r.value===null).length,
   capture_utc:item.capture_utc,source_dataset_lastupdated:item.wdi_api_lastupdated,
   endpoint:item.provenance.endpoint,raw_sha256:item.provenance.raw_sha256,raw_bytes:item.provenance.raw_bytes,
   source_url:item.citation_url,normalized_file:item.normalized_file,
   observations:records.map(r=>({year:Number(r.date),value:r.value})).sort((a,b)=>a.year-b.year)});
 }
 assert(series.length===manifest.series.length,'series count mismatch');
 return {schema:'eros-l2-source-catalog-v1',scope:'archived actual public WDI responses; not independently validated',
  retrieved_at_utc:manifest.retrieved_at_utc,licence_summary:manifest.license_summary,
  licence_url:manifest.license_url,rights_status:'third_party_exceptions_pending_review',
  indicators:indicators.sort((a,b)=>a.code.localeCompare(b.code)),series:series.sort((a,b)=>a.key.localeCompare(b.key)),
  verification:{raw_series_sha256:'verified',raw_metadata_sha256:'verified',normalized_values:'matched_to_archived_raw',
   series_count:series.length,observation_count:series.reduce((n,s)=>n+s.observation_count,0)}};
}
export function compareSourceCatalogs(before,after){
 assert(before?.schema==='eros-l2-source-catalog-v1' && after?.schema==='eros-l2-source-catalog-v1','invalid catalog');
 const oldMap=new Map(before.series.map(s=>[s.key,s])),newMap=new Map(after.series.map(s=>[s.key,s]));
 const changes=[];
 for(const key of [...new Set([...oldMap.keys(),...newMap.keys()])].sort()){
  const x=oldMap.get(key),y=newMap.get(key);
  if(!x||!y){changes.push({key,type:x?'series_removed':'series_added'});continue;}
  const a=new Map(x.observations.map(p=>[p.year,p.value])),b=new Map(y.observations.map(p=>[p.year,p.value]));
  for(const year of [...new Set([...a.keys(),...b.keys()])].sort((m,n)=>m-n)){
   if(!a.has(year)||!b.has(year)||!Object.is(a.get(year),b.get(year)))
    changes.push({key,year,type:!a.has(year)?'observation_added':!b.has(year)?'observation_removed':'value_revised',
     previous:a.has(year)?a.get(year):null,current:b.has(year)?b.get(year):null});
  }
  if(x.source_dataset_lastupdated!==y.source_dataset_lastupdated)
   changes.push({key,type:'dataset_update_date_changed',previous:x.source_dataset_lastupdated,current:y.source_dataset_lastupdated});
 }
 const sameCapture=before.retrieved_at_utc===after.retrieved_at_utc &&
  before.series.length===after.series.length && before.series.every(x=>newMap.get(x.key)?.raw_sha256===x.raw_sha256);
 return {schema:'eros-l2-revision-review-v1',baseline_retrieved_at_utc:before.retrieved_at_utc,
  candidate_retrieved_at_utc:after.retrieved_at_utc,
  status:sameCapture?'not_assessed_same_capture':'comparison_generated_requires_research_review',
  same_capture:sameCapture,changes,change_count:changes.length,
  caution:'A zero change count for the same capture does not demonstrate absence of publisher revisions.'};
}
export function catalogMarkdown(c){
 const lines=['# EROS — Verified WDI source and methods dictionary','',
  '**Scope:** '+c.scope,'**Captured:** '+c.retrieved_at_utc,
  '**Rights:** '+c.rights_status+'; '+c.licence_url,
  '**Verification:** '+c.verification.series_count+' series / '+c.verification.observation_count+' original observations, raw SHA-256 and normalized values checked.',
  '**Warning:** WDI lastupdated is a dataset update date, not each observation publication date. Source definitions and country comparability require review.',''];
 for(const i of c.indicators){
  lines.push('## '+i.code+' — '+i.name,'','**Publisher definition:** '+i.definition,'',
   '**Underlying data providers:** '+i.underlying_providers.replace(/\n/g,'; '),'',
   '**Official metadata:** '+i.metadata_endpoint,'**Metadata SHA-256:** '+i.metadata_raw_sha256,'',
   '**Methodology:** '+i.methodology_review+'; **Rights:** '+i.licence_review,'');
  for(const s of c.series.filter(x=>x.indicator_uid===i.code)){
   const latest=s.observations.at(-1);
   lines.push('- '+s.country_name+' ('+s.country+'): '+s.observation_count+' annual observations; last captured '+latest.year+
    ' = '+String(latest.value)+'; WDI dataset updated '+s.source_dataset_lastupdated+'; [indicator]('+s.source_url+'); raw SHA-256 '+s.raw_sha256);
  }
  lines.push('');
 }
 lines.push('No new NBE dataset has been ingested. No source revision has been claimed without a second official capture.');
 return lines.join('\n');
}
