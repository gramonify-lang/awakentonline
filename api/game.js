import {randomBytes} from 'node:crypto';
import {createRoom,apply,publicState} from '../lib/game.mjs';
import {mergePoses,mergeObserved,recordPose} from '../lib/poses.mjs';
import {configured,readRoom,commitRoom,savePose,rateKey} from '../lib/store.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST vereist.'});
 if(!configured()&&process.env.VERCEL)return res.status(503).json({error:'Voeg UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN toe in Vercel en deploy opnieuw.'});
 try{
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
  if(!raw||raw.length>32000)throw Error('Ongeldig verzoek.');
  const b=JSON.parse(raw),now=Date.now();
  let code=String(b.code||'').trim().toUpperCase();
  if(b.action==='create')code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();
  if(!/^[A-F0-9]{6}$/.test(code))throw Error('Gebruik een geldige lobbycode van 6 tekens.');
  if(['create','join'].includes(b.action)){
   b.id=randomBytes(12).toString('hex');b.token=randomBytes(24).toString('hex');
   b.name=String(b.name||'Speler').trim().slice(0,24);b.role=b.role==='ghost'?'ghost':'human';
  }
  for(let tries=0;tries<10;tries++){
   const stored=await readRoom(code,tries?null:rateKey(req));
   if(stored.hits>350)return res.status(429).json({error:'Te veel verzoeken. Wacht enkele seconden.'});
   let s;
   if(b.action==='create'){
    if(stored.raw)throw Error('Lobbycode bestaat al. Probeer opnieuw.');
    s=createRoom(code,b.id,b.token,b.name,b.role,now);
   }else{
    if(!stored.raw)throw Error('Lobby niet gevonden of verlopen.');
    s=JSON.parse(stored.raw);
    if(b.action!=='join'&&s.players[b.id]?.token!==b.token)throw Error('Sessie ongeldig. Maak opnieuw verbinding.');
    mergePoses(s,stored.poses);
    if(b.action!=='join')mergeObserved(s,b.observed,now);
    const phase=s.phase,reviveTarget=s.players[b.id]?.reviveTarget||null;
    apply(s,b,now);
    // Ordinary heartbeats never contend over the entire room.
    if(b.action==='tick'&&s.phase===phase&&(s.players[b.id]?.reviveTarget||null)===reviveTarget){
     await savePose(code,b.id,recordPose(s,s.players[b.id]));
     return res.status(200).json({state:publicState(s,now)});
    }
   }
   s.version++;
   if(await commitRoom(code,stored.raw,JSON.stringify(s)))return res.status(200).json({state:publicState(s,now),...(['create','join'].includes(b.action)?{id:b.id,token:b.token}:{})});
  }
  return res.status(409).json({error:'Lobby is druk. Probeer opnieuw.'});
 }catch(e){return res.status(400).json({error:e.message||'Verzoek mislukt.'});}
}
