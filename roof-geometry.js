import * as T from './vendor/three.module.js';

// OSM roof:direction is the downslope bearing; absent bearings use a minimum-area
// footprint frame, with the ridge along its long side. No footprint is replaced.
function frame(rings,dir){
 const ring=rings[0];let axis;
 if(Number.isFinite(dir)){const a=dir*Math.PI/180;axis=[Math.sin(a),Math.cos(a)];}
 else{
  let best=Infinity;
  for(let i=0;i<ring.length;i++){
   const p=ring[i],q=ring[(i+1)%ring.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(len<.01)continue;
   const ex=(q[0]-p[0])/len,ey=(q[1]-p[1])/len;
   const u=ring.map(p=>p[0]*ex+p[1]*ey),v=ring.map(p=>-p[0]*ey+p[1]*ex);
   const w=Math.max(...u)-Math.min(...u),d=Math.max(...v)-Math.min(...v);
   if(w*d<best){best=w*d;axis=w<d?[ex,ey]:[-ey,ex];}
  }
 }
 axis??=[1,0];const [dx,dy]=axis,uv=ring.map(p=>[p[0]*dx+p[1]*dy,-p[0]*dy+p[1]*dx]);
 return {dx,dy,u0:Math.min(...uv.map(p=>p[0])),u1:Math.max(...uv.map(p=>p[0])),v0:Math.min(...uv.map(p=>p[1])),v1:Math.max(...uv.map(p=>p[1]))};
}
function clip(poly,axis,value,keepLow){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],fa=keepLow?a[axis]<=value+1e-8:a[axis]>=value-1e-8,fb=keepLow?b[axis]<=value+1e-8:b[axis]>=value-1e-8;
  if(fa)out.push(a);
  if(fa!==fb){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
 }return out;
}
function splitOnLine(poly,fn){
 const values=poly.map(fn);if(Math.min(...values)>=-1e-9||Math.max(...values)<=1e-9)return [poly];
 return [1,-1].map(sign=>{
  const out=[];
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],va=values[i]*sign,vb=values[(i+1)%poly.length]*sign;
   if(va>=-1e-9)out.push(a);
   if((va>=0)!==(vb>=0)){const t=va/(va-vb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }return out;
 }).filter(p=>p.length>=3);
}
export function roofGeometry(rings,base,height,shape,dir){
 rings=rings.map(r=>r.filter((p,i)=>!i||p[0]!==r[i-1][0]||p[1]!==r[i-1][1]).map(p=>[...p]));
 for(const r of rings)if(r.length>1&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1])r.pop();
 const f=frame(rings,dir),w=Math.max(.01,f.u1-f.u0),d=Math.max(.01,f.v1-f.v0);
 const local=rings.map(r=>r.map(p=>[p[0]*f.dx+p[1]*f.dy,-p[0]*f.dy+p[1]*f.dx]));
 const cutsU=shape==='round'?Array.from({length:25},(_,i)=>f.u0+w*i/24):[f.u0,f.u0+w*.2,f.u0+w*.5,f.u0+w*.8,f.u1];
 const hip=['hipped','half-hipped','mansard'].includes(shape),inset=Math.min(w/2,d/2);
 const cutsV=hip?[f.v0,f.v0+inset,f.v1-inset,f.v1]:[f.v0,f.v1];
 if(shape==='mansard')cutsV.push(f.v0+.4*inset,f.v1-.4*inset);
 cutsV.sort((a,b)=>a-b);
 const hipBase=shape==='half-hipped'?.5:0,hipScale=shape==='half-hipped'?.5:1;
 // A hip changes slope along diagonal side/end equality lines. Split exactly
 // on those creases rather than stretching a triangle across two roof planes.
 const creases=hip?[
  p=>2*(p[0]-f.u0)/w-hipBase-hipScale*(p[1]-f.v0)/inset,
  p=>2*(f.u1-p[0])/w-hipBase-hipScale*(p[1]-f.v0)/inset,
  p=>2*(p[0]-f.u0)/w-hipBase-hipScale*(f.v1-p[1])/inset,
  p=>2*(f.u1-p[0])/w-hipBase-hipScale*(f.v1-p[1])/inset
 ]:[];
 const value=(u,v)=>{
  const t=Math.max(0,Math.min(1,(u-f.u0)/w));
  if(shape==='skillion')return 1-t;
  if(shape==='round')return Math.sqrt(Math.max(0,1-(2*t-1)**2));
  let g=1-Math.abs(2*t-1);
  if(hip){const end=Math.min((v-f.v0)/inset,(f.v1-v)/inset);g=Math.min(g,shape==='half-hipped'?.5+end/2:end);}
  if(shape==='mansard')g=g<.4?g*1.75:.7+(g-.4)*.5;
  return Math.max(0,Math.min(1,g));
 };
 const verts=[],world=(p,z)=>[p[0]*f.dx-p[1]*f.dy,p[0]*f.dy+p[1]*f.dx,z];
 const tri=(a,b,c)=>{verts.push(...a,...b,...c);};
 const flat=local.flat(),indices=T.ShapeUtils.triangulateShape(local[0].map(p=>new T.Vector2(...p)),local.slice(1).map(r=>r.map(p=>new T.Vector2(...p))));
 for(const inds of indices){
  let p=inds.map(i=>flat[i]);
  if((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0])<0)p=[p[0],p[2],p[1]];
  tri(world(p[2],base),world(p[1],base),world(p[0],base));
  for(let i=1;i<cutsU.length;i++)for(let j=1;j<cutsV.length;j++){
   let cell=clip(clip(clip(clip(p,0,cutsU[i-1],false),0,cutsU[i],true),1,cutsV[j-1],false),1,cutsV[j],true);
   if(cell.length<3)continue;
   let pieces=[cell];for(const crease of creases)pieces=pieces.flatMap(poly=>splitOnLine(poly,crease));
   for(const piece of pieces)for(let k=1;k<piece.length-1;k++)tri(...[piece[0],piece[k],piece[k+1]].map(v=>world(v,base+height*value(...v))));
  }
 }
 for(let ri=0;ri<local.length;ri++){
  let ring=local[ri];const area=ring.reduce((n,a,i)=>{const b=ring[(i+1)%ring.length];return n+a[0]*b[1]-b[0]*a[1]},0);
  if((area>0)!==(ri===0))ring=[...ring].reverse();
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],ts=[0,1];
   for(const [axis,cuts]of [[0,cutsU],[1,cutsV]])for(const c of cuts){const t=(c-a[axis])/(b[axis]-a[axis]);if(t>1e-8&&t<1-1e-8)ts.push(t);}
   for(const crease of creases){const va=crease(a),vb=crease(b),t=va/(va-vb);if(t>1e-8&&t<1-1e-8)ts.push(t);}
   ts.sort((a,b)=>a-b);
   for(let j=1;j<ts.length;j++){
    const p=ts.slice(j-1,j+1).map(t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    const lo=p.map(v=>world(v,base)),hi=p.map(v=>world(v,base+height*value(...v)));
    tri(lo[0],lo[1],hi[1]);tri(lo[0],hi[1],hi[0]);
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));return g;
}
