// Shared by the server and the embedded browser adapter.
export function posePayload(q) {
  return JSON.stringify([1,q.id,q.round,q.n,q.pos,q.yaw,q.pitch,q.flash,q.crouch,q.walk,q.amp,q.path]);
}
export function validPose(q) {
  const point=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&v[0]>-5&&v[0]<65&&v[1]>-12&&v[1]<8&&v[2]>-8&&v[2]<30;
  return !!q&&point(q.pos)&&Number.isFinite(q.yaw)&&Number.isFinite(q.pitch)&&
    (q.n===undefined||Number.isSafeInteger(q.n)&&q.n>0)&&
    (q.path===undefined||Array.isArray(q.path)&&q.path.length<=48&&q.path.every(x=>Number.isSafeInteger(x.n)&&point(x.pos)))&&
    [q.walk??0,q.amp??0,q.crouch??0].every(Number.isFinite);
}
export function lerpAngle(a,b,k) {
  return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
}
// Arrival-time interpolation: no remote clock synchronization needed. Never
// extrapolate beyond 100 ms or predict a player indefinitely after packet loss.
export function sampleMotion(samples,now,delay=60) {
  if(!samples.length)return null;
  const target=now-delay;
  for(let i=1;i<samples.length;i++) {
    const a=samples[i-1],b=samples[i];
    if(target<=b.at) {
      const k=Math.max(0,Math.min(1,(target-a.at)/Math.max(1,b.at-a.at)));
      return {...b.q,pos:a.q.pos.map((v,j)=>v+(b.q.pos[j]-v)*k),yaw:lerpAngle(a.q.yaw,b.q.yaw,k),pitch:a.q.pitch+(b.q.pitch-a.q.pitch)*k,walk:a.q.walk+(b.q.walk-a.q.walk)*k};
    }
  }
  const b=samples.at(-1),a=samples.at(-2);
  if(!a||now-b.at>200)return {...b.q,amp:0};
  const dt=Math.max(20,b.at-a.at),extra=Math.min(100,Math.max(0,target-b.at));
  const velocity=b.q.pos.map((v,j)=>(v-a.q.pos[j])/dt);
  const speed=Math.hypot(...velocity),scale=speed>.007?.007/speed:1;
  return {...b.q,pos:b.q.pos.map((v,j)=>v+velocity[j]*extra*scale)};
}
