// Synthetic records are operator-authored test material, not observed economic data.
export async function assertSyntheticRecordStore(store){
 if((await store.listSources()).length||(await store.listSourceReviews()).length)
  throw Error('Synthetic record mode refuses captured sources or source reviews');
 for(const p of await store.listProjects()){
  for(const e of await store.backend.listEvidence(p.id)){
   if(['snapshot','candidate'].includes(e.kind))throw Error('Synthetic record mode refuses captured evidence');
  }
 }
 return {status:'PASS',data_mode:'synthetic-records',checked_series:0,boundary:'No captured sources; operator-authored records only. Not observed data or legal rights clearance.'};
}
