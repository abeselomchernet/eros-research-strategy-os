import {createHash} from 'node:crypto';
export class ResearchInputError extends Error {constructor(message,status=400){super(message);this.httpStatus=status;}}
const deny=(m)=>{throw new ResearchInputError(m);};
const required=(v,name,min=1,max=200)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)deny('Invalid '+name);return v.trim();};
export function parseAnnualCsv(csv){
 if(typeof csv!=='string'||csv.length>20000)deny('CSV too large');
 const lines=csv.trim().replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 if(lines.length<2||lines.length>101||lines[0].toLowerCase()!=='period,value')deny('CSV header must be period,value with 1–100 rows');
 const out=[],seen=new Set();
 for(const row of lines.slice(1)){
  const match=/^(\d{4}),\s*(-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?|NA|na|)$/.exec(row);
  if(!match)deny('Invalid annual CSV row');
  const period=Number(match[1]);if(period<1900||period>2100||seen.has(period))deny('Duplicate or out-of-range year');
  seen.add(period);
  const value=!match[2]||match[2].toUpperCase()==='NA'?null:Number(match[2]);
  if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>1e15))deny('Invalid numeric value');
  out.push({period,value,value_status:value===null?'missing':'ok'});
 }
 return out.sort((a,b)=>a.period-b.period);
}
export function validateIndicatorInput(data){
 if(!data||typeof data!=='object'||Array.isArray(data))deny('Expected indicator object');
 const fields=['indicator_uid','label','unit','country_iso3','source_title','source_url','source_tier','dataset_kind','source_vintage','publication_date','csv'];
 if(fields.some(k=>!Object.hasOwn(data,k))||Object.keys(data).some(k=>!fields.includes(k)))deny('Missing or unexpected fields');
 const indicator_uid=required(data.indicator_uid,'indicator code',2,60);
 if(!/^[\w.:-]{2,60}$/.test(indicator_uid))deny('Invalid indicator code');
 const label=required(data.label,'label',3,150),unit=required(data.unit,'unit',1,50);
 const country_iso3=required(data.country_iso3,'ISO3 country',3,3).toUpperCase();
 if(!/^[A-Z]{3}$/.test(country_iso3))deny('Invalid ISO3 country');
 const source_tier=required(data.source_tier,'source tier',2,2);
 if(!['T1','T2','T3','T4','T5'].includes(source_tier))deny('Invalid source tier');
 const dataset_kind=required(data.dataset_kind,'dataset kind',9,18);
 if(!['synthetic','public_unverified'].includes(dataset_kind))deny('Invalid dataset kind');
 const source_url=required(data.source_url,'source URL',10,750);let url;
 try{url=new URL(source_url);}catch{deny('Invalid source URL');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash)deny('Source must be canonical HTTPS');
 if(dataset_kind==='synthetic'&&!url.hostname.endsWith('.invalid'))deny('Synthetic source must end with .invalid');
 if(dataset_kind==='public_unverified'&&url.hostname.endsWith('.invalid'))deny('Public source must be an actual cited URL');
 const publication_date=required(data.publication_date,'publication date',10,10);
 const date=new Date(publication_date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(publication_date)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==publication_date)deny('Invalid publication date');
 return {indicator_uid,label,unit,country_iso3,source_title:required(data.source_title,'source title',5,200),
 source_url,source_tier,dataset_kind,source_vintage:required(data.source_vintage,'publisher vintage',1,90),publication_date,
 observations:parseAnnualCsv(required(data.csv,'CSV',12,20000))};
}
export const fingerprint=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const label=s=>s.dataset_kind==='synthetic'?'SYNTHETIC — NOT OBSERVED ECONOMIC DATA':'USER-IMPORTED PUBLIC SOURCE — NOT INDEPENDENTLY VERIFIED';
const fmt=n=>n===null||n===undefined?'missing':Number(n).toLocaleString('en-US',{maximumFractionDigits:6});
export function citedIndicatorBrief(s,rows){
 if(!s||!Array.isArray(rows))deny('Missing indicator/source');
 const years=rows.slice().sort((a,b)=>a.period-b.period);
 return ['# '+s.label+' — '+s.country_iso3,'','**Evidence status:** '+label(s),
 '**Indicator:** '+s.indicator_uid+' · Unit: '+s.unit+' · Annual',
 '**Source:** '+s.source_title+' ('+s.source_tier+') · '+s.source_url,
 '**Vintage:** '+s.source_vintage+' · Source date recorded: '+s.publication_date,
 '**Imported:** '+s.imported_at+' · Import fingerprint: '+s.import_sha256,
 '','| Year | Value | Status |','|---:|---:|---|',
 ...years.map(x=>'| '+x.period+' | '+fmt(x.value)+' | '+x.value_status+' |'),
 '','**Missing years/values are not interpolated.**',
 '**Limitations:** Local research snapshot; definitions, rights and publisher revisions require separate verification. No institutional endorsement or approval.',
 '','Reference: '+s.id].join('\n');
}
export function compareIndicatorSnapshots(a,b){
 if(!a?.source||!b?.source||!Array.isArray(a.observations)||!Array.isArray(b.observations))deny('Comparison requires source-linked series');
 if(a.source.indicator_uid!==b.source.indicator_uid||a.source.unit!==b.source.unit)deny('Compare only identical codes and units; economic comparability still requires research review');
 const x=new Map(a.observations.map(o=>[Number(o.period),o])),y=new Map(b.observations.map(o=>[Number(o.period),o]));
 return [...new Set([...x.keys(),...y.keys()])].sort((m,n)=>m-n).map(period=>({period,
 first:x.get(period)?.value_status==='ok'?Number(x.get(period).value):null,
 second:y.get(period)?.value_status==='ok'?Number(y.get(period).value):null}));
}
export function citedComparisonBrief(a,b){
 const joined=compareIndicatorSnapshots(a,b);const x=a.source,y=b.source;
 return ['# Descriptive indicator comparison — '+x.indicator_uid,'',
 '**Not validated peer-country comparability or a policy recommendation.**',
 '**Unit:** '+x.unit,'',
 'A · '+x.country_iso3+': '+x.source_title+' · '+x.source_url+' · '+x.source_vintage+' · '+label(x),
 'B · '+y.country_iso3+': '+y.source_title+' · '+y.source_url+' · '+y.source_vintage+' · '+label(y),
 '','| Year | '+x.country_iso3+' | '+y.country_iso3+' |','|---:|---:|---:|',
 ...joined.map(t=>'| '+t.period+' | '+fmt(t.first)+' | '+fmt(t.second)+' |'),
 '','**Missing values have not been interpolated.** Differences in source methodology, base years and definitions may invalidate analytical comparison.',
 'A fingerprint '+x.import_sha256+' · '+x.id,'B fingerprint '+y.import_sha256+' · '+y.id].join('\n');
}
