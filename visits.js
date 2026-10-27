export const VISITS_KEY='london-field-atlas.visits.v1';

// Device-local by choice. A failed browser write must never look like a saved visit.
export function createVisitStore(ids,storage){
 const allowed=new Set(ids);let visited={},persistent=true,readable=true;
 function load(){
  try{
   const raw=storage().getItem(VISITS_KEY);
   const data=raw?JSON.parse(raw):{version:1,visited:{}};
   if(data.version!==1||!data.visited||typeof data.visited!=='object'||Array.isArray(data.visited))throw Error('Invalid visit data');
   visited=Object.fromEntries(Object.entries(data.visited).filter(([id,date])=>allowed.has(id)&&typeof date==='string'&&Number.isFinite(Date.parse(date))));
   persistent=true;readable=true;
  }catch{persistent=false;readable=false;}
 }
 load();
 return {
  has:id=>Object.hasOwn(visited,id),ids:()=>Object.keys(visited),count:()=>Object.keys(visited).length,
  get persistent(){return persistent;},reload:load,
  toggle(id){
   if(!allowed.has(id))throw Error('Unknown building');
   // Merge any other tab's latest records before changing this one building.
   if(persistent)load();
   if(Object.hasOwn(visited,id))delete visited[id];else visited[id]=new Date().toISOString();
   try{
    if(!readable)throw Error('Saved data is unavailable');
    storage().setItem(VISITS_KEY,JSON.stringify({version:1,visited}));persistent=true;
   }catch{persistent=false;}
   return {visited:Object.hasOwn(visited,id),saved:persistent};
  }
 };
}
