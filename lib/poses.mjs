import {createHmac,timingSafeEqual} from 'node:crypto';
import {posePayload,validPose} from '../shared/protocol.js';
import {applyPose} from './game.mjs';
export function mergePoses(s,records) {
  for(const [id,q]of Object.entries(records)) {
    const p=s.players[id];if(!p||!q||q.round!==s.until)continue;
    p.seen=Math.max(p.seen,q.seen);
    if(p.hp<=0||p.escaped||(q.motionN||0)<(p.motionN||0)||q.moved<p.moved)continue;
    for(const k of ['pos','yaw','pitch','flash','crouch','walk','amp','moved','motionN'])if(q[k]!==undefined)p[k]=q[k];
  }
}
export function recordPose(s,p) {
  return {round:s.until,seen:p.seen,moved:p.moved,motionN:p.motionN||0,pos:p.pos,yaw:p.yaw,pitch:p.pitch,flash:!!p.flash,crouch:p.crouch||0,walk:p.walk||0,amp:p.amp||0};
}
// Victim positions may be supplied by a ghost's direct connection, but only
// the victim can sign them. Health, energy, doors and wins stay server-owned.
export function mergeObserved(s,list,now) {
  if(!Array.isArray(list))return;
  for(const q of list.slice(0,4)) {
    const p=s.players[q?.id];
    if(!p||!validPose(q)||q.round!==s.until||!Number.isSafeInteger(q.n)||q.n<=(p.motionN||0)||typeof q.sig!=='string'||!/^[a-f0-9]{64}$/.test(q.sig))continue;
    const expected=createHmac('sha256',p.token).update(posePayload(q)).digest();
    if(!timingSafeEqual(expected,Buffer.from(q.sig,'hex')))continue;
    applyPose(s,p,q,now);
  }
}
