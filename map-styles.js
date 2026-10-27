// Render palettes only: identical geographic data, geometry and camera in every style.
export const MAP_STYLE_KEY='london-field-atlas.map-style.v1';
export const mapStyles={
 atlas:{background:'#e9edf0',ground:'#e2e6e6',parks:'#c9d6c4',water:'#94b9c5',roads:'#f0f2f1',height:'#929fa9',levels:'#9aa6af',assumed:'#a4afb7',landmark:'#fff4da',selection:'#153bec'},
 blueprint:{background:'#092b55',ground:'#0c325d',parks:'#194675',water:'#062143',roads:'#568caf',height:'#235a91',levels:'#2a6399',assumed:'#32699b',landmark:'#b6dbed',selection:'#8ddfff'},
 night:{background:'#111923',ground:'#172330',parks:'#253b3b',water:'#132c3e',roads:'#344550',height:'#485765',levels:'#455360',assumed:'#414e5b',landmark:'#ccd2c5',selection:'#f2cc86'}
};
export const confidenceColours={height:'#9db8c8',levels:'#d8caad',assumed:'#d9abab'};
export function readMapStyle(storage){
 try{const id=storage().getItem(MAP_STYLE_KEY);return Object.hasOwn(mapStyles,id)?id:'atlas';}catch{return 'atlas';}
}
export function saveMapStyle(id,storage){
 if(!Object.hasOwn(mapStyles,id))return false;
 try{storage().setItem(MAP_STYLE_KEY,id);return true;}catch{return false;}
}
