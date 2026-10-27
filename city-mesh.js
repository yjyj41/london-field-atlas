// Packed real geometry. Positions use a tile-local uniform scale with <1cm error.
export function decodeCityMesh(buffer){
 const length=new DataView(buffer).getUint32(0,true),base=4+length;
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,length)).replace(/\0+$/,''));
 if(header.version!==1)throw Error('Unsupported city mesh');
 return header.batches.map(b=>({...b,
  position:new Uint16Array(buffer,base+b.position,b.vertices*3),
  normal:new Int8Array(buffer,base+b.normal,b.vertices*3),
  index:b.indexBytes===2?new Uint16Array(buffer,base+b.index,b.indexCount):new Uint32Array(buffer,base+b.index,b.indexCount)
 }));
}
