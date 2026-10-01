/* Small WebRTC mesh (at most five players). Vercel/Redis only handles
   matchmaking, heartbeats and authoritative game actions. No camera/mic. */
class MultiplayerNetwork {
 constructor(mp) {
  this.mp=mp;this.peers=new Map();this.out=[];this.latest=new Map();this.samples=new Map();this.orphanIce=new Map();
  this.n=0;this.round=0;this.path=[];this.publishAt=0;this.nextSignal=0;
  this.supported=typeof RTCPeerConnection!=='undefined'&&!!globalThis.crypto?.subtle;
  this.iceServers=null;this.turnConfigured=false;this.httpMs=0;
 }
 resetRound(round,n=0) {
  this.round=round;this.n=n;this.path=[];this.latest.clear();this.samples.clear();this.lastPose=null;
 }
 sync() {
  const {state,session}=this.mp;if(!state||!session||!this.supported)return;
  for(const [id,p]of this.peers)if(!state.players[id]){p.pc.close();this.peers.delete(id);this.latest.delete(id);this.samples.delete(id);}
  if(!this.iceServers)return;
  for(const id of Object.keys(state.players))if(id!==session.id&&id>session.id&&!this.peers.has(id))this.offer(id).catch(()=>{});
 }
 newPeer(id,link) {
  const old=this.peers.get(id);if(old)old.pc.close();
  const pc=new RTCPeerConnection({iceServers:this.iceServers||[{urls:'stun:stun.l.google.com:19302'}]});
  const p={id,pc,link,ice:this.orphanIce.get(id+link)||[],created:performance.now(),last:0,pingAt:0,rtt:0,retryAt:0};
  this.orphanIce.delete(id+link);
  this.peers.set(id,p);
  pc.onicecandidate=e=>{if(e.candidate&&this.peers.get(id)===p)this.enqueue({to:id,link,type:'ice',data:e.candidate.toJSON()});};
  pc.ondatachannel=e=>this.bind(p,e.channel);
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))p.retryAt=performance.now()+1500;};
  return p;
 }
 async offer(id) {
  const bytes=crypto.getRandomValues(new Uint8Array(12));const link=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const p=this.newPeer(id,link);
  this.bind(p,p.pc.createDataChannel('motion',{ordered:false,maxRetransmits:0}));
  this.bind(p,p.pc.createDataChannel('events',{ordered:true}));
  await p.pc.setLocalDescription(await p.pc.createOffer());
  this.enqueue({to:id,link,type:'offer',data:{type:'offer',sdp:p.pc.localDescription.sdp}});
 }
 bind(p,ch) {
  if(ch.label==='motion')p.motion=ch;else if(ch.label==='events')p.events=ch;else{ch.close();return;}
  ch.onopen=()=>{p.last=performance.now();this.publishAt=0;this.mp.nextPoll=0;};
  ch.onmessage=e=>{
   if(this.peers.get(p.id)!==p||typeof e.data!=='string'||e.data.length>16000)return;
   let m;try{m=JSON.parse(e.data);}catch{return;}
   if(ch.label==='motion') {
    if(m.id!==p.id||m.round!==this.round||!validPose(m)||!Number.isSafeInteger(m.n)||typeof m.sig!=='string')return;
    const prev=this.latest.get(p.id);if(prev&&m.n<=prev.n)return;
    p.last=performance.now();this.latest.set(p.id,m);
    let a=this.samples.get(p.id);if(!a){a=[];this.samples.set(p.id,a);}a.push({at:p.last,q:m});if(a.length>10)a.shift();
   }else if(m.type==='refresh')this.mp.refreshSoon();
   else if(m.type==='ping')this.send(ch,{type:'pong',at:m.at});
   else if(m.type==='pong'&&Number.isFinite(m.at))p.rtt=Math.max(0,performance.now()-m.at);
  };
 }
 send(ch,m) {if(ch?.readyState==='open'&&ch.bufferedAmount<16000){try{ch.send(typeof m==='string'?m:JSON.stringify(m));return true;}catch{}}return false;}
 enqueue(m) {this.out.push(m);if(this.out.length>100)this.out.shift();this.nextSignal=0;}
 async receive(m) {
  if(!this.mp.state?.players[m.from]||m.from===this.mp.session.id)return;
  let p=this.peers.get(m.from);
  if(m.type==='offer') {
   // Exactly one initiator per pair prevents offer glare.
   if(m.from>this.mp.session.id)return;
   if(p?.link===m.link&&p.pc.remoteDescription)return;
   p=this.newPeer(m.from,m.link);
   await p.pc.setRemoteDescription(m.data);
   await p.pc.setLocalDescription(await p.pc.createAnswer());
   this.enqueue({to:m.from,link:m.link,type:'answer',data:{type:'answer',sdp:p.pc.localDescription.sdp}});
  }else {
   if(!p||p.link!==m.link){if(m.type==='ice'){const key=m.from+m.link;let a=this.orphanIce.get(key);if(!a){a=[];this.orphanIce.set(key,a);}if(a.length<24)a.push(m.data);if(this.orphanIce.size>20)this.orphanIce.delete(this.orphanIce.keys().next().value);}return;}
   if(m.type==='answer') {if(p.pc.signalingState!=='have-local-offer')return;await p.pc.setRemoteDescription(m.data);}
   else if(m.type==='ice') {if(!p.pc.remoteDescription){p.ice.push(m.data);return;}await p.pc.addIceCandidate(m.data);}
  }
  if(p.pc.remoteDescription)for(const c of p.ice.splice(0))await p.pc.addIceCandidate(c).catch(()=>{});
 }
 async signal() {
  if(!this.supported||!this.mp.active||!this.mp.session||this.signaling||performance.now()<this.nextSignal)return;
  this.signaling=true;const messages=this.out.splice(0,16);
  try {
   const r=await fetch('/api/signal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...this.mp.session,messages}),signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('Signaling niet beschikbaar.');const j=await r.json();
   this.iceServers=j.iceServers;this.turnConfigured=j.turnConfigured;
   for(const m of j.messages)await this.receive(m).catch(()=>{});
   const now=performance.now();
   for(const [id,p]of this.peers)if((now-p.created>16000&&p.motion?.readyState!=='open')||(p.retryAt&&now>p.retryAt)||(p.motion?.readyState==='open'&&now-p.last>12000&&this.mp.started)){p.pc.close();this.peers.delete(id);}
   this.sync();
   const all=this.connected()===this.expected();this.nextSignal=performance.now()+(this.out.length?100:all?5000:600);
  }catch {this.out.unshift(...messages);this.out=this.out.slice(-100);this.nextSignal=performance.now()+2000;}
  finally {this.signaling=false;}
 }
 pose() {
  if(!this.mp.started||!this.mp.me())return null;
  const me=this.mp.me();if(this.round!==this.mp.round)this.resetRound(this.mp.round,me.motionN||0);
  const pos=Player.pos.toArray().map(x=>Math.round(x*10000)/10000),n=++this.n;
  this.path.push({n,pos});if(this.path.length>48)this.path.shift();
  return {id:this.mp.session.id,round:this.round,n,pos,yaw:Player.yaw,pitch:Player.pitch,flash:Player.flashOn&&Player.flashK>.5&&(typeof Flash==='undefined'||Flash.mul>.3),crouch:Player.crouch,walk:Player.phase,amp:this.mp.controlsActive()?Math.min(1.4,Player.amp):0,path:this.path.slice()};
 }
 async publish() {
  if(!this.mp.started||this.publishing)return;
  this.publishing=true;
  try {
   const q=this.pose();if(!q)return;this.lastPose=q;
   if(this.supported&&this.mp.session) {
    if(this.keyToken!==this.mp.session.token){this.keyToken=this.mp.session.token;this.keyPromise=crypto.subtle.importKey('raw',new TextEncoder().encode(this.keyToken),{name:'HMAC',hash:'SHA-256'},false,['sign']);}
    const sig=await crypto.subtle.sign('HMAC',await this.keyPromise,new TextEncoder().encode(posePayload(q)));
    q.sig=Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,'0')).join('');
    const data=JSON.stringify(q);for(const p of this.peers.values())this.send(p.motion,data);
   }
  }catch {/* HTTPS fallback remains available. */}finally {this.publishing=false;}
 }
 update() {
  const now=performance.now();
  if(now-this.publishAt>=50){this.publishAt=now-((now-this.publishAt)%50);this.publish();}
  for(const p of this.peers.values())if(now-p.pingAt>2000){p.pingAt=now;this.send(p.events,{type:'ping',at:now});}
 }
 observed() {return [...this.latest.values()].filter(q=>q.round===this.round).slice(0,4);}
 sample(id,now=performance.now()) {
  const samples=this.samples.get(id);if(!samples?.length||now-samples.at(-1).at>300)return null;
  return sampleMotion(samples,now);
 }
 changed() {for(const p of this.peers.values())this.send(p.events,{type:'refresh'});}
 expected() {return Math.max(0,Object.keys(this.mp.state?.players||{}).length-1);}
 connected() {return [...this.peers.values()].filter(p=>p.motion?.readyState==='open'&&performance.now()-p.last<1500).length;}
 pollInterval() {return this.mp.started&&this.expected()>0&&this.connected()===this.expected()?1000:250;}
 status() {
  const count=this.connected(),total=this.expected(),times=[...this.peers.values()].filter(p=>p.motion?.readyState==='open'&&p.rtt>0).map(p=>p.rtt);
  const timing=times.length?` · ${Math.round(Math.max(...times))} ms RTT`:'';
  return count===total&&total>0?`Realtime ${count}/${total} · 20 updates/s${timing}`:`Realtime ${count}/${total} · server ${Math.round(this.httpMs)} ms${this.turnConfigured?'':' · bij blijvende fallback: TURN instellen'}`;
 }
 close() {for(const p of this.peers.values())p.pc.close();this.peers.clear();this.out=[];this.latest.clear();this.samples.clear();}
}
