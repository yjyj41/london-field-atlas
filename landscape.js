import * as T from './vendor/three.module.js';
import {visitTrees} from './visit-landscape.js';
import {TREE_BUDGET,viewKey,prioritise} from './scene-budget.js';

export function createLandscape(scene){
 const group=new T.Group();group.name='Visited-place planting';scene.add(group);
 const count=TREE_BUDGET;
 const trunk=new T.InstancedMesh(new T.CylinderGeometry(.13,.20,1,6),new T.MeshStandardMaterial({color:'#796149',roughness:1}),count);
 const crown=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),count*3);
 group.add(trunk,crown);trunk.count=crown.count=0;
 for(const mesh of [trunk,crown]){mesh.frustumCulled=false;mesh.castShadow=false;}
 const visited=new Set(),matrix=new T.Matrix4(),frustum=new T.Frustum(),part=new T.Object3D();
 const trees=Object.entries(visitTrees).flatMap(([id,items])=>items.map(t=>({...t,id,centre:new T.Vector3(t.x,t.height/2,-t.north),box:new T.Box3(new T.Vector3(t.x-t.radius*1.12,0,-t.north-t.radius*1.12),new T.Vector3(t.x+t.radius*1.12,t.height,-t.north+t.radius*1.12))})));
 let view='';
 let enabled=true,invalid=true,signature='';
 const colours=['#618568','#7b966b','#537b67','#8e9b6e'];
 function update({camera,pixelsPerMetre,hidden,blocked,selected}){
  const vk=viewKey(camera,pixelsPerMetre,hidden,selected)+'|'+[...visited].filter(blocked).join(',');
  if(!invalid&&vk===view)return false;view=vk;
  frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const candidates=enabled&&!hidden&&pixelsPerMetre>=.65?trees.filter(t=>visited.has(t.id)&&!blocked(t.id)&&frustum.intersectsBox(t.box)):[];
  const visible=prioritise(candidates,camera,selected).slice(0,count);
  const key=visible.map(t=>t.x+','+t.north).join('|');if(!invalid&&key===signature)return false;
  invalid=false;signature=key;
  const put=(mesh,i,x,y,z,sx,sy,sz)=>{part.position.set(x,y,z);part.scale.set(sx,sy,sz);part.rotation.y=i*.71;part.updateMatrix();mesh.setMatrixAt(i,part.matrix);};
  visible.forEach((t,i)=>{
   const stem=t.height*.48;put(trunk,i,t.x,stem/2+.08,-t.north,1,stem,1);
   for(let lobe=0;lobe<3;lobe++){
    const a=lobe*Math.PI*2/3+i*.7,spread=lobe===0?0:t.radius*.32;
    put(crown,i*3+lobe,t.x+Math.cos(a)*spread,t.height*(lobe===0?.73:.60),-t.north+Math.sin(a)*spread,t.radius*.8,t.height*.27,t.radius*.8);
    crown.setColorAt(i*3+lobe,new T.Color(colours[(i+lobe)%colours.length]));
   }
  });
  trunk.count=visible.length;crown.count=visible.length*3;group.visible=!!visible.length;
  trunk.instanceMatrix.needsUpdate=crown.instanceMatrix.needsUpdate=true;if(crown.instanceColor)crown.instanceColor.needsUpdate=true;
  return true;
 }
 return {update,setVisited(id,on){if(on===visited.has(id))return;on?visited.add(id):visited.delete(id);invalid=true;},setEnabled(on){enabled=on;invalid=true;},invalidate(){invalid=true;}};
}
