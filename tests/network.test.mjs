import test from 'node:test';import assert from 'node:assert/strict';
import vm from 'node:vm';import {readFileSync} from 'node:fs';import {webcrypto,createHmac} from 'node:crypto';
import {posePayload} from '../shared/protocol.js';
const source=readFileSync('shared/protocol.js','utf8').replaceAll('export function ','function ')+'\n'+readFileSync('network.js','utf8')+'\nglobalThis.Network=MultiplayerNetwork;';
// The browser's transport is simulated; this tests our five independent
// browser adapters and message flow, not native ICE/STUN/NAT traversal.
function environment() {
 let clock=100,pcId=0;const pcs=new Map(),queues=new Map(),clients=new Map();
 class Channel {
  constructor(label,options){Object.assign(this,{label,...options,readyState:'connecting',bufferedAmount:0});}
  send(data){if(this.readyState!=='open')throw Error('closed');this.other?.onmessage?.({data});}
  close(){this.readyState='closed';}
 }
 class PC {
  constructor(){this.id=++pcId;this.channels=[];this.signalingState='stable';this.connectionState='new';pcs.set(this.id,this);}
  createDataChannel(label,options){const ch=new Channel(label,options);this.channels.push(ch);return ch;}
  async createOffer(){return {type:'offer',sdp:JSON.stringify({id:this.id})};}
  async createAnswer(){return {type:'answer',sdp:JSON.stringify({id:this.id})};}
  async setLocalDescription(data){this.localDescription=data;this.signalingState=data.type==='offer'?'have-local-offer':'stable';}
  async setRemoteDescription(data){this.remoteDescription=data;this.signalingState=data.type==='offer'?'have-remote-offer':'stable';
   if(data.type==='offer'){const from=pcs.get(JSON.parse(data.sdp).id);this.other=from;from.other=this;for(const ch of from.channels){const remote=new Channel(ch.label,{ordered:ch.ordered,maxRetransmits:ch.maxRetransmits});ch.other=remote;remote.other=ch;this.channels.push(remote);this.ondatachannel({channel:remote});}}
   else{this.connectionState=this.other.connectionState='connected';for(const ch of [...this.channels,...this.other.channels]){ch.readyState='open';ch.onopen?.();}}
  }
  async addIceCandidate(c){(this.ice??=[]).push(c);}
  close(){this.connectionState='closed';for(const ch of this.channels)ch.close();this.onconnectionstatechange?.();}
 }
 const players=Object.fromEntries(['a','b','c','d','e'].map(id=>[id,{id,role:id==='e'?'ghost':'human',hp:2,pos:[3.3,0,3.2]}]));
 function client(id){let refresh=0;const context={crypto:webcrypto,TextEncoder,Uint8Array,RTCPeerConnection:PC,AbortSignal,performance:{now:()=>clock},console,
  Player:{pos:{toArray:()=>[3.3,0,3.2]},yaw:.2,pitch:.3,flashOn:true,flashK:1,crouch:0,phase:.4,amp:.5},
  fetch:async(url,options)=>{assert.equal(url,'/api/signal');const b=JSON.parse(options.body);assert.equal(b.token,b.id+'t');for(const m of b.messages){let q=queues.get(m.to);if(!q){q=[];queues.set(m.to,q);}q.push({...m,from:b.id,at:Date.now()});}const messages=queues.get(b.id)||[];queues.set(b.id,[]);return {ok:true,json:async()=>({messages,iceServers:[{urls:'stun:example.test'}],turnConfigured:false})};}};
  vm.createContext(context);vm.runInContext(source,context);
  const mp={session:{code:'ABCDEF',id,token:id+'t'},state:{players},started:true,active:true,round:123,nextPoll:10000,me:()=>players[id],controlsActive:()=>true,refreshSoon:()=>refresh++};
  const net=new context.Network(mp);mp.network=net;net.resetRound(123);clients.set(id,{mp,net,context,refresh:()=>refresh});return clients.get(id);
 }
 return {client,clients,advance:n=>{clock+=n;}};
}
test('five clients form exactly ten peer pairs and exchange signed movement without the game API',async()=>{
 const e=environment();for(const id of ['a','b','c','d','e'])e.client(id);
 for(let i=0;i<8;i++)for(const {net}of e.clients.values()){net.nextSignal=0;await net.signal();}
 assert.equal([...e.clients.values()].reduce((n,{net})=>n+net.peers.size,0),20);
 for(const {net}of e.clients.values())assert.equal(net.connected(),4);
 const a=e.clients.get('a'),b=e.clients.get('b');
 for(const {net}of e.clients.values())await net.publish();
 const q=b.net.latest.get('a');assert.equal(q.flash,true);assert.equal(q.pitch,.3);
 assert.equal(q.sig,createHmac('sha256','at').update(posePayload(q)).digest('hex'));
 assert.equal(a.net.peers.get('b').motion.ordered,false);assert.equal(a.net.peers.get('b').motion.maxRetransmits,0);
 assert.equal(a.net.pollInterval(),1000);
 a.net.changed();assert.equal(b.refresh(),1);
 const n=q.n;const motion=a.net.peers.get('b').motion;
 motion.send(JSON.stringify({...q,n:n-1,pos:[4,0,3]}));assert.equal(b.net.latest.get('a').n,n);
 motion.send(JSON.stringify({...q,id:'c',n:n+1}));assert.equal(b.net.latest.get('a').n,n);
 e.advance(1600);assert.equal(a.net.pollInterval(),250);assert.equal(a.net.connected(),0);
 for(const {net}of e.clients.values())net.close();
});
test('ICE candidates arriving before the offer are retained and used',async()=>{
 const e=environment(),a=e.client('a'),b=e.client('b');a.net.iceServers=b.net.iceServers=[];
 await a.net.offer('b');const offer=a.net.out.find(x=>x.type==='offer');
 const ice={from:'a',to:'b',type:'ice',link:offer.link,data:{candidate:'test'}};
 await b.net.receive(ice);await b.net.receive({...offer,from:'a'});
 assert.equal(b.net.peers.get('a').pc.ice.length,1);
});
test('publish scheduling retains twenty updates per second at a thirty FPS render rate',()=>{
 const e=environment(),{net}=e.client('a');let count=0;net.publish=()=>count++;
 net.publishAt=100;
 for(let i=1;i<=30;i++){e.advance(1000/30);net.update();}
 assert.ok(count>=19&&count<=20,'frames must not reduce motion updates to 15 Hz');
});
