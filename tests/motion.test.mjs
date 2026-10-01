import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createRoom,apply,applyPose,clearPath} from '../lib/game.mjs';
import {mergeObserved,mergePoses} from '../lib/poses.mjs';
import {posePayload,sampleMotion} from '../shared/protocol.js';
function setup(){const s=createRoom('ABCDEF','h','ht','H','human',1000);apply(s,{action:'join',id:'g',token:'gt',name:'G',role:'ghost'},1000);apply(s,{action:'start',id:'h',token:'ht',seq:1},2000);return s;}
const pose=(s,n,pos)=>({id:'h',round:s.until,n,pos,yaw:0,pitch:.1,flash:true,crouch:0,walk:n*.5,amp:1,path:[{n,pos}]});
test('valid movement around a corner follows the path instead of cutting through walls',()=>{
 const s=setup();s.doors.bedroom=true;s.players.h.pos=[4.675,0,3.9];
 const end=[6,0,4.9];assert.equal(clearPath(s.players.h.pos,end,s),false);
 const q=pose(s,3,end);q.path=[{n:1,pos:[4.675,0,3.9]},{n:2,pos:[4.675,0,4.9]},{n:3,pos:end}];
 assert.equal(applyPose(s,s.players.h,q,3000),true);assert.deepEqual(s.players.h.pos,end);
});
test('a path still cannot cross a closed door or hide excessive travel',()=>{
 const s=setup();s.players.h.pos=[4.675,0,3.9];
 assert.equal(applyPose(s,s.players.h,pose(s,2,[4.675,0,4.9]),3000),false);
 s.players.h.pos=[3.3,0,3.2];const q=pose(s,9,[3.3,0,3.2]);q.path=Array.from({length:9},(_,i)=>({n:i+1,pos:[i%2?4.3:3.3,0,3.2]}));
 assert.equal(applyPose(s,s.players.h,q,2100),false);
});
test('signed direct victim poses are used for server attacks; forged and old poses are ignored',()=>{
 const s=setup(),q=pose(s,3,[3.8,0,3.2]);q.sig=createHmac('sha256','ht').update(posePayload(q)).digest('hex');
 mergeObserved(s,[q],3000);assert.deepEqual(s.players.h.pos,q.pos);assert.equal(s.players.h.motionN,3);
 const forged={...q,n:4,pos:[5,0,3]};mergeObserved(s,[forged],3200);assert.deepEqual(s.players.h.pos,q.pos);
 mergeObserved(s,[q],4000);assert.equal(s.players.h.moved,3000);
 s.players.g.pos=[3.8,0,3.2];apply(s,{action:'ability',ability:'manifest',id:'g',token:'gt',seq:1},20000);
 apply(s,{action:'ability',ability:'attack',id:'g',token:'gt',seq:2},20100);assert.equal(s.players.h.hp,1);
});
test('late heartbeats cannot restore health, move a dead player, or overwrite a new round',()=>{
 const s=setup();s.players.h.hp=0;
 mergePoses(s,{h:{round:s.until,seen:4000,moved:4000,motionN:99,pos:[5,0,3],hp:2}});
 assert.equal(s.players.h.hp,0);assert.deepEqual(s.players.h.pos,[3.3,0,3.2]);assert.equal(s.players.h.seen,4000);
 apply(s,{action:'restart',id:'h',token:'ht',seq:2},5000);
 mergePoses(s,{h:{round:s.until-1,seen:6000,moved:6000,motionN:100,pos:[5,0,3]}});
 assert.deepEqual(s.players.h.pos,[3.3,0,3.2]);assert.equal(s.players.h.motionN,0);
});
test('interpolation follows 20 Hz packets, wraps yaw, and stops extrapolation after packet loss',()=>{
 const q={pos:[0,0,0],yaw:Math.PI-.05,pitch:0,walk:0,amp:1};
 const samples=[{at:0,q},{at:50,q:{...q,pos:[.15,0,0],yaw:-Math.PI+.05,walk:.4}}];
 const middle=sampleMotion(samples,85);assert.ok(Math.abs(middle.pos[0]-.075)<1e-9);assert.ok(Math.abs(Math.abs(middle.yaw)-Math.PI)<1e-6);
 assert.ok(sampleMotion(samples,160).pos[0]>.15);
 const stopped=sampleMotion(samples,500);assert.equal(stopped.pos[0],.15);assert.equal(stopped.amp,0);
});
