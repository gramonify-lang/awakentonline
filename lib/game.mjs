import walls from './house-walls.json' with {type:'json'};
import {validPose} from '../shared/protocol.js';
export const TASKS=[{id:'power',name:'Zekeringkast',pos:[15.03,0,8.85],hint:'Herstel de stroom: volg de aangegeven schakelaars.',sequence:[2,0,3,1]},{id:'radio',name:'Radio',pos:[10.6,0,10.72],hint:'Stem af: laag → hoog → midden → laag.',sequence:[0,2,1,0]},{id:'clock',name:'Klokritueel',pos:[9.8,-2.7,17],hint:'De notitie zegt: III → III → III. Kies driemaal 3.',sequence:[2,2,2]}];
export const SPAWN=[3.3,0,3.2];
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function fail(s){throw new Error(s)}
export function createRoom(code,id,token,name,role,now){return {code,host:id,phase:'lobby',players:{[id]:player(id,token,name,role,now)},doors:{},doorPositions:{bedroom:[4.675,0,4.4],bathroom:[7.2,0,4.4],study:[9.875,0,4.4],basement:[14,0,8.875],front:[0,0,7.375]},tasks:TASKS.map(t=>({id:t.id,step:0,done:false,last:0})),effects:[],event:0,version:0,until:0};}
function player(id,token,name,role,now){return {id,token,name,role,pos:[...SPAWN],yaw:0,pitch:0,flash:role==='human',crouch:0,walk:0,amp:0,motionN:0,seen:now,moved:now,seq:0,hp:2,escaped:false,energy:100,energyAt:now,cooldowns:{},visibleUntil:0,immuneUntil:0};}
export function applyPose(s,p,q,now){
 if(s.phase!=='playing'||p.hp<=0||p.escaped||!validPose(q))return false;
 if(q.round!==undefined&&q.round!==s.until)return false;
 if(q.n!==undefined&&q.n<=(p.motionN||0))return false;
 const path=(q.path||[]).filter(x=>x.n>(p.motionN||0)&&x.n<=(q.n||Infinity));
 if(path.some((x,i)=>i&&x.n<=path[i-1].n))return false;
 const points=path.map(x=>x.pos);if(!points.length||distance(points.at(-1),q.pos)>.001)points.push(q.pos);
 let from=p.pos,total=0;const budget=8*Math.min(3,Math.max(0,(now-p.moved)/1000))+.4;
 for(const v of points){total+=distance(from,v);if(total>budget||!clearPath(from,v,s))return false;from=v;}
 Object.assign(p,{pos:[...q.pos],yaw:q.yaw,pitch:Math.max(-1.35,Math.min(1.35,q.pitch)),flash:!!q.flash&&p.role==='human',crouch:Math.max(0,Math.min(1,q.crouch||0)),walk:q.walk||0,amp:Math.max(0,Math.min(1.4,q.amp||0)),moved:now,motionN:q.n||p.motionN||0});
 return true;
}
export function apply(s,b,now){
 if(s.phase==='lobby')settle(s,now);
 if(b.action==='join') {if(s.phase!=='lobby')fail('Deze ronde is al begonnen.');if(Object.keys(s.players).length>=5)fail('Lobby is vol.');const roles=Object.values(s.players);if(b.role==='ghost'&&roles.some(p=>p.role==='ghost'))fail('Er is al een ghost.');if(b.role!=='ghost'&&roles.filter(p=>p.role==='human').length>=4)fail('Vier bewoners aanwezig.');s.players[b.id]=player(b.id,b.token,b.name,b.role,now);return;}
 const p=s.players[b.id];if(!p||p.token!==b.token)fail('Sessie ongeldig. Maak opnieuw verbinding.');p.seen=now;
 if(b.pose)applyPose(s,p,b.pose,now);
 if(p.reviveTarget){const t=s.players[p.reviveTarget];if(!t||t.hp>0||(distance(p.pos,t.pos)>2.2||!clearPath(p.pos,t.pos,s))){p.reviveAt=0;p.reviveTarget=null;}}
 if(b.action==='tick'){settle(s,now);return;}
 if(!Number.isInteger(b.seq)||b.seq<=p.seq)return;p.seq=b.seq;
 if(b.action==='leave'){delete s.players[p.id];if(s.host===p.id)s.host=Object.keys(s.players)[0]||'';settle(s,now);return;}
 if(b.action==='start'||b.action==='restart'){if(s.host!==p.id)fail('Alleen de host kan starten.');const ps=Object.values(s.players);if(!ps.some(x=>x.role==='ghost')||!ps.some(x=>x.role==='human'))fail('Minimaal één bewoner en één ghost nodig.');s.phase='playing';s.until=Math.max(now+12*60*1000,s.until+1);s.tasks=TASKS.map(t=>({id:t.id,step:0,done:false,last:0}));s.effects=[];s.doors={};ps.forEach((x,i)=>Object.assign(x,{pos:x.role==='ghost'?[12,0,3]:[SPAWN[0]+i*.25,0,SPAWN[2]],yaw:0,pitch:0,flash:x.role==='human',crouch:0,walk:0,amp:0,motionN:0,hp:2,escaped:false,energy:100,energyAt:now,cooldowns:{},visibleUntil:0,immuneUntil:now+15000,moved:now,reviveAt:0,reviveTarget:null}));return;}
 if(s.phase!=='playing')fail('Er loopt geen ronde.');if(p.hp<=0||p.escaped)fail('Je bent uitgeschakeld of ontsnapt.');
 if(b.action==='door'){const d=b.door;if(!s.doorPositions?.[d])fail('Onbekende deur.');if(distance(p.pos,s.doorPositions[d])>3)fail('Loop dichter naar de deur.');s.doors[d]=!s.doors[d];}
 else if(b.action==='solve'){if(p.role!=='human')fail('Alleen bewoners lossen puzzels op.');const t=TASKS.find(x=>x.id===b.task),st=s.tasks.find(x=>x.id===b.task);if(!t||(distance(p.pos,t.pos)>2.6||!clearPath(p.pos,t.pos,s)))fail('Loop naar de puzzel.');if(st.done)return;if(now-st.last<450)fail('Wacht even tussen schakelaars.');st.last=now;if(t.sequence[st.step]===b.choice){st.step++;if(st.step===t.sequence.length)st.done=true;}else{st.step=0;effect(s,'wrong',p.pos,now,2000);}}
 else if(b.action==='escape'){if(p.role!=='human'||!s.tasks.every(t=>t.done))fail('Voltooi eerst alle drie puzzels.');if(distance(p.pos,[.8,0,8.5])>2.5)fail('Ga naar de voordeur.');p.escaped=true;}
 else if(b.action==='revive'){if(p.role!=='human')fail('Alleen bewoners kunnen helpen.');const t=s.players[b.target];if(!t||t.role!=='human'||t.hp>0||(distance(p.pos,t.pos)>2.2||!clearPath(p.pos,t.pos,s)))fail('Geen uitgeschakelde bewoner dichtbij.');if(!p.reviveAt||p.reviveTarget!==t.id){p.reviveAt=now;p.reviveTarget=t.id;}if(now-p.reviveAt>=5000){t.hp=1;t.immuneUntil=now+10000;p.reviveAt=0;p.reviveTarget=null;}}
 else if(b.action==='ability'){
 if(p.role!=='ghost')fail('Alleen de ghost heeft deze krachten.');const abilities={blackout:[25,20000],whisper:[10,8000],manifest:[25,16000],attack:[20,7000],slam:[15,10000],sabotage:[30,25000]};const cfg=abilities[b.ability];if(!cfg)fail('Onbekende kracht.');p.energy=Math.min(100,p.energy+(now-p.energyAt)/1000*4);p.energyAt=now;if((p.cooldowns[b.ability]||0)>now||p.energy<cfg[0])fail('Kracht nog niet beschikbaar.');
 if(b.ability==='attack'){if(p.visibleUntil<now)fail('Word eerst zichtbaar.');const victims=Object.values(s.players).filter(x=>x.role==='human'&&x.hp>0&&!x.escaped&&distance(x.pos,p.pos)<2.2&&x.immuneUntil<now&&clearPath(p.pos,x.pos,s));if(!victims.length)fail('Geen kwetsbare bewoner dichtbij.');victims.sort((a,b)=>distance(a.pos,p.pos)-distance(b.pos,p.pos));victims[0].hp--;victims[0].immuneUntil=now+6000;effect(s,'attack',victims[0].pos,now,1500);}
 else if(b.ability==='manifest'){p.visibleUntil=now+6500;effect(s,'manifest',p.pos,now,6500);}
 else if(b.ability==='slam'){const ds=Object.entries(s.doorPositions||{}).filter(([k,v])=>k!=='front'&&distance(v,p.pos)<4);if(!ds.length)fail('Geen deur dichtbij.');ds.forEach(([k])=>s.doors[k]=false);effect(s,'slam',p.pos,now,1500);}
 else if(b.ability==='sabotage'){const t=TASKS.find(x=>distance(x.pos,p.pos)<3&&clearPath(p.pos,x.pos,s)&&!s.tasks.find(y=>y.id===x.id).done);if(!t)fail('Geen onvoltooide puzzel dichtbij.');s.tasks.find(x=>x.id===t.id).step=0;effect(s,'sabotage',p.pos,now,2000);}
 else effect(s,b.ability,p.pos,now,b.ability==='blackout'?6500:2500);
 p.energy-=cfg[0];p.cooldowns[b.ability]=now+cfg[1];
 } else fail('Onbekende actie.');settle(s,now);
}
function effect(s,type,pos,now,duration){s.effects.push({id:++s.event,type,pos:[...pos],until:now+duration});s.effects=s.effects.slice(-15);}
export function settle(s,now){s.effects=s.effects.filter(x=>x.until>now);if(s.phase==='lobby'){for(const p of Object.values(s.players))if(now-p.seen>60000)delete s.players[p.id];if(!s.players[s.host])s.host=Object.keys(s.players)[0]||'';return;}if(s.phase!=='playing')return;const ps=Object.values(s.players),humans=ps.filter(p=>p.role==='human');const ghost=ps.find(p=>p.role==='ghost');if(!ghost||now-ghost.seen>60000){s.phase='humans';s.reason='De ghost heeft de verbinding verlaten.';}else if(humans.every(p=>p.escaped||now-p.seen>60000)){s.phase=humans.some(p=>p.escaped)?'humans':'ghost';s.reason='De bewoners hebben het huis verlaten.';}else if(humans.filter(p=>!p.escaped&&now-p.seen<=60000).every(p=>p.hp===0)){s.phase='ghost';s.reason='Alle achtergebleven bewoners zijn uitgeschakeld.';}else if(now>=s.until){s.phase='ghost';s.reason='De tijd is verstreken.';}}
export function publicState(s,now){const copy=structuredClone(s);for(const p of Object.values(copy.players)){delete p.token;p.energy=Math.min(100,p.energy+(now-p.energyAt)/1000*4);}delete copy.doorPositions;return {...copy,serverNow:now};}

export function clearPath(a,b,s){
 const start=[a[0],a[1]+1,a[2]],end=[b[0],b[1]+1,b[2]];
 const blocks=[...walls,...Object.entries(s.doorPositions||{}).filter(([k])=>!s.doors[k]&&k!=='front').map(([k,p])=>({x0:p[0]-(k==='basement'?.06:.43),x1:p[0]+(k==='basement'?.06:.43),y0:p[1],y1:p[1]+2.1,z0:p[2]-(k==='basement'?.43:.06),z1:p[2]+(k==='basement'?.43:.06)}))];
 for(const w of blocks){let lo=0,hi=1;for(const [i,k]of ['x','y','z'].entries()){const d=end[i]-start[i],min=w[k+'0']+.015,max=w[k+'1']-.015;if(Math.abs(d)<1e-8){if(start[i]<min||start[i]>max){hi=-1;break;}}else{let t1=(min-start[i])/d,t2=(max-start[i])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);}}if(lo<=hi&&hi>=0&&lo<=1)return false;}return true;
}
