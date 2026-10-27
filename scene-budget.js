// Fixed GPU instance budgets even when the entire catalogue is visited.
export const PEOPLE_BUDGET=360;
export const TREE_BUDGET=500;
export function viewKey(camera,pixelsPerMetre,hidden,selected){
 return camera.matrixWorldInverse.elements.join(',')+'|'+camera.projectionMatrix.elements.join(',')+'|'+pixelsPerMetre+'|'+hidden+'|'+selected;
}
export function prioritise(items,camera,selected){
 return items.map(item=>{const p=item.centre.clone().project(camera);return {item,score:(item.id===selected?-1000000:0)+p.x*p.x+p.y*p.y};})
  .sort((a,b)=>a.score-b.score).map(x=>x.item);
}
