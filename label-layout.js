// Keep the number directly above the roof; names may use either adjacent side.
export const overlaps=(a,b,gap=0)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
export function placeName({anchor,size,pinWidth=0,viewport,obstacles,previous}){
 const {w,h}=size,y=anchor.y-h-9;
 const sides=pinWidth?['right','left']:['centre','right','left'];
 if(sides.includes(previous)){sides.splice(sides.indexOf(previous),1);sides.unshift(previous)}
 for(const side of sides){
  const x=side==='centre'?anchor.x-w/2:side==='right'?anchor.x-(pinWidth?pinWidth/2+6:0):anchor.x-w+(pinWidth?pinWidth/2+6:0);
  const r={x,y,w,h};
  if(x<7||y<7||x+w>viewport.w-7||y+h>viewport.h-7||obstacles.some(o=>overlaps(r,o,5)))continue;
  return {...r,side};
 }
 return null;
}
