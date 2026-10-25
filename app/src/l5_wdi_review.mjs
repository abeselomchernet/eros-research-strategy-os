// Allowlisted official public WDI repeat capture. Candidate evidence never replaces accepted snapshots.
import {createHash} from 'node:crypto';
import {buildVerifiedCatalog,compareSourceCatalogs} from './l2_source_catalog.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const codes=['FP.CPI.TOTL.ZG','NY.GDP.MKTP.KD.ZG','SP.POP.TOTL'];
const countries={ETH:'ET',KEN:'KE'};
const fail=(ok,message)=>{if(!ok)throw Error('WDI candidate: '+message);};
export function verifyCaptureBytes(packet){
 fail(packet?.schema==='eros-l5-wdi-candidate-v1'&&Array.isArray(packet.responses)&&packet.responses.length===9,'invalid capture packet');
 const seen=new Set();
 for(const entry of packet.responses){
  fail(typeof entry.endpoint==='string'&&entry.endpoint.startsWith('https://api.worldbank.org/v2/'),'untrusted endpoint');
  fail(!seen.has(entry.endpoint),'duplicate endpoint');seen.add(entry.endpoint);
  const bytes=Buffer.from(entry.raw_base64,'base64');fail(bytes.length===entry.raw_bytes&&hash(bytes)===entry.raw_sha256,'raw capture hash or byte count mismatch');JSON.parse(bytes.toString('utf8'));
 }
 const raw=new Map(packet.responses.map(r=>[r.endpoint,r]));
 fail(packet.catalog?.series?.length===6&&packet.catalog?.indicators?.length===3,'candidate catalog count mismatch');
 for(const meta of packet.catalog.indicators){
  fail(codes.includes(meta.code),'unsupported indicator');
  const endpoint='https://api.worldbank.org/v2/indicator/'+meta.code+'?format=json&source=2',entry=raw.get(endpoint);
  fail(!!entry,'missing metadata response');const row=JSON.parse(Buffer.from(entry.raw_base64,'base64').toString())[1][0];
  fail(row.id===meta.code&&meta.name===row.name&&meta.definition===row.sourceNote&&meta.underlying_providers===row.sourceOrganization&&meta.unit===(row.unit||null)&&meta.metadata_raw_sha256===entry.raw_sha256,'candidate metadata differs from raw capture');
 }
 const keys=new Set();
 for(const series of packet.catalog.series){
  fail(codes.includes(series.indicator_uid)&&Object.hasOwn(countries,series.country)&&!keys.has(series.key),'candidate identity mismatch');keys.add(series.key);
  const endpoint='https://api.worldbank.org/v2/country/'+series.country+'/indicator/'+series.indicator_uid+'?format=json&source=2&date=2015%3A2025&per_page=200';const entry=raw.get(endpoint);fail(!!entry,'missing series response');
  const [header,rows]=JSON.parse(Buffer.from(entry.raw_base64,'base64').toString());
  const obs=rows.map(r=>({year:Number(r.date),value:r.value})).sort((a,b)=>a.year-b.year);
  fail(series.key===series.country+'/'+series.indicator_uid&&series.raw_sha256===entry.raw_sha256&&series.raw_bytes===entry.raw_bytes&&series.source_dataset_lastupdated===header.lastupdated&&JSON.stringify(series.observations)===JSON.stringify(obs),'candidate values differ from retained raw capture');
 }
 return true;
}
export async function captureWdiReview(archiveRoot,{fetchImpl,now=()=>new Date().toISOString()}={}){
 if(typeof fetchImpl!=='function')throw Error('VS01 acquisition disabled: explicit offline fixture transport required');
 const baseline=await buildVerifiedCatalog(archiveRoot),captured=now(),responses=[];
 async function get(endpoint){
  const r=await fetchImpl(endpoint,{headers:{Accept:'application/json','User-Agent':'EROS-Local-Research/0.5 personal research candidate capture'},redirect:'error',signal:AbortSignal.timeout(25000)});
  fail(r.ok&&r.status===200,'official endpoint did not return HTTP 200');
  const reader=r.body.getReader();let size=0,chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;fail(size<=2000000,'response exceeds capture limit');chunks.push(Buffer.from(value));}}catch(e){await reader.cancel();throw e;}
  const raw=Buffer.concat(chunks);const entry={endpoint,retrieved_at_utc:now(),status:200,raw_base64:raw.toString('base64'),raw_bytes:raw.length,raw_sha256:hash(raw)};responses.push(entry);
  return {packet:JSON.parse(raw.toString('utf8')),entry};
 }
 const indicators=[],series=[];
 for(const code of codes){
  const endpoint='https://api.worldbank.org/v2/indicator/'+code+'?format=json&source=2';
  const {packet,entry}=await get(endpoint);const [h,records]=packet;
  fail(Number(h.total)===1&&records?.length===1&&records[0].id===code&&String(records[0].source.id)==='2','metadata identity mismatch');
  const r=records[0];fail(typeof r.sourceNote==='string'&&typeof r.sourceOrganization==='string'&&typeof r.name==='string','missing publisher metadata');
  indicators.push({code,name:r.name,unit:r.unit||null,definition:r.sourceNote,underlying_providers:r.sourceOrganization,metadata_endpoint:endpoint,metadata_raw_sha256:entry.raw_sha256,source_dataset:'World Development Indicators',methodology_review:'not_independently_reviewed',licence_review:'provider_and_third_party_exceptions_require_review'});
  for(const [country,alpha] of Object.entries(countries)){
   const endpoint='https://api.worldbank.org/v2/country/'+country+'/indicator/'+code+'?format=json&source=2&date=2015%3A2025&per_page=200';
   const {packet,entry}=await get(endpoint);const [h,rows]=packet;
   fail(Array.isArray(rows)&&Number(h.total)===11&&rows.length===11&&Number(h.pages)===1&&/^\d{4}-\d{2}-\d{2}$/.test(h.lastupdated),'incomplete series or missing dataset date');
   const years=new Set();
   for(const row of rows){const year=Number(row.date);fail(row.countryiso3code===country&&row.indicator.id===code&&!years.has(year)&&Number.isInteger(year)&&year>=2015&&year<=2025,'wrong series identity/year');years.add(year);fail(row.value===null||(typeof row.value==='number'&&Number.isFinite(row.value)),'invalid observation');}
   series.push({key:country+'/'+code,country,country_name:rows[0].country.value,indicator_uid:code,observation_count:rows.length,missing_count:rows.filter(r=>r.value===null).length,capture_utc:captured,source_dataset_lastupdated:h.lastupdated,endpoint,raw_sha256:entry.raw_sha256,raw_bytes:entry.raw_bytes,source_url:'https://data.worldbank.org/indicator/'+code+'?locations='+alpha,observations:rows.map(r=>({year:Number(r.date),value:r.value})).sort((a,b)=>a.year-b.year)});
  }
 }
 const catalog={schema:'eros-l2-source-catalog-v1',scope:'new official public WDI candidate capture; not accepted research evidence',retrieved_at_utc:captured,licence_summary:baseline.licence_summary,licence_url:baseline.licence_url,rights_status:'third_party_exceptions_pending_review',indicators,series,verification:{raw_series_sha256:'verified',raw_metadata_sha256:'verified',normalized_values:'matched_to_archived_raw',series_count:6,observation_count:66}};
 const comparison=compareSourceCatalogs(baseline,catalog);
 const metadata_changes=[];
 for(const item of indicators){const old=baseline.indicators.find(i=>i.code===item.code);for(const field of ['name','unit','definition','underlying_providers'])if(old[field]!==item[field])metadata_changes.push({indicator:item.code,field,previous:old[field],current:item[field]});}
 const packet={schema:'eros-l5-wdi-candidate-v1',captured_at_utc:captured,responses,catalog,comparison,metadata_changes,review_status:'awaiting_review',publisher_vintage_statement:series.every(s=>baseline.series.find(b=>b.key===s.key).source_dataset_lastupdated===s.source_dataset_lastupdated)?'Same WDI dataset-update dates; a repeat retrieval is not a new publisher vintage.':'Dataset-update dates differ; analyst review is required before any vintage/revision claim.',boundaries:'Raw capture byte integrity only; not independent economic validation, licence clearance or promotion. Accepted L3/L4 sources remain unchanged.'};
 verifyCaptureBytes(packet);return packet;
}
