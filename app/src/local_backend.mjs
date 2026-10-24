// Personal local workflow. All attribution is an unverified local claim.
import {randomUUID,createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
export class BackendError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new BackendError(status,code,message);};
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:stable(value)).digest('hex');
export function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
export function text(v,key,min=1,max=4000){if(typeof v!=='string'||v.trim().length<min||v.length>max)fail(400,'VALIDATION','Invalid '+key);return v.trim();}
export function id(v){if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))fail(400,'VALIDATION','Invalid UUID');return v;}
function integer(v,min=1,max=1000000){if(!Number.isInteger(v)||v<min||v>max)fail(400,'VALIDATION','Invalid integer');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==(v.includes('.')?v:v.replace('Z','.000Z')))fail(400,'VALIDATION','Valid UTC ISO timestamp required');return v;}
function fields(obj,keys,required=keys){if(!obj||Array.isArray(obj)||typeof obj!=='object'||Object.keys(obj).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(obj,k)))fail(400,'VALIDATION','Missing or unknown fields: '+keys.join(', '));}
function choice(v,values){if(!values.includes(v))fail(400,'VALIDATION','Expected '+values.join('|'));return v;}
const kinds=['issue','question','research','action','decision','criterion','portfolio','rights'];
export function createLocalBackend(db){
 const context=new AsyncLocalStorage();
 const query=async(sql,args=[]) => (await (context.getStore()||db).query(sql,args)).rows;
 const project=async p=>{id(p);if(!(await query('SELECT id FROM local_research.projects WHERE id=$1',[p])).length)fail(404,'NOT_FOUND','Project not found');};
 const get=async(p,r,v=null)=>{id(p);id(r);if(v!==null)integer(v);const row=(await query(`SELECT e.*,r.kind FROM local_research.backend_events e JOIN local_research.backend_records r ON r.id=e.record_id WHERE e.project_id=$1 AND e.record_id=$2 ${v===null?'ORDER BY e.version DESC LIMIT 1':'AND e.version=$3'}`,v===null?[p,r]:[p,r,v]))[0];if(!row)fail(404,'NOT_FOUND','Record/version not in project');row.links=await query('SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=$1 AND version=$2 ORDER BY evidence_id,relation',[r,row.version]);return row;};
 const evidence=async(p,e)=>{id(e);const row=(await query('SELECT * FROM local_research.evidence_refs WHERE id=$1 AND project_id=$2',[e,p]))[0];if(!row)fail(404,'NOT_FOUND','Evidence not in project');if(hash(row.snapshot)!==row.sha256)fail(409,'INTEGRITY','Evidence snapshot hash mismatch');return row;};
 async function reference(p,ref,kind=null,state=null){fields(ref,['id','version']);id(ref.id);integer(ref.version);const row=await get(p,ref.id,ref.version);if(kind&&row.kind!==kind)fail(400,'REFERENCE','Wrong reference kind');if(state&&row.state!==state)fail(409,'REFERENCE','Required reference state '+state);return row;}
 async function validate(p,kind,c){
  const commons=['title'];
  const schema={
   issue:['title','issue_type','severity','description','rationale','recommended_action'],
   question:['title','question','boundaries'],
   research:['title','question_ref','analysis_as_of','sourced_claim','interpretation','hypothesis','unknown','method','limitations'],
   action:['title','research_ref','owner_claim','due_at','priority','rationale','alternatives','evidence_requirements','risks'],
   decision:['title','action_ref','recommendation','alternatives','uncertainties','blockers'],
   criterion:['title','rule'],
   portfolio:['title','description','research_ref','assumptions','assessments'],
   rights:['title','evidence_id','intended_use','determination','rationale','decision_at','expires_at']
  }[kind];
  fields(c,schema);for(const k of commons)text(c[k],k,3,150);
  const structured=['question_ref','research_ref','action_ref','alternatives','blockers','assumptions','assessments','expires_at'];
  for(const key of schema)if(!structured.includes(key))text(c[key],key,0,key==='title'?150:8000);
  if(kind==='action')text(c.alternatives,'alternatives',0,8000);
  for(const [k,v] of Object.entries(c))if(typeof v==='string')text(v,k,k==='expires_at'?0:0,k==='title'?150:8000);
  if(kind==='issue'){choice(c.issue_type,['operational','rights','quality','freshness','schema','other']);choice(c.severity,['critical','high','medium','low']);text(c.description,'description',3);text(c.rationale,'rationale',3);}
  if(kind==='question'){text(c.question,'question',3);text(c.boundaries,'boundaries',3);}
  if(kind==='research'){await reference(p,c.question_ref,'question');date(c.analysis_as_of);text(c.method,'method',3);text(c.limitations,'limitations',3);}
  if(kind==='action'){await reference(p,c.research_ref,'research','accepted');text(c.owner_claim,'owner_claim',1,150);date(c.due_at);choice(c.priority,['critical','high','medium','low']);text(c.rationale,'rationale',3);text(c.evidence_requirements,'evidence_requirements',3);}
  if(kind==='decision'){await reference(p,c.action_ref,'action');text(c.recommendation,'recommendation',3);text(c.uncertainties,'uncertainties',3);if(!Array.isArray(c.alternatives)||!c.alternatives.length||c.alternatives.length>20)fail(400,'VALIDATION','Alternatives required');for(const a of c.alternatives){fields(a,['option','pros','cons']);for(const k of Object.keys(a))text(a[k],k,1,2000);}if(!Array.isArray(c.blockers)||c.blockers.length>50)fail(400,'VALIDATION','Invalid blockers');for(const b of c.blockers)text(b,'blocker');}
  if(kind==='criterion')text(c.rule,'rule',3);
  if(kind==='portfolio'){
   await reference(p,c.research_ref,'research','accepted');text(c.description,'description',3);
   if(!Array.isArray(c.assumptions)||c.assumptions.length>30||!Array.isArray(c.assessments)||!c.assessments.length||c.assessments.length>30)fail(400,'VALIDATION','Invalid portfolio lists');
   for(const a of c.assumptions){fields(a,['statement','evidence_id']);text(a.statement,'assumption');await evidence(p,a.evidence_id);}
   for(const a of c.assessments){fields(a,['criterion_ref','outcome','rationale','evidence_ids']);await reference(p,a.criterion_ref,'criterion');choice(a.outcome,['not_evaluated','under_review','PASS','FAIL','invalidated']);text(a.rationale,'assessment rationale',3);if(!Array.isArray(a.evidence_ids)||a.evidence_ids.length>30)fail(400,'VALIDATION','Invalid assessment evidence');for(const e of a.evidence_ids)await evidence(p,e);if(['PASS','FAIL'].includes(a.outcome)&&!a.evidence_ids.length)fail(400,'REFERENCE','Assessment evidence required');}
  }
  if(kind==='rights'){
   await evidence(p,c.evidence_id);choice(c.intended_use,['local_research','local_export','external_citation','redistribution']);choice(c.determination,['UNKNOWN','HOLD','DENIED','PERMITTED']);text(c.rationale,'rights rationale',3);date(c.decision_at);if(Date.parse(c.decision_at)>Date.now()+1000)fail(400,'VALIDATION','Future decision date');if(c.expires_at!==null){date(c.expires_at);if(Date.parse(c.expires_at)<=Date.parse(c.decision_at))fail(400,'VALIDATION','Expiry must follow decision');}
  }
 }
 async function links(p,items){if(!Array.isArray(items)||items.length>50)fail(400,'VALIDATION','Invalid evidence links');const seen=new Set();for(const l of items){fields(l,['evidence_id','relation']);choice(l.relation,['supports','contradicts','origin','completion','outcome']);await evidence(p,l.evidence_id);const key=l.evidence_id+'/'+l.relation;if(seen.has(key))fail(400,'VALIDATION','Duplicate evidence link');seen.add(key);}return items;}
 const rightsScope=ref=>hash({kind:ref.kind,target:ref.target});
 async function sourceRights(p,refs,use,strict=false){const results=[];for(const ref of refs){
  const rows=await query(`SELECT DISTINCT ON (e.record_id) e.* FROM local_research.backend_events e JOIN local_research.backend_records r ON r.id=e.record_id WHERE e.project_id=$1 AND r.kind='rights' ORDER BY e.record_id,e.version DESC`,[p]);
  const matching=[];for(const row of rows)if(row.content.intended_use===use&&rightsScope(await evidence(p,row.content.evidence_id))===rightsScope(ref))matching.push(row);
  matching.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const c=matching[0]?.content;let status=c?.determination||'UNKNOWN';if(c?.expires_at&&Date.parse(c.expires_at)<=Date.now())status='UNKNOWN';
  if(['HOLD','DENIED'].includes(status)||(strict&&status!=='PERMITTED'))fail(403,'RIGHTS_BLOCKED',use+': '+status+' for '+ref.id);
  results.push({evidence_id:ref.id,status,record:matching[0]?{id:matching[0].record_id,version:matching[0].version}:null,warning:status==='UNKNOWN'?'Rights not determined; local research only, no clearance':null});
 }return results;}
 async function collect(p,row,seen=new Set()){
  const key=row.record_id+':'+row.version;if(seen.has(key))return {records:[],evidence:[]};seen.add(key);
  const records=[row],refs=[];
  const ls=await query('SELECT * FROM local_research.backend_links WHERE record_id=$1 AND version=$2 ORDER BY evidence_id,relation',[row.record_id,row.version]);
  for(const l of ls){const e=await evidence(p,l.evidence_id);refs.push(e);if(e.kind==='record'){const child=await get(p,e.target.id,e.target.version),nested=await collect(p,child,seen);records.push(...nested.records);refs.push(...nested.evidence);}}
  for(const key of ['question_ref','research_ref','action_ref'])if(row.content[key]){const nested=await collect(p,await reference(p,row.content[key]),seen);records.push(...nested.records);refs.push(...nested.evidence);}
  if(row.kind==='portfolio'){for(const a of row.content.assumptions)refs.push(await evidence(p,a.evidence_id));for(const a of row.content.assessments){records.push(await reference(p,a.criterion_ref));for(const e of a.evidence_ids)refs.push(await evidence(p,e));}}
  return {records,evidence:refs};
 }
 const api={
  async list(p,kind=null){await project(p);if(kind!==null)choice(kind,kinds);const rows=await query(`SELECT DISTINCT ON (e.record_id) e.*,r.kind FROM local_research.backend_events e JOIN local_research.backend_records r ON r.id=e.record_id WHERE e.project_id=$1 ${kind?'AND r.kind=$2':''} ORDER BY e.record_id,e.version DESC`,kind?[p,kind]:[p]);const result=[];for(const row of rows)result.push(await get(p,row.record_id,row.version));return result;},
  get,
  async history(p,r){await get(p,r);const rows=await query('SELECT version FROM local_research.backend_events WHERE record_id=$1 ORDER BY version',[r]),result=[];for(const row of rows)result.push(await get(p,r,row.version));return result;},
  async getEvidence(p,e){await project(p);return evidence(p,e);},
  async listEvidence(p){await project(p);return query('SELECT * FROM local_research.evidence_refs WHERE project_id=$1 ORDER BY created_at,id',[p]);},
  async addEvidence(p,input){await project(p);fields(input,['kind','target','span']);choice(input.kind,['snapshot','candidate','record','note']);fields(input.span,['start','end'],[]);let snapshot;
   input=structuredClone(input);
   if(input.target&&typeof input.target.id==='string')input.target.id=input.target.id.toLowerCase();
   for(const key of ['capture_utc','updated_at'])if(input.target&&Object.hasOwn(input.target,key)){date(input.target[key]);input.target[key]=new Date(input.target[key]).toISOString();}
   if(input.kind==='snapshot'){
    fields(input.target,['series_key','capture_utc']);text(input.target.series_key,'series_key',4,100);date(input.target.capture_utc);
    snapshot=(await query('SELECT * FROM local_research.source_snapshots WHERE series_key=$1 AND capture_utc=$2',[input.target.series_key,input.target.capture_utc]))[0];if(!snapshot)fail(404,'NOT_FOUND','Exact source capture not found');
    if(!(await query('SELECT 1 FROM local_research.project_sources WHERE project_id=$1 AND series_key=$2 AND capture_utc=$3',[p,input.target.series_key,input.target.capture_utc])).length)fail(400,'REFERENCE','Attach source to project first');
    if(Object.keys(input.span).length){integer(input.span.start,1900,2100);integer(input.span.end,1900,2100);if(input.span.end<input.span.start||!snapshot.observations.some(o=>o.year===input.span.start)||!snapshot.observations.some(o=>o.year===input.span.end))fail(400,'REFERENCE','Invalid observation span');}
   }else if(input.kind==='record'){snapshot=await reference(p,input.target);if(Object.keys(input.span).length)fail(400,'VALIDATION','Record reference uses whole immutable revision');}
   else if(input.kind==='note'){fields(input.target,['id','version']);id(input.target.id);integer(input.target.version);snapshot=(await query('SELECT * FROM local_research.notes WHERE id=$1 AND project_id=$2 AND version=$3',[input.target.id,p,input.target.version]))[0];if(!snapshot)fail(404,'NOT_FOUND','Exact note version not found');}
   else {fields(input.target,['id','version','endpoint']);id(input.target.id);integer(input.target.version);text(input.target.endpoint,'endpoint',10,1000);const review=(await query('SELECT * FROM local_research.source_reviews WHERE id=$1',[input.target.id]))[0];const event=(await query('SELECT * FROM local_research.source_review_events WHERE review_id=$1 AND version=$2',[input.target.id,input.target.version]))[0];const response=review?.packet.responses.find(r=>r.endpoint===input.target.endpoint);if(!event||!response)fail(404,'NOT_FOUND','Exact candidate response/review version not found');snapshot={response,event,boundary:'candidate packet; not promoted or externally authenticated'};}
   if(['note','candidate'].includes(input.kind)&&Object.keys(input.span).length){integer(input.span.start,0,10000000);integer(input.span.end,0,10000000);const length=input.kind==='note'?snapshot.body.length:Buffer.from(snapshot.response.raw_base64,'base64').length;if(input.span.end<=input.span.start||input.span.end>length)fail(400,'REFERENCE','Invalid text/byte span');}
   // Normalize dates before hashing: PGlite returns Date values, JSONB stores strings.
   snapshot=JSON.parse(JSON.stringify(snapshot));const eid=randomUUID();await query('INSERT INTO local_research.evidence_refs(id,project_id,kind,target,span,snapshot,sha256) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7)',[eid,p,input.kind,JSON.stringify(input.target),JSON.stringify(input.span),JSON.stringify(snapshot),hash(snapshot)]);return evidence(p,eid);
  },
  async write(p,input,actor){
   await project(p);fields(input,['id','kind','expected_version','operation','content','state','rationale','request_key','links']);choice(input.kind,kinds);text(actor,'actor_claim',1,150);integer(input.expected_version,0);text(input.request_key,'request_key',8,100);text(input.rationale,'rationale',3);text(input.operation,'operation');text(input.state,'state');if(input.id!==null)id(input.id);await links(p,input.links);
   const digest=hash({input,actor});
   return db.transaction(async tx=>context.run(tx,async()=>{
    // PGlite serializes transaction callbacks. All domain queries use this transaction's session.
    const prior=(await tx.query('SELECT * FROM local_research.backend_events WHERE project_id=$1 AND request_key=$2',[p,input.request_key])).rows[0];if(prior){if(prior.request_sha256!==digest)fail(409,'IDEMPOTENCY_CONFLICT','Request key reused with different content');return get(p,prior.record_id,prior.version);}
    const creating=input.id===null,rid=input.id||randomUUID();let current;
    if(creating){if(input.expected_version!==0||input.operation!=='create')fail(409,'VERSION_CONFLICT','New record requires version 0/create');}
    else {current=await get(p,rid);if(current.version!==input.expected_version)fail(409,'VERSION_CONFLICT','Expected version is stale');if(current.kind!==input.kind)fail(400,'VALIDATION','Record kind mismatch');}
    const initial={issue:'open',question:'draft',research:'draft',action:'proposed',decision:'draft',criterion:'active',portfolio:'not_evaluated',rights:'recorded'}[input.kind];
    if(creating&&input.state!==initial)fail(409,'TRANSITION','Invalid initial state');
    if(!creating){const from=current.state,to=input.state,kind=input.kind;
     if(['research','decision'].includes(kind)){
      const transitions={edit:['draft','draft'],submit:['draft','submitted'],accept:['submitted','accepted'],return:['submitted','returned'],reject:['submitted','rejected'],revise:['returned','draft']};const t=transitions[input.operation];if(!t||t[0]!==from||t[1]!==to)fail(409,'TRANSITION','Prohibited research/decision transition');if(from!=='draft'&&stable(input.content)!==stable(current.content))fail(409,'IMMUTABLE','Submitted content cannot change');
     }else if(kind==='action'){
      const transitions={edit:['proposed','proposed'],decide:['proposed','decided'],complete:['decided','completed'],verify:['completed','outcome_verified']};const t=transitions[input.operation];if(!t||t[0]!==from||t[1]!==to)fail(409,'TRANSITION','Prohibited action transition');if(from!=='proposed'&&stable(input.content)!==stable(current.content))fail(409,'IMMUTABLE','Decided action cannot change');
     }else if(kind==='issue'){choice(to,['open','under_investigation','hold','resolved']);if(input.operation!=='disposition'||from==='resolved')fail(409,'TRANSITION','Issue disposition prohibited');if(stable(input.content)!==stable(current.content))fail(409,'IMMUTABLE','Issue context cannot be retargeted');}
     else if(kind==='question'){const transitions={edit:['draft','draft'],activate:['draft','active'],return:['active','returned'],revise:['returned','draft'],close:['active','closed']};const t=transitions[input.operation];if(!t||t[0]!==from||t[1]!==to)fail(409,'TRANSITION','Prohibited question transition');}
     else {if(input.operation!=='revise'||to!==initial)fail(409,'TRANSITION','Revision required');}
    }
    await validate(p,input.kind,input.content);
    if(creating&&input.kind==='rights'){
     const target=rightsScope(await evidence(p,input.content.evidence_id));
     for(const r of await api.list(p,'rights'))if(r.content.intended_use===input.content.intended_use&&rightsScope(await evidence(p,r.content.evidence_id))===target)fail(409,'CONFLICT','Revise the existing scoped rights record');
    }
    if(current&&input.kind==='rights'&&(current.content.evidence_id!==input.content.evidence_id||current.content.intended_use!==input.content.intended_use))fail(409,'IMMUTABLE','Rights scope cannot be retargeted');
    if(['research','decision'].includes(input.kind)&&input.state==='submitted'&&!input.links.some(l=>l.relation==='supports'))fail(400,'REFERENCE','Submission requires supporting evidence');
    if(input.kind==='issue'){
     let source=false;for(const l of input.links)if(l.relation==='supports'&&['snapshot','candidate'].includes((await evidence(p,l.evidence_id)).kind))source=true;
     if(!source)fail(400,'REFERENCE','Issue requires exact source/candidate evidence');
    }
    if(input.kind==='research'&&input.content.sourced_claim&&!input.links.some(l=>l.relation==='supports'))fail(400,'REFERENCE','Sourced claim requires evidence');
    if(input.kind==='action'&&['completed','outcome_verified'].includes(input.state)&&!input.links.some(l=>l.relation===(input.state==='completed'?'completion':'outcome')))fail(400,'REFERENCE','Completion/outcome evidence required');
    // Review events must retain citations. Return/revise copies the prior snapshot, never rewrites it.
    if(current&&['research','decision','action','issue'].includes(input.kind)&&current.state!=='draft'&&current.state!=='proposed'){
     const previous=await query('SELECT evidence_id,relation FROM local_research.backend_links WHERE record_id=$1 AND version=$2',[rid,current.version]);
     if(['research','decision','issue'].includes(input.kind)&&input.links.length!==previous.length)fail(409,'IMMUTABLE','Recorded citations cannot change');
     for(const l of previous)if(!input.links.some(n=>n.evidence_id===l.evidence_id&&n.relation===l.relation))fail(409,'IMMUTABLE','Existing evidence links must be retained');
    }
    if(creating)await tx.query('INSERT INTO local_research.backend_records(id,project_id,kind) VALUES($1,$2,$3)',[rid,p,input.kind]);
    const version=input.expected_version+1;
    await tx.query('INSERT INTO local_research.backend_events(record_id,project_id,version,operation,state,content,rationale,actor_claim,request_key,request_sha256) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)',[rid,p,version,input.operation,input.state,JSON.stringify(input.content),input.rationale,actor,input.request_key,digest]);
    for(const l of input.links)await tx.query('INSERT INTO local_research.backend_links(record_id,version,project_id,evidence_id,relation) VALUES($1,$2,$3,$4,$5)',[rid,version,p,l.evidence_id,l.relation]);
    let rightsWarnings=[];if(!['rights','issue'].includes(input.kind)){
     const tree=await collect(p,await get(p,rid,version));rightsWarnings=await sourceRights(p,[...new Map(tree.evidence.map(e=>[e.id,e])).values()],'local_research');
    }
    return {...await get(p,rid,version),rights_warnings:rightsWarnings.filter(r=>r.warning)};
   }));
  },
  async lineage(p,r,v){const row=await get(p,r,v),result=await collect(p,row),records=[...new Map(result.records.map(e=>[e.record_id+':'+e.version,e])).values()];return {records,edges:records.flatMap(row=>row.links.map(link=>({record_id:row.record_id,version:row.version,...link}))),evidence:[...new Map(result.evidence.map(e=>[e.id,e])).values()],assurance:'Local recorded ancestry; hashes do not establish external authenticity'};},
  async exportFrozen(p,input,actor){await project(p);fields(input,['record_id','version','request_key']);id(input.record_id);integer(input.version);text(input.request_key,'request_key',8,100);text(actor,'actor_claim',1,150);const digest=hash({input,actor});
   return db.transaction(async tx=>context.run(tx,async()=>{
    const prior=(await tx.query('SELECT * FROM local_research.frozen_exports WHERE project_id=$1 AND request_key=$2',[p,input.request_key])).rows[0];if(prior){if(prior.request_sha256!==digest)fail(409,'IDEMPOTENCY_CONFLICT','Export key conflict');return api.getExport(p,prior.id);}
    const row=await get(p,input.record_id,input.version);if(!['research','decision'].includes(row.kind)||row.state!=='accepted')fail(409,'TRANSITION','Export requires accepted immutable research/decision revision');
    const tree=await api.lineage(p,row.record_id,row.version);const rights=await sourceRights(p,tree.evidence,'local_export',true);
    const stamp=new Date().toISOString();const manifest={schema:'eros-local-frozen-export-v1',project_id:p,root:{id:row.record_id,version:row.version},exported_at:stamp,actor_claim:actor,actor_assurance:'local_unverified_claim',records:tree.records.map(r=>({id:r.record_id,version:r.version,kind:r.kind,state:r.state,sha256:hash(JSON.parse(JSON.stringify(r)))})),edges:tree.edges,evidence:tree.evidence,rights,attribution:'World Bank WDI where referenced; local authored analysis; no endorsement',limitations:'Recorded per-use determinations are not legal certification. No external authenticity, institutional approval or live acquisition claim.'};
    const escaped=s=>String(s).replace(/\\/g,'\\\\').replace(/([\[\]()*_!`|])/g,'\\$1').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const content='# '+escaped(row.content.title)+'\n\nLocal frozen '+row.kind+' revision '+row.version+'\n\n'+escaped(stable(row.content))+'\n\n## Citation manifest\n\n'+escaped(stable(manifest))+'\n';
    const eid=randomUUID();await tx.query('INSERT INTO local_research.frozen_exports(id,project_id,request_key,request_sha256,content,manifest,sha256) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)',[eid,p,input.request_key,digest,content,JSON.stringify(manifest),hash(content)]);return api.getExport(p,eid);
   }));
  },
  async listExports(p){await project(p);return query('SELECT id,project_id,sha256,created_at,manifest FROM local_research.frozen_exports WHERE project_id=$1 ORDER BY created_at,id',[p]);},
  async getExport(p,e,{auditOnly=false}={}){id(p);id(e);const row=(await query('SELECT * FROM local_research.frozen_exports WHERE id=$1 AND project_id=$2',[e,p]))[0];if(!row)fail(404,'NOT_FOUND','Export not found');if(hash(row.content)!==row.sha256)fail(409,'INTEGRITY','Export content mismatch');if(!auditOnly)await sourceRights(p,row.manifest.evidence,'local_export',true);return row;},
  rights:sourceRights
 };
 return api;
}
