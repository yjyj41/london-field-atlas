import * as T from './vendor/three.module.js';
import {walkRoutes} from './walk-routes.js';
import {prepareWalk,walkPose} from './walk-motion.js';
import {createLandscape} from './landscape.js';
import {PEOPLE_BUDGET,viewKey,prioritise} from './scene-budget.js';
export {walkRoutes};

// Four instanced draws, fixed capacity independent of catalogue size. Never pickable.
export function createPeople(scene){
 const capacity=PEOPLE_BUDGET,group=new T.Group();group.name='Visited-place walkers';scene.add(group);
 const landscape=createLandscape(scene);
 const material=color=>new T.MeshStandardMaterial({color,roughness:.95});
 const meshes={head:new T.InstancedMesh(new T.SphereGeometry(.15,7,5),material('#c99c7c'),capacity),
  body:new T.InstancedMesh(new T.BoxGeometry(.42,.60,.25),material('#ffffff'),capacity),
  arms:new T.InstancedMesh(new T.BoxGeometry(.12,.55,.13),material('#ffffff'),capacity*2),
  legs:new T.InstancedMesh(new T.BoxGeometry(.145,.72,.17),material('#35414a'),capacity*2)};
 for(const mesh of Object.values(meshes)){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);}
 const palette=['#a34e3e','#315c6c','#cfaa64','#5c6750','#5f526f','#a67750'];
 const routes=Object.entries(walkRoutes).flatMap(([id,items])=>items.map(r=>{
  const box=new T.Box3();for(const [x,n]of r.points)box.expandByPoint(new T.Vector3(x,r.elevation,-n));box.expandByScalar(2);
  return {...r,id,path:prepareWalk(r.points),box,centre:box.getCenter(new T.Vector3())};
 }));
 const visited=new Set(),arrivals=new Map(),frustum=new T.Frustum(),matrix=new T.Matrix4(),root=new T.Object3D(),part=new T.Object3D();
 let enabled=true,invalid=true,lastFrame=-Infinity,lastCount=0,clock=0,lastTime=null;
 let view='',visible=[];
 function setVisited(id,value,animate){
  landscape.setVisited(id,value);
  if(value===visited.has(id))return;
  if(value){visited.add(id);arrivals.set(id,animate?performance.now()/1000+1.1:-Infinity);}else{visited.delete(id);arrivals.delete(id);}
  invalid=true;
 }
 function update(now,{camera,pixelsPerMetre,hidden,reducedMotion,blocked,selected}){
  const plantingChanged=landscape.update({camera,pixelsPerMetre,hidden,blocked,selected});
  const dt=lastTime===null?0:Math.min(.1,(now-lastTime)/1000);lastTime=now;
  const moving=!hidden&&!reducedMotion&&enabled;
  // Stop the simulation when hidden or reduced motion is requested.
  if(moving)clock+=dt;
  const key=viewKey(camera,pixelsPerMetre,hidden,selected)+'|'+[...visited].filter(blocked).join(',');
  if(invalid||key!==view){
   view=key;frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
   const candidates=enabled&&!hidden&&pixelsPerMetre>=1?routes.filter(r=>visited.has(r.id)&&!blocked(r.id)&&frustum.intersectsBox(r.box)):[];
   visible=[];let remaining=capacity;
   for(const r of prioritise(candidates,camera,selected)){if(!remaining)break;const people=Math.min(remaining,r.people);visible.push({...r,people});remaining-=people;}
  }
  const signature=visible.map(r=>r.id+':'+r.sourceId+':'+r.people).join('|');
  if(signature!==group.userData.signature){group.userData.signature=signature;invalid=true;}
  if(!invalid&&(!visible.length||reducedMotion||now-lastFrame<1000/30))return plantingChanged;
  lastFrame=now;invalid=false;let count=0;
  const put=(mesh,index,x,y,z,rotation=0)=>{part.position.set(x,y,z);part.rotation.set(rotation,0,0);part.scale.set(1,1,1);part.updateMatrix();matrix.multiplyMatrices(root.matrix,part.matrix);mesh.setMatrixAt(index,matrix);};
  for(const route of visible){
   const elapsed=now/1000-arrivals.get(route.id),appear=reducedMotion?1:Math.min(1,Math.max(0,elapsed/.55));
   if(appear<1)invalid=true;if(!appear)continue;
   for(let i=0;i<route.people&&count<capacity;i++){
    const speed=route.path.loop ? .95 : 1.02;
    const pose=walkPose(route.path,clock,speed,i*(route.path.length/route.people/speed));
    const gait=reducedMotion?0:pose.gait,scale=(.96+(i%3)*.025)*appear;
    root.position.set(pose.x,route.elevation,-pose.north);root.rotation.set(0,pose.heading,0);root.scale.setScalar(scale);root.updateMatrix();
    const colour=new T.Color(palette[i%palette.length]);meshes.body.setColorAt(count,colour);
    put(meshes.body,count,0,1.13,0);put(meshes.head,count,0,1.59,0);
    for(let side=0;side<2;side++){
     const sign=side?1:-1,angle=sign*gait,index=count*2+side;
     put(meshes.legs,index,sign*.115,.77-Math.cos(angle)*.36,-Math.sin(angle)*.36,angle);
     put(meshes.arms,index,sign*.28,1.40-Math.cos(angle)*.275,Math.sin(angle)*.275,-angle);
     meshes.arms.setColorAt(index,colour);
    }
    count++;
   }
  }
  meshes.head.count=meshes.body.count=count;meshes.arms.count=meshes.legs.count=count*2;
  for(const mesh of Object.values(meshes)){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  group.visible=count>0;const changed=count>0||lastCount!==count;lastCount=count;return changed||plantingChanged;
 }
 return {setVisited,update,setEnabled(value){enabled=value;invalid=true;},setLandscape:landscape.setEnabled,invalidate(){invalid=true;landscape.invalidate();},
  focus(id){const items=routes.filter(r=>r.id===id);if(!items.length)return null;const bounds=new T.Box3();items.forEach(r=>bounds.union(r.box));const p=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());p.span=Math.max(size.x,size.z,100);return p;}};
}
