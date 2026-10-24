'use strict';
let csrf='',sources=[],projects=[],current=null;
const $=id=>document.getElementById(id);
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
const report=e=>$('message').textContent=e.message||String(e);
async function api(path,method='GET',body){const r=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',...(csrf?{'X-EROS-CSRF':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});const v=await r.json();if(!r.ok){if(r.status===401){$('workspace').hidden=true;$('unlock').hidden=false;}throw Error(v.error);}return v;}
function sourceOptions(id,empty=false){const select=$(id);select.replaceChildren();if(empty){const o=text('option','No source — analyst interpretation / hypothesis only');o.value='';select.append(o);}sources.forEach((s,i)=>{const o=text('option',s.series_key+' · '+new Date(s.capture_utc).toISOString());o.value=i;select.append(o);});}
function sourceRef(i){const s=sources[Number(i)];return {key:s.series_key,capture_utc:s.capture_utc};}
async function home(){const h=await api('home');projects=h.projects;sources=await api('sources');$('evidence').textContent=h.integrity.matched_series+' / '+h.integrity.verified_archive_series+' source snapshots matched their archived capture at startup · '+h.integrity.verified_archive_observations+' observations. '+h.scope;$('cards').replaceChildren();for(const s of sources.filter(s=>s.country_iso3==='ETH')){const card=document.createElement('article');const last=s.observations.at(-1);card.append(text('h3',s.indicator_name),text('strong',last.year+': '+(last.value??'Missing')),text('p','Archived WDI · '+s.licence_status));$('cards').append(card);}$('project-list').replaceChildren();$('recent').replaceChildren();for(const p of [...projects].reverse()){const b=text('button',p.title+' · '+p.status);b.onclick=()=>openProject(p.id).catch(report);$('project-list').append(b);$('recent').append(text('p',p.title+' · '+p.status+' · '+new Date(p.updated_at).toLocaleString()));}for(const n of h.recentNotes)$('recent').append(text('p',n.project+' · '+n.kind+' · '+n.body));for(const id of ['source-choice','note-source'])sourceOptions(id,id==='note-source');const codes=[...new Set(sources.map(s=>s.indicator_uid))];$('indicator').replaceChildren(...codes.map(code=>{const o=text('option',sources.find(s=>s.indicator_uid===code).indicator_name+' · '+code);o.value=code;return o;}));explore();await loadOntology();}
async function openProject(id){current=await api('projects/'+id);$('project').hidden=false;for(const k of ['title','description','objectives','questions','reference_notes','status'])$(k).value=current[k];$('project-meta').textContent='Stable ID: '+id+' · Created '+new Date(current.created_at).toISOString()+' · Updated '+new Date(current.updated_at).toISOString();$('attached').replaceChildren(...current.sources.map(s=>text('p',s.series_key+' · '+s.raw_sha256)));$('notes').replaceChildren();for(const n of current.notes){const article=document.createElement('article');article.className='note';const edit=document.createElement('textarea');edit.value=n.body;edit.setAttribute('aria-label','Edit note '+n.id);const save=text('button','Save note edit');save.onclick=async()=>{try{await api('projects/'+id+'/notes/'+n.id,'PATCH',{body:edit.value});await openProject(id);report('Note updated');}catch(e){report(e);}};article.append(text('strong',n.kind+' · Analyst-authored'),text('p',n.series_key? n.series_key+' · Capture '+new Date(n.capture_utc).toISOString():'No archived citation'),edit,save);$('notes').append(article);}$('brief').href='/api/projects/'+id+'/brief.md';location.hash='projects';}
function explore(){const group=sources.filter(s=>s.indicator_uid===$('indicator').value);const years=[...new Set(group.flatMap(s=>s.observations.map(o=>o.year)))].sort();const table=document.createElement('table');const head=document.createElement('tr');head.append(text('th','Year'),...group.map(s=>text('th',s.country_iso3+' · publisher value')));table.append(head);for(const year of years){const row=document.createElement('tr');row.append(text('td',year),...group.map(s=>text('td',s.observations.find(o=>o.year===year)?.value??'Missing')));table.append(row);}$('comparison').replaceChildren(table);$('source-details').replaceChildren();for(const s of group){const box=document.createElement('details');box.append(text('summary',s.series_key+' · Source, definition & provenance'),text('pre',JSON.stringify({publisher:'World Bank WDI',indicator:s.indicator_uid,indicator_name:s.indicator_name,unit:s.unit||'Publisher unit field not populated; consult indicator title/definition',definition:s.indicator_definition,providers:s.underlying_providers,capture_utc:s.capture_utc,dataset_lastupdated:s.dataset_lastupdated,source_url:s.source_url,api_endpoint:s.endpoint,raw_sha256:s.raw_sha256,rights:s.licence_status,rights_url:s.licence_url,status:'Matched to hash-verified capture at startup; not independent economic validation'},null,2)));$('source-details').append(box);}}
$('indicator').onchange=explore;
$('unlock').onsubmit=async e=>{e.preventDefault();try{csrf=(await api('unlock','POST',{code:$('code').value})).csrf;$('code').value='';$('unlock').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await home();report('Local workspace opened');}catch(err){report(err);}};
$('create').onsubmit=async e=>{e.preventDefault();try{const p=await api('projects','POST',{title:$('new-title').value});$('new-title').value='';await home();await openProject(p.id);report('Project created');}catch(err){report(err);}};
$('project-form').onsubmit=async e=>{e.preventDefault();try{const body={};for(const k of ['title','description','objectives','questions','reference_notes','status'])body[k]=$(k).value;await api('projects/'+current.id,'PATCH',body);await home();await openProject(current.id);report('Project saved');}catch(err){report(err);}};
$('attach').onclick=async()=>{try{await api('projects/'+current.id+'/sources','POST',sourceRef($('source-choice').value));await openProject(current.id);report('Source attached');}catch(err){report(err);}};
$('note-form').onsubmit=async e=>{e.preventDefault();try{await api('projects/'+current.id+'/notes','POST',{body:$('note').value,kind:$('kind').value,source:$('note-source').value===''?null:sourceRef($('note-source').value)});$('note').value='';await openProject(current.id);report('Note saved');}catch(err){report(err);}};
$('logout').onclick=async()=>{try{await api('logout','POST',{});csrf='';current=null;sources=[];projects=[];location.reload();}catch(e){report(e);}};
(async()=>{try{csrf=(await api('session')).csrf;$('unlock').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await home();}catch{}})();

let currentReview=null;
async function reviews(){const rows=await api('source-reviews');$('review-list').replaceChildren();if(!rows.length)$('review-list').append(text('p','No repeat source captures recorded.'));for(const row of rows){const b=text('button',new Date(row.captured_at).toISOString()+' · '+row.status+' · '+row.change_count+' changes');b.onclick=()=>openReview(row.id).catch(report);$('review-list').append(b);}}
async function openReview(id){currentReview=await api('source-reviews/'+id);$('review').hidden=false;$('review-note').value=currentReview.analyst_note;const p=currentReview.packet;$('review-details').textContent=JSON.stringify({id,status:currentReview.status,analyst_note:currentReview.analyst_note,captured_at:p.captured_at_utc,raw_response_count:p.responses.length,raw_sha256:p.responses.map(r=>({endpoint:r.endpoint,sha256:r.raw_sha256,bytes:r.raw_bytes})),comparison:p.comparison,metadata_changes:p.metadata_changes,vintage:p.publisher_vintage_statement,boundaries:p.boundaries},null,2);}
$('refresh-reviews').onclick=()=>reviews().catch(report);
$('capture-wdi').onclick=async()=>{const b=$('capture-wdi');b.disabled=true;report('Checking the source-acquisition operating gate; live acquisition is disabled.');try{const result=await api('source-reviews','POST',{});await reviews();await openReview(result.id);report(result.provenance||'Candidate recorded; not promoted');}catch(e){report(e);}finally{b.disabled=false;}};
$('save-review').onclick=async()=>{try{await api('source-reviews/'+currentReview.id,'PATCH',{analyst_note:$('review-note').value,expected_version:currentReview.version});await reviews();await openReview(currentReview.id);report('Analyst review recorded; candidate not promoted');}catch(e){report(e);}};

async function loadOntology(){
  try{
    const indicators=await api('ontology/indicators');
    const aliases=await api('ontology/aliases');
    const tableInd=document.createElement('table');
    const hInd=document.createElement('tr');
    hInd.append(text('th','Canonical Code'),text('th','Name'),text('th','Domain'),text('th','Unit'),text('th','Frequency'),text('th','Density?'),text('th','Denominator'));
    tableInd.append(hInd);
    for(const c of indicators){
      const row=document.createElement('tr');
      row.append(text('td',c.canonical_code),text('td',c.name),text('td',c.domain),text('td',c.unit),text('td',c.frequency),text('td',c.is_density?'Yes':'No'),text('td',c.required_denominator_code||'None'));
      tableInd.append(row);
    }
    $('ontology-indicators').replaceChildren(tableInd);

    const tableAli=document.createElement('table');
    const hAli=document.createElement('tr');
    hAli.append(text('th','Provider'),text('th','Dataset'),text('th','Native Code'),text('th','Canonical Mapping'),text('th','Status'),text('th','Grade'),text('th','Review Notes'));
    tableAli.append(hAli);
    for(const a of aliases){
      const row=document.createElement('tr');
      row.append(text('td',a.provider_id),text('td',a.provider_dataset_id),text('td',a.native_variable_code),text('td',a.canonical_code),text('td',a.mapping_status),text('td',a.concept_equivalence_grade),text('td',a.governance_review_notes));
      tableAli.append(row);
    }
    $('ontology-aliases').replaceChildren(tableAli);
  }catch(e){report(e);}
}
