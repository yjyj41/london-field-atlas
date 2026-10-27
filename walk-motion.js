// Metre-based movement along a bounded polyline; no position is extrapolated.
export function prepareWalk(points){
 const lengths=[0];
 for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 return {points,lengths,length:lengths.at(-1),loop:Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.01};
}
export function walkPose(path,seconds,speed=1.05,offset=0){
 const travel=path.length/speed,pause=1.5,period=2*(travel+pause);
 const t=((seconds+offset)%period+period)%period;
 let distance,reverse=false,turn=0,moving=true;
 if(path.loop)distance=((seconds+offset)*speed%path.length+path.length)%path.length;
 else if(t<travel)distance=t*speed;
 else if(t<travel+pause){distance=path.length;turn=(t-travel)/pause;moving=false;}
 else if(t<2*travel+pause){distance=path.length-(t-travel-pause)*speed;reverse=true;}
 else{distance=0;reverse=true;turn=(t-2*travel-pause)/pause;moving=false;}
 let segment=1;while(segment<path.lengths.length-1&&path.lengths[segment]<distance)segment++;
 const a=path.points[segment-1],b=path.points[segment],length=path.lengths[segment]-path.lengths[segment-1];
 const u=length?Math.max(0,Math.min(1,(distance-path.lengths[segment-1])/length)):0;
 const ease=turn*turn*(3-2*turn);
 return {x:a[0]+(b[0]-a[0])*u,north:a[1]+(b[1]-a[1])*u,
  heading:Math.atan2(b[0]-a[0],-(b[1]-a[1]))+(reverse?Math.PI:0)+ease*Math.PI,
  gait:moving?Math.sin((seconds+offset)*speed*7.5)*.42:0,moving,distance};
}
