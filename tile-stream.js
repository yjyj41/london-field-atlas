import * as T from './vendor/three.module.js';
import {decodeCityMesh} from './city-mesh.js';

export function createTileStream(city,context,mats,changed,sharedRoadMaterial){
 const maxBytes=(matchMedia('(max-width:700px)').matches?96:128)*1024*1024;
 const badge=document.querySelector('#stream-status'),entries=new Map(),pending=new Map(),failed=new Map();
 const tiles=new Map(city.tiles.map(t=>[t.id,t])),wanted=new Set();
 const roadMat=sharedRoadMaterial||new T.MeshStandardMaterial({color:0xf0f2f1,roughness:.92,side:T.DoubleSide});
 let enabled=true,running=0,totalBytes=0,downloadedBytes=0,timer,limited=false;
 function dispose(entry){context.remove(entry.root);entry.root.traverse(o=>o.geometry?.dispose());totalBytes-=entry.bytes;entries.delete(entry.id)}
 function status(){
  const loaded=[...wanted].filter(id=>entries.has(id)),errors=[...wanted].filter(id=>failed.has(id));
  const count=loaded.reduce((n,id)=>n+tiles.get(id).masses,0);
  badge.textContent=!enabled?'Surroundings hidden':errors.length?'Some areas failed to load · Select to retry':loaded.length<wanted.size?`Buildings & streets · ${loaded.length}/${wanted.size} areas loading…`:!wanted.size?'No mapped surroundings here · Choose a field stop':`Buildings & streets · ${count.toLocaleString('en-GB')} parts${limited?' · Zoom in for more':''}`;
  Object.assign(badge.dataset,{mode:!enabled?'hidden':errors.length?'error':loaded.length<wanted.size?'loading':'exact',loadedTiles:entries.size,visibleTiles:loaded.length,wantedTiles:wanted.size,geometryBytes:totalBytes,downloadedBytes,activeRequests:running});
  badge.title='Actual footprints and streets. Central London has continuous coverage; outlying stops have local context patches. Nearby areas load first within the memory budget.';
 }
 async function load(tile){
  const controller=new AbortController();pending.set(tile.id,controller);running++;status();
  try{
   const response=await fetch(tile.mesh.url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);
   const compressed=await response.arrayBuffer();downloadedBytes+=compressed.byteLength;
   if(!wanted.has(tile.id)||!enabled)return;
   const buffer=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   if(!wanted.has(tile.id)||!enabled)return;
   const batches=decodeCityMesh(buffer),root=new T.Group();let bytes=0;
   for(const b of batches){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(b.position,3));g.setAttribute('normal',new T.BufferAttribute(b.normal,3,true));g.setIndex(new T.BufferAttribute(b.index,1));
    bytes+=b.position.byteLength+b.normal.byteLength+b.index.byteLength;
    const mesh=new T.Mesh(g,b.kind==='roads'?roadMat:mats[b.kind]);mesh.position.fromArray(b.min);mesh.scale.setScalar(b.scale);
    mesh.castShadow=b.kind!=='roads';mesh.receiveShadow=true;root.add(mesh);
   }
   if(totalBytes+bytes>maxBytes){root.traverse(o=>o.geometry?.dispose());throw Error('Geometry budget exceeded')}
   entries.set(tile.id,{id:tile.id,root,bytes});context.add(root);totalBytes+=bytes;
  }catch(error){if(error.name!=='AbortError'){failed.set(tile.id,error.message);console.warn('City region load failed',tile.id,error.message)}}
  finally{pending.delete(tile.id);running--;status();pump();changed()}
 }
 function pump(){
  if(!enabled)return;
  for(const id of wanted){if(running>=2)break;if(entries.has(id)||pending.has(id)||failed.has(id))continue;load(tiles.get(id))}
 }
 function update(bounds,span,center){
  wanted.clear();limited=false;
  if(enabled){
   const visible=city.tiles.filter(t=>t.bounds[0]<=bounds[2]&&t.bounds[2]>=bounds[0]&&t.bounds[1]<=bounds[3]&&t.bounds[3]>=bounds[1]);
   visible.sort((a,b)=>Math.hypot((a.bounds[0]+a.bounds[2])/2-center[0],(a.bounds[1]+a.bounds[3])/2-center[1])-Math.hypot((b.bounds[0]+b.bounds[2])/2-center[0],(b.bounds[1]+b.bounds[3])/2-center[1]));
   let planned=0;
   for(const t of visible){const bytes=t.mesh.geometryBytes;if(planned+bytes>maxBytes*.98){limited=true;continue}wanted.add(t.id);planned+=bytes}
  }
  for(const [id,c]of pending)if(!wanted.has(id))c.abort();
  for(const e of [...entries.values()])if(!wanted.has(e.id))dispose(e);
  status();clearTimeout(timer);timer=setTimeout(pump,100);changed();
 }
 function setEnabled(value){enabled=value;if(!value){wanted.clear();for(const c of pending.values())c.abort();for(const e of [...entries.values()])dispose(e)}status()}
 badge.onclick=()=>{for(const id of wanted)failed.delete(id);pump();status()};status();
 return {update,setEnabled};
}
