import * as T from './vendor/three.module.js';
import {catalogFinishes} from './catalog-finishes.js';

// Reference-informed surface studies, not surveyed facade drawings or photo textures.
// Original studies use credited card photos. Catalogue studies explicitly mark provisional palettes.
// kind: 0 plain, 1 stone, 2 brick, 3 concrete, 4 glass, 5 Gherkin,
// 6 patinated panels, 7 translucent coloured panels, 8 timber lattice,
// 9 Isokon render, 10 bronze fins, 11 metal, 12 spandrels, 13 timber,
// 14 half-timber, 15 horizontal bands, 16 plain render/membrane, 17 ceramic panels.
const profile=(wall,roof,accent,kind,label)=>({wall,roof,accent,kind,label});
export const finishes={
 ...catalogFinishes,
 stpauls:profile('#d0c8b5','#697579','#b3aaa0',1,'Portland stone · lead-grey dome'),
 shard:profile('#7199ae','#88acbc','#cedbe0',4,'Blue-grey glazing · pale metal mullions'),
 gherkin:profile('#648a96','#648a96','#203d4a',5,'Blue-green glass · dark spiral bands'),
 towerbridge:profile('#c8bda4','#667b8b','#5d9ebc',1,'Pale stone · slate roofs · blue steelwork'),
 tate:profile('#80715b','#586565','#b5cbd0',2,'Brown brick · dark roofs · glazing'),
 millennium:profile('#aabac0','#b9c8cd','#8a9fa8',11,'Silver-grey steel'),
 barbican:profile('#aaa38e','#777b73','#556567',3,'Textured concrete · dark glazing'),
 lloyds:profile('#a4b0b4','#9ca9ad','#476778',11,'Stainless steel · blue-grey glazing'),
 westminster:profile('#bd9e6a','#646d71','#ddc38b',1,'Warm limestone · dark roofs'),
 abbey:profile('#c9c6b5','#737d82','#a5a18e',1,'Pale stone · grey roofs'),
 museum:profile('#cfc8b4','#799b9d','#dce4e1',1,'Pale stone · glazed court'),
 tower:profile('#bfbba6','#56636b','#e4ded0',1,'Pale masonry · dark tower roofs'),
 isokon:profile('#e0d4bf','#94928b','#43535a',9,'Warm ivory render · dark window frames'),
 battersea:profile('#896043','#686e6a','#e8e1cd',2,'Brown-red brick · ivory chimneys'),
 peckham:profile('#77a795','#648a7d','#c4cd58',6,'Patinated copper · coloured glazing'),
 laban:profile('#b6caab','#929f96','#c985a9',7,'Translucent green, yellow and pink panels'),
 canadasquare:profile('#96a9b0','#b6c2c4','#ced5d5',4,'Metal-and-glass facade · silver pyramid'),
 crossrail:profile('#719494','#dce7e4','#b08b53',8,'Pale roof membrane · timber lattice'),
 navalcollege:profile('#d6cdb5','#7a8985','#b6b29f',1,'Pale stone · grey domes'),
 queenshouse:profile('#e5decd','#858b86','#5d706f',1,'White render and stone · dark roof'),
 observatory:profile('#a07153','#737e7d','#ddd2ba',2,'Red-brown brick · pale stone dressings'),
 nationaltheatre:profile('#ada68f','#969888','#4e6467',3,'Board-marked concrete · dark glazing'),
 festivalhall:profile('#cec9b8','#a3afa8','#6b919a',3,'Pale stone and concrete · glazing'),
 hayward:profile('#9b9887','#abc6c6','#536e73',3,'Exposed concrete · glazed rooflights'),
 britishlibrary:profile('#a56a53','#668886','#d4c4a6',2,'Red brick · green-grey metal roofs'),
 coaldrops:profile('#8e745e','#575e64','#9aafb4',2,'Weathered brick · dark slate roofs'),
 aquatics:profile('#74a5ad','#8a969a','#bca581',4,'Blue glazing · silver-grey roof'),
 stpancras:profile('#a4644e','#5e6974','#d3ba8b',2,'Red brick · slate · pale stone dressings'),
 kingscross:profile('#b09a6c','#82989b','#d7d7c6',2,'London stock brick · glazed train sheds'),
 senatehouse:profile('#d3cbb7','#aaa999','#596a6b',1,'Portland stone · dark windows'),
 somerset:profile('#cdc2a9','#69787c','#a6b2ac',1,'Pale stone · grey metal roofs'),
 nationalgallery:profile('#d8d0bc','#8b9b91','#adbbb3',1,'Pale stone · grey-green roof details'),
 bloomberg:profile('#a19073','#777e75','#735f45',10,'Warm stone · bronze fins · dark glazing')
};

// Newly modelled structural members have their own surface, rather than inheriting
// a glass shader or the membrane colour from the containing landmark.
finishes['catalog-237'].secondary=['#c8a64c','#d4b65d','#a48733',16];
finishes['catalog-106'].secondary=['#4c5150','#626966','#323936',11];
finishes['catalog-099'].secondary=['#c9c6b7','#d6d2c5','#b0ac9e',16];
finishes['catalog-246'].secondary=['#252b2c','#303738','#181d1e',11];
finishes['catalog-279'].secondary=['#a8b0ad','#c2c7c1','#74807e',11];
finishes['catalog-300'].secondary=['#dedfd3','#eeeede','#bbbdb3',16];
finishes['catalog-145'].secondary=['#343b3a','#4b5350','#202725',11];
finishes.towerbridge.secondary=['#5d9ebc','#79b6cc','#3c708b',11];
for(const id of ['catalog-290','catalog-291'])finishes[id].secondary=['#e0dfd4','#e9e8dc','#c4c6b9',11];

// Extra surface attributes only: never alter source vertices, bounds or Rhino meshes.
export function addFinishAttribute(g,r,partIndex=0,partCount=1){
 const p=g.attributes.position,n=g.attributes.normal,values=new Float32Array(p.count);
 const study=finishes[r.lm], secondary=study?.secondaryParts?.some(part=>part===r.id||part==='form:'+r.form)
  ||(r.lm==='catalog-237'&&r.id.startsWith('detail/o2/mast-'))
  ||(r.lm==='catalog-106'&&r.architecturalPart==='guide-frame')
  ||(r.lm==='catalog-099'&&r.id.includes('precast-cruciform-grid'))
  ||(r.lm==='catalog-246'&&r.id.startsWith('detail/catalog-246/black-'))
  ||(r.lm==='catalog-279'&&/^detail\/catalog-279\/(beam|column)-/.test(r.id))
  ||(r.lm==='catalog-300'&&r.id.startsWith('detail/catalog-300/etfe-sails-'))
  ||(r.lm==='catalog-145'&&r.id==='detail/catalog-145/cage')
  ||(r.lm==='towerbridge'&&r.id.includes('suspension-chain-'))
  ||(['catalog-290','catalog-291'].includes(r.lm)&&r.id.includes('-ribs-'));
 for(let i=0;i<p.count;i+=3){
  const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;
  const ny=(n.getY(i)+n.getY(i+1)+n.getY(i+2))/3;
  let finish=ny>.55?1:0;
  if(r.roof&&partCount>1&&partIndex===partCount-1)finish=1;
  // Existing site groups include a few adjacent buildings. Do not colour those
  // with Tower Bridge's finishes merely because they share its selection group.
  if(r.lm==='towerbridge'&& !/^way\/(36765|367657|934056)/.test(r.id)&&!r.id.startsWith('refine-a/towerbridge/'))finish=4;
  if(r.lm==='towerbridge'&&r.z>=36&&r.h<=45)finish=2;
  if(r.lm==='battersea'&&r.form==='tapered_chimney')finish=5;
  if(r.lm==='hayward'&&r.name==='Pyramid rooflight')finish=3;
  if(r.lm==='museum'&&r.name==='Great Court')finish=3;
  if(r.lm==='tate'&&r.id==='way/123075376')finish=3;
  if(r.lm==='isokon'){
   finish=0;
   if(ny>.55&&/roof|terrace-slab|gallery-slab|rear-balcony/.test(r.name))finish=1;
   if(r.name==='main-wing'&&ny<.55)finish=6;
  }
  if(r.lm==='stpancras'){
   if(r.id==='way/4256246')finish=ny>.2||y>18?3:0;
   else if(r.id==='way/15694166'&&y>=26&&ny>.1)finish=1;
  }
  if(['britishlibrary','coaldrops','somerset'].includes(r.lm)&&r.mesh&&ny>.1)finish=1;
  if(r.lm==='aquatics'&&r.mesh)finish=ny>.1?1:0;
  if(r.lm==='kingscross'&&r.mesh&&ny>.1)finish=3;
  if(r.lm==='crossrail'&&r.mesh)finish=ny>.1?1:0;
  if(r.lm==='stpauls'&&r.roof?.shape==='dome'&&partIndex===partCount-1)finish=1;
  if((r.lm==='catalog-060'&&r.id.includes('curved-glazed-atrium'))||(r.lm==='catalog-099'&&r.id.includes('recessed-glazed-lobby')))finish=3;
  // A second palette is restricted to a named, reviewed source part.
  if(secondary)finish=ny>.55?8:7;
  values.fill(finish,i,i+3);
 }
 g.setAttribute('atlasFinish',new T.BufferAttribute(values,1));
 return g;
}

const declarations=`
 uniform vec3 atlasWall, atlasRoof, atlasAccent, atlasOrigin;
 uniform vec3 atlasSecondaryWall, atlasSecondaryRoof, atlasSecondaryAccent;
 uniform float atlasSecondaryKind;
 uniform float atlasKind, atlasReveal;
 uniform vec2 atlasHeightRange;
 varying vec3 vAtlasPosition, vAtlasNormal;
 varying float vAtlasFinish;
 float atlasLine(float x, float width){
  float d=abs(fract(x+.5)-.5), aa=max(fwidth(x),.001);
  return (1.-smoothstep(width,width+aa,d))*(1.-smoothstep(.25,.8,aa));
 }
 float atlasHash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
`;

const surface=`
 vec3 an=normalize(vAtlasNormal), ap=vAtlasPosition;
 float side=1.-smoothstep(.35,.65,abs(an.y));
 float u=abs(an.x)>abs(an.z)?ap.z:ap.x;
 vec2 uv=vec2(u,ap.y);
 float secondary=step(6.5,vAtlasFinish);
 float finishSlot=mix(vAtlasFinish,vAtlasFinish-7.,secondary);
 vec3 wallColour=mix(atlasWall,atlasSecondaryWall,secondary);
 vec3 roofColour=mix(atlasRoof,atlasSecondaryRoof,secondary);
 vec3 accentColour=mix(atlasAccent,atlasSecondaryAccent,secondary);
 float finishKind=mix(atlasKind,atlasSecondaryKind,secondary);
 vec3 finishColour=wallColour;
 float roof=step(.5,finishSlot)*(1.-step(1.5,finishSlot));
 float accent=step(1.5,finishSlot)*(1.-step(2.5,finishSlot));
 float glazing=step(2.5,finishSlot)*(1.-step(3.5,finishSlot));
 float skip=step(3.5,finishSlot)*(1.-step(4.5,finishSlot));
 float chimney=step(4.5,finishSlot)*(1.-step(5.5,finishSlot));
 finishColour=mix(finishColour,roofColour,roof);
 finishColour=mix(finishColour,accentColour,accent);
 finishColour=mix(finishColour,vec3(.25,.40,.44),glazing);
 finishColour=mix(finishColour,accentColour,chimney);
 float wall=1.-step(.5,finishSlot);
 float glassAmount=glazing;
 if(finishKind==1. && wall>.5){
  float joints=max(atlasLine(uv.y/.7,.014),atlasLine(uv.x/1.4+mod(floor(uv.y/.7),2.)*.5,.008));
  finishColour*=1.-.13*joints*side;
 }
 if(finishKind==2. && wall>.5){
  vec2 brick=vec2(uv.x/.24+mod(floor(uv.y/.09),2.)*.5,uv.y/.09);
  float mortar=max(atlasLine(brick.x,.025),atlasLine(brick.y,.045));
  float nearDetail=1.-smoothstep(.3,1.,max(fwidth(brick.x),fwidth(brick.y)));
  finishColour*=1.+(atlasHash(floor(brick))-.5)*.17*nearDetail;
  finishColour=mix(finishColour,finishColour*1.35,mortar*.45*side);
 }
 if(finishKind==3. && wall>.5){
  float boards=atlasLine(uv.y/.25,.015);
  finishColour*=1.-.12*boards*side;
 }
 if(finishKind==4. && wall>.5){
  float grid=max(atlasLine(uv.x/1.5,.025),atlasLine(uv.y/3.6,.025));
  finishColour*=.83+.17*sin(uv.x*.13+ap.y*.035);
  finishColour=mix(finishColour,accentColour,grid*.72*side);
  glassAmount=side;
 }
 if(finishKind==5.){
  float angle=atan(ap.z,ap.x)/6.2831853;
  float spiral=angle*6.+ap.y/58.;
  float band=smoothstep(.45,.51,fract(spiral))*(1.-smoothstep(.76,.82,fract(spiral)));
  finishColour=mix(wallColour,accentColour,band*.9);
  float lattice=max(atlasLine(angle*24.+ap.y/7.7,.027),atlasLine(angle*24.-ap.y/7.7,.027));
  finishColour=mix(finishColour,vec3(.62,.72,.74),lattice*.83);
  finishColour*=.87+.13*cos(angle*6.2831853);
  glassAmount=1.;
 }
 if(finishKind==6. && wall>.5){
  finishColour*=1.-.15*max(atlasLine(uv.x/1.3,.02),atlasLine(uv.y/2.5,.02))*side;
  if(an.z<-.55){
   vec2 panel=floor(uv/vec2(1.3,2.5));
   float k=atlasHash(panel);
   finishColour=mix(wallColour,accentColour,step(.68,k));
   finishColour=mix(finishColour,vec3(.35,.14,.26),step(.88,k));
   glassAmount=.7;
  }
 }
 if(finishKind==7. && wall>.5){
  float colourBand=.5+.5*sin(ap.x*.032+ap.z*.023);
  finishColour=mix(wallColour,accentColour,smoothstep(.35,.85,colourBand)*.75);
  finishColour=mix(finishColour,vec3(.63,.68,.27),(1.-smoothstep(.05,.4,colourBand))*.5);
  finishColour*=1.-.13*atlasLine(uv.x/.4,.02)*side;
  glassAmount=.3;
 }
 if(finishKind==8. && roof>.5){
  float lattice=max(atlasLine((ap.x+ap.z)/6.,.022),atlasLine((ap.x-ap.z)/6.,.022));
  finishColour=mix(roofColour,accentColour,lattice);
 }
 if(finishKind==9.){
  // Recessed main wing already sits behind the gallery piers and parapets.
  if(vAtlasFinish>5.5){
   vec2 q=vec2(-ap.x*.375-ap.z*.927,ap.y);
   float longFacade=1.-smoothstep(.35,.65,abs(-an.x*.375-an.z*.927));
   float pane=smoothstep(.88,.94,mod(q.y,2.8))*(1.-smoothstep(2.27,2.35,mod(q.y,2.8)))*longFacade;
   finishColour=mix(wallColour,accentColour,pane*.8*side);
   finishColour=mix(finishColour,wallColour,atlasLine(q.x/1.05,.024)*side);
   glassAmount=pane*.5;
  }
 }
 if(finishKind==10. && wall>.5){
  float fins=atlasLine(uv.x/2.6,.17), floors=atlasLine(uv.y/4.2,.09);
  finishColour=mix(vec3(.075,.105,.105),accentColour,fins);
  finishColour=mix(finishColour,wallColour,floors);
  glassAmount=(1.-fins)*(1.-floors);
 }
 if(finishKind==11. && wall>.5){
  float ribs=atlasLine(uv.x/1.4,.07);
  finishColour*=1.-.18*ribs*side;
 }
 if(finishKind==12. && wall>.5){
  // Representative spandrels and glazing, not surveyed window positions.
  float pane=step(.38,fract(uv.y/2.8));
  float frame=max(atlasLine(uv.x/1.4,.025),atlasLine(uv.y/2.8,.025));
  finishColour=mix(wallColour,vec3(.18,.24,.25),pane*.82);
  finishColour=mix(finishColour,accentColour,frame*side);
  glassAmount=pane*side;
 }
 if(finishKind==13. && wall>.5){
  float grain=atlasLine(uv.x/.14,.025);
  finishColour*=1.-.15*grain*side;
 }
 if(finishKind==14. && wall>.5){
  float beams=max(atlasLine(uv.x/1.5,.065),atlasLine(uv.y/2.8,.045));
  finishColour=mix(wallColour,accentColour,beams*side);
 }
 if(finishKind==15. && wall>.5){
  float bands=1.-smoothstep(.21,.24,fract(uv.y/1.6));
  finishColour=mix(wallColour,accentColour,bands*side);
 }
 if(finishKind==17. && wall>.5){
  float joints=max(atlasLine(uv.x/.6,.009),atlasLine(uv.y/.3,.012));
  finishColour*=1.-.1*joints*side;
 }
 if(glazing>.5){
  vec2 guv=abs(an.y)>.55?ap.xz:uv;
  float grid=max(atlasLine(guv.x/2.,.025),atlasLine(guv.y/3.,.025));
  finishColour=mix(finishColour,vec3(.65,.72,.72),grid*.8);
 }
 if(chimney>.5)finishColour*=1.-.09*atlasLine(uv.x/.7,.025)*side;
 finishColour=mix(finishColour,diffuseColor.rgb,skip);
 // A soft front travels from the lowest vertex to the highest, including
 // raised buildings and bridges. Exact endpoints contain no residual glow.
 float normalizedHeight=clamp((ap.y-atlasHeightRange.x)/max(.01,atlasHeightRange.y-atlasHeightRange.x),0.,1.);
 float revealFront=mix(-.08,1.08,atlasReveal);
 float revealMask=1.-smoothstep(revealFront-.07,revealFront+.07,normalizedHeight);
 float revealRim=(1.-smoothstep(.008,.035,abs(normalizedHeight-revealFront)))
  *step(.001,atlasReveal)*(1.-step(.999,atlasReveal))*(1.-skip);
 diffuseColor.rgb=mix(diffuseColor.rgb,finishColour,revealMask);
`;

export function createFinishMaterial(id,origin,heightRange=[0,1]){
 const p=finishes[id];
 const secondary=p.secondary||[p.wall,p.roof,p.accent,p.kind];
 const reveal={value:0};
 const mat=new T.MeshStandardMaterial({color:0xf2f0e9,roughness:.9,metalness:0,side:T.DoubleSide});
 mat.name='Visited · '+id;
 mat.userData.reveal=reveal;
 mat.customProgramCacheKey=()=> 'atlas-exterior-v3-catalogue';
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{
   atlasWall:{value:new T.Color(p.wall)},atlasRoof:{value:new T.Color(p.roof)},atlasAccent:{value:new T.Color(p.accent)},
   atlasSecondaryWall:{value:new T.Color(secondary[0])},atlasSecondaryRoof:{value:new T.Color(secondary[1])},atlasSecondaryAccent:{value:new T.Color(secondary[2])},atlasSecondaryKind:{value:secondary[3]},
   atlasKind:{value:p.kind},atlasReveal:reveal,atlasOrigin:{value:new T.Vector3(origin[0],0,-origin[1])},
   atlasHeightRange:{value:new T.Vector2(...heightRange)}
  });
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute float atlasFinish; uniform vec3 atlasOrigin;
   varying vec3 vAtlasPosition, vAtlasNormal; varying float vAtlasFinish;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   vAtlasPosition=position-atlasOrigin; vAtlasNormal=normal; vAtlasFinish=atlasFinish;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+declarations)
   .replace('#include <color_fragment>','#include <color_fragment>\n'+surface)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(roughnessFactor,mix(.88,.28,glassAmount),revealMask*(1.-skip));`)
   .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
    metalnessFactor=mix(metalnessFactor,finishKind==11.?.32:.12*glassAmount,revealMask*(1.-skip));`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    totalEmissiveRadiance+=vec3(.14,.35,.28)*revealRim;`);
 };
 return mat;
}
