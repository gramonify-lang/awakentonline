import test from 'node:test';import assert from 'node:assert/strict';
import game from '../api/game.js';import signal from '../api/signal.js';
async function call(handler,body){let out;const res={code:200,setHeader(){},status(n){this.code=n;return this},json(j){out={code:this.code,...j};}};await handler({method:'POST',body,headers:{'x-forwarded-for':'signal-test-'+Math.random()}},res);return out;}
test('authenticated signaling delivers offers only to their intended room member',async()=>{
 const h=await call(game,{action:'create',role:'human'}),code=h.state.code;
 const g=await call(game,{action:'join',code,role:'ghost'});
 const auth=p=>({code,id:p.id,token:p.token});
 const message={to:g.id,link:'a'.repeat(24),type:'offer',data:{type:'offer',sdp:'v=0\r\n'}};
 assert.equal((await call(signal,{...auth(h),messages:[message]})).code,200);
 assert.equal((await call(signal,{...auth(h)})).messages.length,0);
 const got=await call(signal,{...auth(g)});assert.equal(got.messages.length,1);assert.equal(got.messages[0].from,h.id);assert.equal(got.messages[0].data.sdp,'v=0\r\n');
 assert.equal((await call(signal,{...auth(g)})).messages.length,0);
 assert.ok(got.iceServers[0].urls.startsWith('stun:'));
 assert.equal((await call(signal,{...auth(h),token:'wrong',messages:[message]})).code,400);
 assert.equal((await call(signal,{...auth(h),messages:[{...message,to:'outsider'}]})).code,400);
});
