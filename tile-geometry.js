import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {recordGeometry} from './geometry.js';

export async function buildTileData(data,yieldWork=false){
 const batches={height:[],levels:[],assumed:[],roads:[]};
 for(let i=0;i<data.buildings.length;i++){
  const r=data.buildings[i];batches[r.c].push(...recordGeometry(r));
  if(yieldWork&&i%100===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 for(const r of data.roads)for(let i=1;i<r.p.length;i++){
  const [ax,ay]=r.p[i-1],[bx,by]=r.p[i],len=Math.hypot(bx-ax,by-ay);if(len<.1)continue;
  const g=new T.PlaneGeometry(Math.min(30,r.w),len+.2);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(bx-ax,-(by-ay)));
  g.translate((ax+bx)/2,r.bridge?7.5:.06,-(ay+by)/2);
  const n=g.toNonIndexed();g.dispose();n.deleteAttribute('uv');batches.roads.push(n);
 }
 const result={};
 for(const [kind,gs]of Object.entries(batches)){
  if(!gs.length)continue;
  const g=mergeGeometries(gs);gs.forEach(g=>g.dispose());
  result[kind]={position:g.attributes.position.array,normal:g.attributes.normal.array};
  // Arrays are transferred to the main thread; dispose removes no typed data.
  g.dispose();
 }
 return result;
}
