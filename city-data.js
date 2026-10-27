// Exact source coordinates in a separate compressed payload keep the map index
// small. No simplification or quantisation is applied to landmark studies.
export function hydrateLandmarkMeshes(city,payload){
 if(!payload||payload.version!==1||!Array.isArray(payload.meshes))throw Error('Invalid landmark mesh data');
 for(const r of city.buildings){
  if(r.meshRef===undefined)continue;
  const item=payload.meshes[r.meshRef];
  if(!item||item.id!==r.id||item.lm!==r.lm||!Array.isArray(item.vertices)||item.vertices.length%9)throw Error('Landmark mesh does not match map index');
  r.mesh=item.vertices;delete r.meshRef;
 }
 return city;
}
export async function loadLandmarkMeshes(city){
 if(!city.landmarkMeshes)return city;
 const response=await fetch(city.landmarkMeshes.url);
 if(!response.ok)throw Error('Unable to load landmark models');
 const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
 return hydrateLandmarkMeshes(city,await new Response(stream).json());
}
