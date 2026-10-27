import {createAtlas,prepareRhino} from './mass-scene.js';
import {loadLandmarkMeshes} from './city-data.js';
import {savedModels,saveModel,deleteModel} from './storage.js';
import {createVisitStore,VISITS_KEY} from './visits.js';
import {finishes} from './landmark-finishes.js';
import {mapStyles,readMapStyle,saveMapStyle} from './map-styles.js';
import {walkRoutes} from './walk-routes.js';
import {visitTrees} from './visit-landscape.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let atlas,city,visits,selected=null,pending=null,buffer=null;
let showPeople=true,showLandscape=true;
const status=s=>$('#import-status').textContent=s;
function photoMarkup(b){
 const p=b.photo;if(!p)return '<p class="photo-pending">Reference photograph not yet available.</p>';
 return `<figure class="building-photo"><a class="photo-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(b.name)} photo source"><img src="${esc(p.url)}" alt="${esc(p.alt||b.name+' exterior')}" width="${p.width||800}" height="${p.height||600}" decoding="async"><span class="photo-unavailable" hidden>Photo unavailable. View the original image.</span></a><figcaption>Photo: ${esc(p.author)} · <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a><span class="photo-edit-note">Resized and compressed for the web</span></figcaption></figure>`;
}
function select(id,focus=true){const b=city.landmarks.find(b=>b.id===id);if(!b)return;selected=id;atlas?.select(id,focus);const m=atlas?.measurements(id);document.body.classList.remove('detail-closed');document.querySelectorAll('[data-id]').forEach(el=>{el.classList.toggle('active',el.dataset.id===id);el.setAttribute('aria-pressed',String(el.dataset.id===id))});$('#detail').innerHTML=`<div class="detail-top"><span class="tag">${b.type}</span><button class="close-detail" aria-label="Close building card">×</button></div><h2>${b.name}</h2><p class="building-subtitle">${b.subtitle}</p><div id="visit-panel"></div>${photoMarkup(b)}${b.architect||b.year?`<div class="facts">${b.architect?`<div><span>ARCHITECT</span><strong>${esc(b.architect)}</strong></div>`:''}${b.year?`<div><span>${b.id.startsWith('catalog-')?'RECORDED DATE':'COMPLETION'}</span><strong>${esc(b.year)}</strong></div>`:''}</div>`:''}<div class="dimensions"><span>${m?'Model dimensions · m':'Model status'} ${m?.custom?' / MY MODEL':''}</span><strong>${m?[m.east,m.north,m.height].map(n=>n.toFixed(1)).join(' × '):'Location marker'}</strong><small>${m?'East–west × north–south × height · '+b.massCount+' model parts':'3D model not available yet'}</small></div><p class="model-note">${esc(b.modelNote||'Massing based on OSM footprints. Unrecorded heights are estimated.')}</p><p class="point">${b.point}</p><div class="detail-links">${b.massCount?`<a href="./assets/rhino/${id}-rhino6.3dm" download>Rhino 6/7 model ↓</a>`:''}<a href="https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}&travelmode=walking" target="_blank" rel="noopener noreferrer">Directions ↗</a></div><div class="source-links"><a href="${b.source}" target="_blank" rel="noopener noreferrer">Architecture ↗</a> · <a href="${b.modelSourceUrl||'https://www.openstreetmap.org'}" target="_blank" rel="noopener noreferrer">Geometry source ↗</a></div>`;$('#detail').scrollTop=0;const photo=$('#detail .building-photo img');if(photo)photo.onerror=()=>{photo.hidden=true;$('#detail .photo-unavailable').hidden=false};$('.close-detail').onclick=()=>document.body.classList.add('detail-closed');renderVisitPanel()}
function renderVisitPanel(){
 if(!selected||!visits)return;
 const b=city.landmarks.find(b=>b.id===selected),done=visits.has(selected),p=finishes[selected];
 const custom=atlas?.measurements(selected)?.custom;
 const studyNote=p?.study==='photo'?'Approximate palette from the reference photo; roof colours and surface patterns are inferred.':p?.study==='limited-photo'?'Provisional palette from a limited reference view; some exterior colours are inferred.':p?.study==='provisional'?'Provisional material palette; exterior colours still need photographic verification.':'';
 const storageNote=visits.persistent?'Saved in this browser only.':'Browser storage unavailable. Changes last for this session only.';
 $('#visit-panel').innerHTML=`<button class="visit-toggle" type="button" aria-pressed="${done}" aria-describedby="visit-caption"><span class="visit-icon" aria-hidden="true">${done?'✓':'+'}</span><span>${done?'Visited':'Mark as visited'}</span><span class="visit-undo">${done?'Undo':''}</span></button><p id="visit-caption" class="visit-caption">${p?(done?esc(p.label):'Reveal this building’s exterior finishes.'):(done?'Added to your field record.':'Record your visit to this building.')} ${p?esc(studyNote):'This stop has no dedicated 3D model yet; your visit is still recorded.'}</p><p class="visit-storage ${visits.persistent?'':'unsaved'}">${storageNote}${custom?' Your Rhino model keeps its current appearance; restore the original to see these finishes.':''}</p>`;
 if(done&&walkRoutes[selected]&&!custom){
  const routes=walkRoutes[selected],roof=routes.some(r=>r.support),hasTrees=visitTrees[selected]?.length>0;
  $('#visit-panel').insertAdjacentHTML('beforeend',`<div class="people-controls"><label><input id="show-people" type="checkbox" ${showPeople?'checked':''}> People</label><button id="people-focus" type="button">Look closer ↗</button></div>${hasTrees?`<div class="people-controls landscape-controls"><label><input id="show-landscape" type="checkbox" ${showLandscape?'checked':''}> Trees & planting</label></div>`:''}<p class="people-note">Up to ${routes.reduce((n,r)=>n+r.people,0)} people close to the building${roof?' and on flat model surfaces':''}. ${hasTrees?'Illustrative activity and planting.':'No planting added: limited clear ground.'} Zoom in to see more; the selected building takes priority.</p>`);
  if(hasTrees)$('#show-landscape').onchange=e=>{showLandscape=e.target.checked;atlas?.setLandscape(showLandscape);};
  $('#show-people').onchange=e=>{showPeople=e.target.checked;atlas?.setPeople(showPeople);};
  $('#people-focus').onclick=()=>{if(!showPeople){showPeople=true;atlas?.setPeople(true);$('#show-people').checked=true;}atlas?.focusPeople(selected);if(matchMedia('(max-width:700px)').matches)document.body.classList.add('detail-closed');};
 }
 $('#visit-panel .visit-toggle').onclick=()=>{
  const state=visits.toggle(selected);
  for(const building of city.landmarks)atlas?.setVisited(building.id,visits.has(building.id),building.id===selected);
  renderVisitPanel();updateVisitIndicators();if(state.visited)$('#visit-panel button').classList.add('visit-reveal');$('#visit-panel button').focus({preventScroll:true});
  $('#visit-announcement').textContent=b.name+(state.visited?' marked as visited.'+(p&&!custom?' Exterior finishes revealed.':''):' removed from visited.')+(state.saved?' Saved in this browser.':' Not saved: browser storage is unavailable.');
 };
}
function updateVisitIndicators(){
 $('#visit-count').textContent=`${visits.count()} of ${city.landmarks.length} visited`;
 $('#visit-progress').value=visits.count();$('#visit-progress').max=city.landmarks.length;
 for(const el of document.querySelectorAll('.building-item')){
  const done=visits.has(el.dataset.id),b=city.landmarks.find(b=>b.id===el.dataset.id);
  el.classList.toggle('visited',done);el.querySelector('.visit-list-check').hidden=!done;
  el.setAttribute('aria-label',b.name+(done?' · visited':''));
 }
}
window.addEventListener('storage',e=>{
 if(!visits||(e.key!==VISITS_KEY&&e.key!==null))return;
 visits.reload();for(const b of city.landmarks)atlas?.setVisited(b.id,visits.has(b.id),false);
 updateVisitIndicators();renderVisitPanel();
});
$('#city-download').onclick=()=>$('#download-dialog').showModal();$('#close-download').onclick=()=>$('#download-dialog').close();
$('#about').onclick=()=>$('#about-dialog').showModal();$('#close-about').onclick=()=>$('#about-dialog').close();
$('#import-open').onclick=()=>{$('#import-target').value=selected||'city';$('#rhino-dialog').showModal()};$('#close-import').onclick=()=>$('#rhino-dialog').close();
function clearPending(){pending?.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});pending=null;buffer=null;$('#apply-import').disabled=true}
async function analyze(){clearPending();const file=$('#rhino-file').files[0];if(!file)return;if(file.size>100*1024*1024){status('Choose a .3dm file no larger than 100 MB.');return}status('Reading your model…');$('#rhino-file').disabled=true;try{buffer=await file.arrayBuffer();pending=await prepareRhino(buffer.slice(0),$('#import-unit').value);status(`${file.name}\n${pending.objects.toLocaleString('en-GB')} meshes · ${pending.triangles.toLocaleString('en-GB')} triangles\n${Object.values(pending.size).map(n=>n.toFixed(2)).join(' × ')} m (East–west × north–south × height)${pending.warnings?'\nSome objects could not be read. Convert them to meshes in Rhino and save again.':''}`);$('#apply-import').disabled=false}catch(e){status('Import failed: '+e.message)}finally{$('#rhino-file').disabled=false}}
$('#rhino-file').onchange=analyze;$('#import-unit').onchange=analyze;
$('#apply-import').onclick=async()=>{if(!pending)return;const key=$('#import-target').value;if(key!=='city'){const center=pending.bounds.getCenter(pending.root.position.clone());if(Math.hypot(center.x,center.z)>2000){status('This model is far from the building origin. For a city file, select Entire city. Individual models must keep their supplied local origin.');return}}const item={key,buffer,name:$('#rhino-file').files[0].name,unit:$('#import-unit').value};atlas.applyImport(pending,key);pending=null;$('#apply-import').disabled=true;try{await saveModel(item);status('Applied and saved in this browser.')}catch{status('Applied for this session. Browser storage is full, so this model will not survive a reload.')}if(selected)select(selected,false)};
$('#restore-model').onclick=async()=>{const key=$('#import-target').value;atlas.restore(key);try{await deleteModel(key);status('Original model restored.')}catch{status('Original model restored on screen, but its saved browser copy could not be removed.')}if(selected)select(selected,false)};
try{
const response=await fetch('./assets/city.json');if(!response.ok)throw Error('Unable to load city data');city=await response.json();visits=createVisitStore(city.landmarks.map(b=>b.id),()=>window.localStorage);$('#count').textContent=city.landmarks.length;
$('#mass-count').textContent=city.stats.masses.toLocaleString('en-GB')+' model parts in 3D.';
$('#height-stats').textContent=`${city.stats.masses.toLocaleString('en-GB')} model parts: ${city.stats.heights.height.toLocaleString('en-GB')} with recorded OSM heights, ${city.stats.heights.levels.toLocaleString('en-GB')} estimated from storeys, and ${city.stats.heights.assumed.toLocaleString('en-GB')} with assumed or reference-informed heights.`;
for(const file of city.rhinoDownloads||[]){const link=document.createElement('a');link.href=file.url;link.download='';link.className='region-download';link.textContent=`${file.name} · ${file.masses.toLocaleString('en-GB')} model parts · ${(file.bytes/1048576).toFixed(1)} MB ↓`;$('#region-downloads').append(link)}

for(const [i,b]of city.landmarks.entries()){const el=document.createElement('button');el.className='building-item';el.dataset.id=b.id;el.innerHTML=`<span class="num">${String(i+1).padStart(2,'0')}</span><span><strong>${b.name}</strong><small>${b.subtitle}</small></span><span class="visit-list-check" aria-hidden="true" hidden>✓</span><span class="arrow">↗</span>`;el.onclick=()=>select(b.id);$('#buildings').append(el);const option=document.createElement('option');option.value=b.id;option.textContent=b.name;$('#import-target').append(option)}
const search=$('#building-search');
function filterBuildings(){const q=search.value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'');let count=0;
 for(const el of document.querySelectorAll('.building-item')){const b=city.landmarks.find(b=>b.id===el.dataset.id);const text=[b.name,b.subtitle,...(b.aliases||[])].join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'');el.hidden=!text.includes(q);if(!el.hidden)count++}
 $('#search-result').textContent=q?`${count} of ${city.landmarks.length} buildings`:'';$('#search-empty').hidden=count!==0;
}
search.addEventListener('input',filterBuildings);
search.addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('.building-item:not([hidden])')?.click()});
updateVisitIndicators();await loadLandmarkMeshes(city);atlas=await createAtlas(city,id=>select(id,false));
const stylePicker=$('#map-style');stylePicker.value=readMapStyle(()=>window.localStorage);atlas.setStyle(stylePicker.value,false);stylePicker.disabled=false;
stylePicker.onchange=()=>{const id=stylePicker.value;if(!Object.hasOwn(mapStyles,id))return;atlas.setStyle(id);const saved=saveMapStyle(id,()=>window.localStorage);$('#visit-announcement').textContent=`${stylePicker.selectedOptions[0].textContent} map style.`+(saved?'':' This choice could not be saved in this browser.');};
const labelKey='london-field-atlas.labels.v1';
try{const saved=JSON.parse(localStorage.getItem(labelKey));for(const key of ['names','numbers'])if(typeof saved?.[key]==='boolean')$('#show-'+key).checked=saved[key]}catch{}
function updateLabels(save=false){const options={names:$('#show-names').checked,numbers:$('#show-numbers').checked};atlas.setLabels(options);if(save)try{localStorage.setItem(labelKey,JSON.stringify(options))}catch{}}
for(const key of ['names','numbers'])$('#show-'+key).onchange=()=>updateLabels(true);
updateLabels();
$('#label-controls').addEventListener('keydown',e=>{if(e.key==='Escape'){$('#label-controls').open=false;$('#label-controls summary').focus()}});
document.addEventListener('pointerdown',e=>{if(!$('#label-controls').contains(e.target))$('#label-controls').open=false});
for(const id of visits.ids())atlas.setVisited(id,true,false);$('#zoom-in').onclick=()=>atlas.zoom(1.25);$('#zoom-out').onclick=()=>atlas.zoom(.8);$('#reset').onclick=()=>{atlas.reset();document.body.classList.add('detail-closed')};$('#show-context').onchange=e=>atlas.setContext(e.target.checked);$('#show-confidence').onchange=e=>{atlas.setConfidence(e.target.checked);$('#confidence-legend').hidden=!e.target.checked};
$('#import-open').disabled=false;try{const models=await savedModels();models.sort((a,b)=>(b.key==='city')-(a.key==='city'));for(const item of models){try{atlas.applyImport(await prepareRhino(item.buffer.slice(0),item.unit),item.key)}catch(e){status(`${item.name} could not be restored: ${e.message}`)}}}catch(e){status('Browser storage is unavailable. Imported models will last for this session only.')}
$('#loading').hidden=true;document.body.classList.add('detail-closed');
}catch(e){console.error(e);$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent='Unable to load the 3D map: '+e.message}
