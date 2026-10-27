import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {recordGeometry,flatGeometry} from './geometry.js';
import {createTileStream} from './tile-stream.js';
import {addFinishAttribute,createFinishMaterial,finishes} from './landmark-finishes.js';
import {mapStyles,confidenceColours} from './map-styles.js';
import {placeName,overlaps} from './label-layout.js';
import {createPeople} from './people.js';
const $=s=>document.querySelector(s);
const material=color=>new T.MeshStandardMaterial({color,roughness:.92,metalness:0,side:T.DoubleSide});

export async function createAtlas(city,onSelect) {
 const host=$('#canvas-host'),scene=new T.Scene();scene.background=new T.Color(0xe9edf0);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.append(renderer.domElement);
 const camera=new T.OrthographicCamera(-3000,3000,2000,-2000,1,150000);
 const offset=new T.Vector3(40000,40000,40000),target=new T.Vector3();
 const maxZoom=()=>Math.max(400,view/45);
 const context=new T.Group(),ground=new T.Group();scene.add(context,ground);
 const original=new Map(),custom=new Map(),markers=new Map();
 const labelSides=new Map(),boundsCache=new WeakMap();
 let labelOptions={names:true,numbers:true};
 const finishMaterials=new Map(),finishAnimations=new Map(),visited=new Set();
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const groundMaterials={roads:material(0xf0f2f1)};let currentStyle='atlas',confidence=false,styleAnimation=null;
 const mats=Object.fromEntries(['height','levels','assumed'].map(key=>[key,material(mapStyles.atlas[key])]));
 const landmarkMat=material(mapStyles.atlas.landmark),importMat=material(0x93c8cb);
 let width=1,height=1,view=3700,zoom=1,labelsDirty=true,dirty=true,active='stpauls',fullImport=null,contextVisible=true,stream=null;
 const people=createPeople(scene);
 reducedMotion.addEventListener('change',()=>{people.invalidate();dirty=true;});
 document.addEventListener('visibilitychange',()=>{people.invalidate();dirty=true;});
 scene.add(new T.HemisphereLight(0xffffff,0x939ca6,2.4));
 const sun=new T.DirectionalLight(0xffffff,2.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 sun.shadow.bias=-.0003;sun.shadow.normalBias=.4;sun.shadow.camera.near=10;sun.shadow.camera.far=15000;scene.add(sun,sun.target);
 const [xmin,ymin,xmax,ymax]=city.bounds;
 const groundGeos=(city.coverage||[[[[xmin,ymin],[xmax,ymin],[xmax,ymax],[xmin,ymax]]]]).map(r=>flatGeometry(r,-.3));
 const plane=new T.Mesh(mergeGeometries(groundGeos),material(0xe2e6e6));groundGeos.forEach(g=>g.dispose());
 groundMaterials.ground=plane.material;plane.receiveShadow=true;ground.add(plane);
 for(const [name,records,color,y] of [['parks',city.parks,0xc9d6c4,-.1],['water',city.water,0x94b9c5,0]]){
  const gs=records.map(r=>flatGeometry(r,y));if(gs.length){const g=mergeGeometries(gs);gs.forEach(g=>g.dispose());const m=new T.Mesh(g,material(color));groundMaterials[name]=m.material;m.receiveShadow=true;ground.add(m)}
 }
 const roadGeos=[];
 for(const r of city.roads)for(let i=1;i<r.p.length;i++){
  const [ax,ay]=r.p[i-1],[bx,by]=r.p[i],len=Math.hypot(bx-ax,by-ay);if(len<.1)continue;
  const g=new T.PlaneGeometry(Math.min(30,r.w),len+.2);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(bx-ax,-(by-ay)));
  g.translate((ax+bx)/2,r.bridge?7.5:.06,-(ay+by)/2);roadGeos.push(g);
 }
 if(roadGeos.length){const m=new T.Mesh(mergeGeometries(roadGeos),groundMaterials.roads);m.receiveShadow=true;ground.add(m);roadGeos.forEach(g=>g.dispose())}
 const batches={height:[],levels:[],assumed:[]},landmarkBatches=new Map(city.landmarks.map(b=>[b.id,[]]));
 for(let i=0;i<city.buildings.length;i++){
  const r=city.buildings[i],gs=recordGeometry(r);if(r.lm)gs.forEach((g,j)=>addFinishAttribute(g,r,j,gs.length));(r.lm?landmarkBatches.get(r.lm):batches[r.c]).push(...gs);
  if(i%500===0){$('#loading').textContent=`Preparing building models · ${Math.round(i/city.buildings.length*100)}%`;await new Promise(resolve=>setTimeout(resolve,0))}
 }
 function mergedMesh(gs,mat,id){if(!gs.length)return new T.Group();const m=new T.Mesh(mergeGeometries(gs),mat);m.name=id;m.userData.id=id;m.castShadow=true;m.receiveShadow=true;gs.forEach(g=>g.dispose());return m}
 for(const c of Object.keys(batches))context.add(mergedMesh(batches[c],mats[c],'context'));
 for(const b of city.landmarks){const g=mergedMesh(landmarkBatches.get(b.id),landmarkMat,b.id);scene.add(g);original.set(b.id,g);
  const el=document.createElement('button');el.className='marker';el.dataset.id=b.id;el.setAttribute('aria-label','Select '+b.name);
  el.innerHTML=`<span class="pin">${String(city.landmarks.indexOf(b)+1).padStart(2,'0')}</span><span class="marker-name">${b.name}</span>`;
  el.onclick=()=>onSelect(b.id);$('#markers').append(el);markers.set(b.id,el);
 }
 const boxHelper=new T.Box3Helper(new T.Box3(),0x153bec);scene.add(boxHelper);boxHelper.visible=false;
 if(city.tiles)stream=createTileStream(city,context,mats,()=>{dirty=true;renderer.shadowMap.needsUpdate=true},groundMaterials.roads);
 const getObject=id=>custom.get(id)||fullImport?.landmarks.get(id)||original.get(id);
 function objectBounds(id){const obj=getObject(id);return obj?new T.Box3().setFromObject(obj):new T.Box3()}
 function sync(){
  people.invalidate();
  labelsDirty=true;
  const aspect=width/height;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.zoom=zoom;
  camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  if(stream){
   const pts=[];
   for(const x of [-1,1])for(const y of [-1,1]){
    const p=new T.Vector3(x,y,-1).unproject(camera),direction=new T.Vector3(0,0,-1).transformDirection(camera.matrixWorld);
    p.addScaledVector(direction,-p.y/direction.y);pts.push([p.x,-p.z]);
   }
   stream.update([Math.min(...pts.map(p=>p[0]))-320,Math.min(...pts.map(p=>p[1]))-320,Math.max(...pts.map(p=>p[0]))+320,Math.max(...pts.map(p=>p[1]))+320],view/zoom,[target.x,-target.z]);
  }
  const s=Math.max(700,view/zoom);sun.target.position.copy(target);sun.position.copy(target).add(new T.Vector3(-2500,4500,2000));
  Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
  $('#zoom-value').textContent=Math.round(zoom*2200/view*100)+'%';$('#zoom-in').disabled=zoom>=maxZoom();$('#zoom-out').disabled=zoom<=.55;
  const approx=view/zoom*90/height,nice=[1,2,5,10,20,50,100,200,500,1000,2000].filter(n=>n<=approx).at(-1)||1;
  $('#scale-line').style.width=(nice*height*zoom/view)+'px';$('#scale-label').textContent=nice>=1000?(nice/1000)+' km':nice+' m';dirty=true;
 }
 function reset(){zoom=1;target.set((xmin+xmax)/2,0,-(ymin+ymax)/2);sync()}
 function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height);view=Math.max(3000,((xmax-xmin)+(ymax-ymin))*.707/(width/height)*1.12);sync()}
 new ResizeObserver(resize).observe(host);resize();
 // Start at a readable central-London scale. The full-map control includes Isokon.
 target.set(-250,0,120);zoom=T.MathUtils.clamp(view/2200,.55,maxZoom());sync();
 function setZoom(f){zoom=T.MathUtils.clamp(zoom*f,.55,maxZoom());sync()}
 function select(id,focus=true){labelsDirty=true;active=id;const bb=objectBounds(id);boxHelper.box.copy(bb);boxHelper.visible=!bb.isEmpty()&&!visited.has(id);
  if(focus&&!bb.isEmpty()){
   const size=bb.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,60);bb.getCenter(target);zoom=T.MathUtils.clamp(view/(span*(width<600?3.5:2.4)),.55,maxZoom());
   if(width<600){target.x+=span*.36;target.z+=span*.36}else{target.x+=span*.22;target.z-=span*.22}sync();
  }else if(focus){const b=city.landmarks.find(b=>b.id===id);target.set(b.anchor[0],0,-b.anchor[1]);zoom=T.MathUtils.clamp(view/500,.55,maxZoom());sync()}dirty=true;
 }
 function setContext(value){contextVisible=value;context.visible=value&&!fullImport;stream?.setEnabled(value&&!fullImport);if(fullImport)fullImport.context.visible=value;sync()}
 function setVisited(id,value,animate=true){
  people.setVisited(id,value,animate);
  if(visited.has(id)===value&&!animate)return;
  const mesh=original.get(id);
  if(value)visited.add(id);else visited.delete(id);
  if(id===active)boxHelper.visible=!value&&!boxHelper.box.isEmpty();
  const el=markers.get(id);el.classList.toggle('visited',value);
  const b=city.landmarks.find(b=>b.id===id);
  el.setAttribute('aria-label','Select '+b.name+(value?' · visited':''));
  if(!mesh?.isMesh||!finishes[id]){dirty=true;return}
  if(!finishMaterials.has(id)&&value){
   mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new T.Vector3());
   finishMaterials.set(id,createFinishMaterial(id,[center.x,-center.z],[mesh.geometry.boundingBox.min.y,mesh.geometry.boundingBox.max.y]));
  }
  const mat=finishMaterials.get(id);if(!mat)return;
  mat.color.copy(landmarkMat.color);mesh.material=mat;
  const end=value?1:0;
  if(animate&&!reducedMotion.matches)finishAnimations.set(id,{start:null,from:mat.userData.reveal.value,to:end,duration:Math.max(240,1200*Math.abs(end-mat.userData.reveal.value))});
  else{mat.userData.reveal.value=end;finishAnimations.delete(id);if(!value)mesh.material=landmarkMat;}
  dirty=true;
 }
 function setStyle(id,animate=true){
  if(!Object.hasOwn(mapStyles,id))return;
  currentStyle=id;const palette=mapStyles[id];$('#map').dataset.style=id;
  const targets=[[scene.background,palette.background],[landmarkMat.color,palette.landmark],[boxHelper.material.color,palette.selection]];
  for(const [key,mat]of Object.entries(groundMaterials))targets.push([mat.color,palette[key]]);
  for(const [key,mat]of Object.entries(mats))targets.push([mat.color,confidence?confidenceColours[key]:palette[key]]);
  const colours=targets.map(([color,to])=>({color,from:color.clone(),to:new T.Color(to)}));
  if(animate&&!reducedMotion.matches)styleAnimation={start:performance.now(),colours};
  else{styleAnimation=null;for(const c of colours)c.color.copy(c.to);}
  dirty=true;
 }
 function setConfidence(value){confidence=value;setStyle(currentStyle,false);}
 function setLabels(options){labelOptions={names:!!options.names,numbers:!!options.numbers};labelsDirty=dirty=true;}
 function setPeople(value){people.setEnabled(value);dirty=true;}
 function setLandscape(value){people.setLandscape(value);dirty=true;}
 function focusPeople(id){
  if(custom.has(id)||fullImport)return;
  const point=people.focus(id);if(!point)return;
  target.copy(point);zoom=T.MathUtils.clamp(view/Math.max(120,point.span*1.25),.55,maxZoom());
  if(width>=600)target.x+=20;else target.x+=8;
  sync();
 }

 const pointers=new Map();let gesture=null,moved=false;
 function gestureStart(){const p=[...pointers.values()];gesture=p.length===1?{x:p[0].x,y:p[0].y,target:target.clone(),zoom}:p.length>=2?{dist:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom}:null}
 const ray=new T.Raycaster(),mouse=new T.Vector2();
 host.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);moved=false;gestureStart()});
 host.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...pointers.values()];
  if(p.length>1){moved=true;zoom=T.MathUtils.clamp(gesture.zoom*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/Math.max(1,gesture.dist),.55,maxZoom());sync();return}
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
  target.copy(gesture.target).add(new T.Vector3(-dx/Math.SQRT2-dy*Math.sqrt(1.5),0,dx/Math.SQRT2-dy*Math.sqrt(1.5)).multiplyScalar(view/height/zoom));sync();
 });
 host.addEventListener('pointerup',e=>{
  const multi=pointers.size>1;pointers.delete(e.pointerId);
  if(!moved&&!multi){const r=host.getBoundingClientRect();mouse.set((e.clientX-r.left)/width*2-1,-(e.clientY-r.top)/height*2+1);ray.setFromCamera(mouse,camera);
   const objects=city.landmarks.map(b=>getObject(b.id)).filter(g=>g?.visible);const hit=ray.intersectObjects(objects,true)[0];if(hit?.object.userData.id)onSelect(hit.object.userData.id)}gestureStart();
 });
 host.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);moved=true;gestureStart()});
 host.addEventListener('wheel',e=>{e.preventDefault();setZoom(Math.exp(-e.deltaY*.0012))},{passive:false});
 host.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')setZoom(1.2);else if(e.key==='-')setZoom(1/1.2);else if(e.key==='Home')reset();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const x=e.key==='ArrowRight'?50:e.key==='ArrowLeft'?-50:0,z=e.key==='ArrowDown'?50:e.key==='ArrowUp'?-50:0;target.add(new T.Vector3(x+z,0,-x+z).multiplyScalar(view/3700/zoom));sync()}else return;e.preventDefault()});
 function dispose(root){root.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==importMat)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()})}
 function restore(id){
  if(id==='city'&&fullImport){scene.remove(fullImport.root);dispose(fullImport.root);fullImport=null;context.visible=contextVisible;stream?.setEnabled(contextVisible);for(const [key,g]of original)g.visible=!custom.has(key);sync()}
  else if(custom.has(id)){const g=custom.get(id);scene.remove(g);dispose(g);custom.delete(id);if(fullImport?.landmarks.has(id))fullImport.landmarks.get(id).visible=true;else original.get(id).visible=!fullImport}
  select(active,false);dirty=true;renderer.shadowMap.needsUpdate=true;
 }
 function applyImport(prepared,id){
  restore(id);const g=prepared.root;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=importMat}});
  if(id==='city'){
   const groups=new Map(),ctx=new T.Group(),root=new T.Group();root.add(ctx);
   for(const child of [...g.children]){const key=child.userData.id;if(city.landmarks.some(b=>b.id===key)){if(!groups.has(key)){const gr=new T.Group();gr.userData.id=key;groups.set(key,gr);root.add(gr)}groups.get(key).add(child)}else ctx.add(child)}
   for(const group of [ctx,...groups.values()]){const geometries=[];for(const child of [...group.children]){let geo=child.geometry;if(geo.index){const n=geo.toNonIndexed();geo.dispose();geo=n}for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);if(!geo.attributes.normal)geo.computeVertexNormals();geometries.push(geo);group.remove(child)}if(geometries.length)group.add(mergedMesh(geometries,importMat,group.userData.id||'context'))}
   for(const g of original.values())g.visible=false;for(const [id,group]of groups)group.visible=!custom.has(id);context.visible=false;stream?.setEnabled(false);ctx.visible=contextVisible;scene.add(root);fullImport={root,context:ctx,landmarks:groups};
  }else {
   const b=city.landmarks.find(b=>b.id===id);g.position.set(b.anchor[0],0,-b.anchor[1]);g.traverse(o=>o.userData.id=id);scene.add(g);custom.set(id,g);original.get(id).visible=false;if(fullImport?.landmarks.has(id))fullImport.landmarks.get(id).visible=false;
  }
  renderer.shadowMap.needsUpdate=true;select(active,id===active);
 }
 function measurements(id){const b=objectBounds(id);if(b.isEmpty())return null;const s=b.getSize(new T.Vector3());return {east:s.x,north:s.z,height:s.y,top:b.max.y,custom:custom.has(id)||!!fullImport}}
 // UI surfaces can change without a camera movement (card close, legend, fonts).
 const surfaces=[...document.querySelectorAll('.map-title,.model-toolbar,.label-options,.stream-status,#confidence-legend,.view-badge,.controls,.detail,.scale,.compass,.map-footer,.interaction-hint')];
 const uiResize=new ResizeObserver(()=>{labelsDirty=dirty=true});surfaces.forEach(el=>uiResize.observe(el));
 new MutationObserver(()=>{labelsDirty=dirty=true}).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(()=>{labelsDirty=dirty=true}).observe($('#confidence-legend'),{attributes:true,attributeFilter:['hidden']});
 $('#label-controls').addEventListener('toggle',()=>{labelsDirty=dirty=true});
 document.fonts.ready.then(()=>{labelsDirty=dirty=true});
 const screen=p=>{p.project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height}};
 function layoutMarkers(){
  if(!labelsDirty)return;labelsDirty=false;
  const hostRect=host.getBoundingClientRect(),viewport={w:width,h:height};
  const ui=surfaces.filter(el=>el.getClientRects().length&&!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {x:r.left-hostRect.left,y:r.top-hostRect.top,w:r.width,h:r.height}});
  const items=city.landmarks.map(b=>{
   const obj=getObject(b.id);let bb=obj&&boundsCache.get(obj);
   if(!bb){bb=objectBounds(b.id);if(obj)boundsCache.set(obj,bb)}
   const points=[];
   if(!bb.isEmpty())for(const x of [bb.min.x,bb.max.x])for(const y of [bb.min.y,bb.max.y])for(const z of [bb.min.z,bb.max.z])points.push(screen(new T.Vector3(x,y,z)));
   const c=bb.isEmpty()?new T.Vector3(b.anchor[0],b.modelHeight,-b.anchor[1]):bb.getCenter(new T.Vector3());c.y=bb.isEmpty()?b.modelHeight:bb.max.y;
   const anchor=screen(c),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
   const bounds=points.length?{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}:{x:anchor.x,y:anchor.y,w:0,h:0};
   return {b,anchor,bounds,visible:overlaps(bounds,{x:0,y:0,w:width,h:height})};
  }).sort((a,b)=>(b.b.id===active?1:0)-(a.b.id===active?1:0));
  const used=[],sizes=new Map();
  for(const i of items){
   const el=markers.get(i.b.id);el.style.display=i.visible?'flex':'none';
   el.classList.toggle('numbers-hidden',!labelOptions.numbers);el.classList.remove('number-only','name-left');
  }
  for(const i of items)if(i.visible){const el=markers.get(i.b.id);sizes.set(i.b.id,{w:el.offsetWidth,h:el.offsetHeight})}
  for(const {b,anchor,visible} of items){
   const el=markers.get(b.id);if(!visible)continue;
   if(!labelOptions.names&&!labelOptions.numbers){el.style.display='none';continue}
   const selected=b.id===active,pinWidth=width<=700?22:24;
   const showName=labelOptions.names&&(selected||!labelOptions.numbers||height*zoom/view>=.11);
   const others=items.filter(i=>i.visible&&i.b.id!==b.id).map(i=>i.bounds);
   const obstacles=[...ui,...others,...used];
   let placed=showName?placeName({anchor,size:sizes.get(b.id),pinWidth:labelOptions.numbers?pinWidth:0,viewport,obstacles,previous:labelSides.get(b.id)}):null;
   if(!placed&&labelOptions.numbers){
    el.classList.add('number-only');
    placed=placeName({anchor,size:{w:pinWidth+12,h:pinWidth+12},viewport,obstacles:[...ui,...used]});
   }
   if(!placed){el.style.display='none';continue}
   if(!el.classList.contains('number-only'))labelSides.set(b.id,placed.side);
   used.push(placed);el.classList.toggle('name-left',placed.side==='left');
   el.style.left=placed.x+'px';el.style.top=placed.y+'px';el.style.zIndex=selected?'3':'2';
  }
 }
 function render(){requestAnimationFrame(render);
  if(people.update(performance.now(),{camera,pixelsPerMetre:height*zoom/view,hidden:document.hidden,reducedMotion:reducedMotion.matches,selected:active,blocked:id=>!!fullImport||custom.has(id)}))dirty=true;
  for(const [id,a]of finishAnimations){
   const t=reducedMotion.matches?1:a.start===null?0:Math.min(1,(performance.now()-a.start)/a.duration),ease=t*t*(3-2*t);
   finishMaterials.get(id).userData.reveal.value=a.from+(a.to-a.from)*ease;dirty=true;
   if(t===1){finishAnimations.delete(id);if(a.to===0)original.get(id).material=landmarkMat;}
  }
  if(styleAnimation){
   const t=reducedMotion.matches?1:Math.min(1,(performance.now()-styleAnimation.start)/400),ease=t*t*(3-2*t);
   for(const c of styleAnimation.colours)c.color.lerpColors(c.from,c.to,ease);
   if(t===1)styleAnimation=null;dirty=true;
  }
  if(!dirty||document.hidden)return;dirty=false;
  for(const mat of finishMaterials.values())mat.color.copy(landmarkMat.color);
  renderer.render(scene,camera);
  // Start the clock after the first render: shader compilation must not
  // consume the reveal duration on the first visit, or on a slower device.
  for(const a of finishAnimations.values())if(a.start===null)a.start=performance.now();
  layoutMarkers();
 }render();renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false});
 return {select,zoom:setZoom,reset,setContext,setConfidence,setLabels,setVisited,setStyle,setPeople,setLandscape,focusPeople,measurements,applyImport,restore};
}

let loader;
export async function prepareRhino(buffer,unitOverride='auto'){
 if(!loader){const {Rhino3dmLoader}=await import('./vendor/3DMLoader.js');loader=new Rhino3dmLoader().setLibraryPath('./vendor/rhino/').setWorkerLimit(1)}
 const decoded=await new Promise((resolve,reject)=>loader.parse(buffer,resolve,reject));
 const unit=decoded.userData.settings?.modelUnitSystem,value=typeof unit==='object'?unit.value:unit;
 const units={1:1e-6,2:.001,3:.01,4:1,5:1000,8:.0254,9:.3048};const factor=unitOverride==='auto'?units[value]:Number(unitOverride);
 if(!factor)throw new Error('Unable to read file units. Select metres or millimetres manually.');
 const root=new T.Group(),axis=new T.Matrix4().makeRotationX(-Math.PI/2).multiply(new T.Matrix4().makeScale(factor,factor,factor));
 decoded.updateMatrixWorld(true);let triangles=0;
 decoded.traverse(obj=>{
  if(!obj.isMesh)return;let p=obj;while(p){if(!p.visible)return;p=p.parent}
  const geo=obj.geometry.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(axis);triangles+=(geo.index?geo.index.count:geo.attributes.position.count)/3;
  const m=new T.Mesh(geo);const name=obj.userData.attributes?.name||obj.name||'';m.name=name;m.userData.id=/^LM:([^|]+)/.exec(name)?.[1]||'context';root.add(m);
 });
 const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
 if(root.children.length===0)throw new Error('No displayable meshes found. Use Mesh in Rhino or include render meshes when saving.');
 if(triangles>3000000)throw new Error('This model is too complex. Use ReduceMesh in Rhino to bring it below 3 million triangles.');
 if(![box.min.x,box.min.y,box.min.z,box.max.x,box.max.y,box.max.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)>25000)throw new Error('The model exceeds 25 km or has invalid coordinates. Check its units and origin.');
 const warnings=(decoded.userData.warnings||[]).length;
 decoded.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()});
 return {root,size:{east:size.x,north:size.z,height:size.y},bounds:box,triangles,objects:root.children.length,factor,warnings};
}
