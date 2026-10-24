// L4 local integrity check: compare stored snapshots to original hash-verified WDI API captures.
// This is NOT a new official data vintage, economic-method validation or a source-revision detector.
import {buildVerifiedCatalog} from './l2_source_catalog.mjs';
import {openLocalResearch} from './l3_local_research.mjs';
export async function auditLocalSnapshots(directory,archiveRoot){
 const catalog=await buildVerifiedCatalog(archiveRoot);
 const expected=new Map(catalog.series.map(s=>[s.key+'|'+new Date(s.capture_utc).toISOString(),s]));
 const store=await openLocalResearch(directory);
 const failures=[];
 let matched=0;
 try{
  const actual=await store.listSources();
  for(const entry of actual){
   const capture=new Date(entry.capture_utc).toISOString();
   const key=entry.series_key+'|'+capture;
   const original=expected.get(key);
   if(!original){failures.push({key,reason:'not_in_archived_official_capture'});continue;}
   const stored=await store.getSource(entry.series_key,capture);
   const indicator=catalog.indicators.find(i=>i.code===original.indicator_uid);
   const checks={
    raw_sha256:stored.raw_sha256===original.raw_sha256,
    raw_bytes:stored.raw_bytes===original.raw_bytes,
    endpoint:stored.endpoint===original.endpoint,
    source_url:stored.source_url===original.source_url,
    country:stored.country_iso3===original.country,
    indicator:stored.indicator_uid===original.indicator_uid,
    definition:stored.indicator_definition===indicator.definition,
    providers:stored.underlying_providers===indicator.underlying_providers,
    dataset_update:new Date(stored.dataset_lastupdated).toISOString().slice(0,10)===original.source_dataset_lastupdated,
    licence_status:stored.licence_status===catalog.rights_status,
    licence_url:stored.licence_url===catalog.licence_url,
    observations:JSON.stringify(stored.observations)===JSON.stringify(original.observations)
   };
   const invalid=Object.keys(checks).filter(x=>!checks[x]);
   if(invalid.length)failures.push({key,reason:'stored_record_differs_from_verified_archive',fields:invalid});
   else matched++;
   expected.delete(key);
  }
  for(const key of expected.keys())failures.push({key,reason:'missing_from_local_store'});
  return {schema:'eros-l4-local-snapshot-integrity-v1',status:failures.length?'FAIL':'PASS',
   checked_series:actual.length,matched_series:matched,verified_archive_series:catalog.series.length,
   verified_archive_observations:catalog.verification.observation_count,failures,
   boundary:'Same official capture only; not independent validation, live monitoring or a revision comparison.'};
 }finally{await store.close();}
}
