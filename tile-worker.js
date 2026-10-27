import {buildTileData} from './tile-geometry.js';
self.onmessage=async({data})=>{
 try{
  const batches=await buildTileData(data.records);
  const transfer=Object.values(batches).flatMap(b=>[b.position.buffer,b.normal.buffer]);
  self.postMessage({id:data.id,batches},transfer);
 }catch(error){self.postMessage({id:data.id,error:error.message})}
};
