import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/game.js';
import {readRoom,commitRoom} from '../lib/store.mjs';
async function call(body){let out;const req={method:'POST',body,headers:{'x-forwarded-for':'test-'+Math.random()}};const res={code:200,setHeader(){},status(n){this.code=n;return this},json(j){out={code:this.code,...j};return this}};await handler(req,res);return out;}
test('five clients, concurrent shared state, private sessions and restart',async()=>{const host=await call({action:'create',name:'Host',role:'human'});assert.equal(host.code,200);const code=host.state.code;const joins=await Promise.all(['ghost','human','human','human'].map((role,i)=>call({action:'join',code,role,name:'P'+i})));assert.ok(joins.every(j=>j.code===200));const sixth=await call({action:'join',code,role:'human'});assert.equal(sixth.code,400);const start=await call({action:'start',code,id:host.id,token:host.token,seq:1});assert.equal(start.state.phase,'playing');assert.equal(Object.keys(start.state.players).length,5);assert.ok(Object.values(start.state.players).every(p=>p.token===undefined));const ticks=await Promise.all([host,...joins].map(p=>call({action:'tick',code,id:p.id,token:p.token})));assert.ok(ticks.every(t=>t.code===200));const actions=await Promise.all([host,...joins].map(p=>call({action:'door',door:'bedroom',code,id:p.id,token:p.token,seq:2})));assert.equal(actions.filter(a=>a.code===200).length,4);const state=await call({action:'tick',code,id:host.id,token:host.token});assert.equal(state.state.doors.bedroom,false);const restarted=await call({action:'restart',code,id:host.id,token:host.token,seq:3});assert.equal(restarted.code,200);assert.equal(restarted.state.tasks[0].step,0);});
test('API rejects impersonation and malformed codes',async()=>{const h=await call({action:'create',role:'human'});const fake=await call({action:'tick',code:h.state.code,id:h.id,token:'wrong'});assert.equal(fake.code,400);assert.equal((await call({action:'join',code:'<script>'})).code,400);});
test('five simultaneous movement ticks do not write or increment the shared room version',async()=>{
 const h=await call({action:'create',role:'human'}),code=h.state.code;
 const others=await Promise.all(['ghost','human','human','human'].map(role=>call({action:'join',code,role})));
 const started=await call({action:'start',code,id:h.id,token:h.token,seq:1}),version=started.state.version;
 const ticks=await Promise.all([h,...others].map(p=>call({action:'tick',code,id:p.id,token:p.token,pose:{pos:started.state.players[p.id].pos,yaw:.3,pitch:.2,flash:false,n:1,round:started.state.until}})));
 assert.ok(ticks.every(t=>t.code===200&&t.state.version===version));
 const final=await call({action:'tick',code,id:h.id,token:h.token});
 assert.ok(Object.values(final.state.players).every(p=>p.motionN===1&&p.flash===false));
});
test('walking away during a revive persists cancellation across heartbeat requests',async()=>{
 const h=await call({action:'create',role:'human'}),code=h.state.code;
 await call({action:'join',code,role:'ghost'});const down=await call({action:'join',code,role:'human'});
 await call({action:'start',code,id:h.id,token:h.token,seq:1});
 let stored=await readRoom(code),s=JSON.parse(stored.raw);s.players[down.id].hp=0;s.players[down.id].pos=[...s.players[h.id].pos];
 await commitRoom(code,stored.raw,JSON.stringify(s));
 const helping=await call({action:'revive',code,id:h.id,token:h.token,seq:2,target:down.id});assert.equal(helping.state.players[h.id].reviveTarget,down.id);
 stored=await readRoom(code);s=JSON.parse(stored.raw);s.players[h.id].moved=Date.now()-2000;await commitRoom(code,stored.raw,JSON.stringify(s));
 const moved=await call({action:'tick',code,id:h.id,token:h.token,pose:{pos:[3.3,0,.5],yaw:0,pitch:0}});assert.equal(moved.code,200);assert.equal(moved.state.players[h.id].reviveTarget,null);
 const next=await call({action:'tick',code,id:h.id,token:h.token});assert.equal(next.state.players[h.id].reviveAt,0);assert.equal(next.state.players[down.id].hp,0);
});
