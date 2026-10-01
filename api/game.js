import {randomBytes,createHash} from 'node:crypto';
import {createRoom,apply,publicState} from '../lib/game.mjs';
const localRooms=new Map(),rates=new Map();
const CAS=`local v=redis.call('GET',KEYS[1]); if (v or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',7200); return 1`;
async function redis(args){const r=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(6000)});const j=await r.json();if(!r.ok||j.error)throw new Error('Opslag tijdelijk onbereikbaar.');return j.result;}
const configured=()=>!!(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
async function read(key){return configured()?await redis(['GET',key]):localRooms.get(key)||null;}
async function commit(key,old,next){if(configured())return !!await redis(['EVAL',CAS,'1',key,old||'',next]);if((localRooms.get(key)||null)!==old)return false;localRooms.set(key,next);return true;}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST vereist.'});
 if(!configured()&&process.env.VERCEL)return res.status(503).json({error:'Voeg UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN toe in Vercel en deploy opnieuw.'});
 try{
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||raw.length>4096)throw new Error('Ongeldig verzoek.');const b=JSON.parse(raw),now=Date.now();
 const ip=createHash('sha256').update(String(req.headers['x-forwarded-for']||'local')).digest('hex').slice(0,16);const rateKey=`awakent:rate:${ip}`;
 let hits;if(configured()){hits=await redis(['EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],10) end; return n",'1',rateKey]);}else{let r=rates.get(ip);if(!r||r.until<now){r={n:0,until:now+10000};rates.set(ip,r);}hits=++r.n;}if(hits>350)return res.status(429).json({error:'Te veel verzoeken. Wacht enkele seconden.'});
 let code=String(b.code||'').trim().toUpperCase();if(b.action==='create')code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();if(!/^[A-F0-9]{6}$/.test(code))throw new Error('Gebruik een geldige lobbycode van 6 tekens.');
 if(['create','join'].includes(b.action)){b.id=randomBytes(12).toString('hex');b.token=randomBytes(24).toString('hex');b.name=String(b.name||'Speler').trim().slice(0,24);b.role=b.role==='ghost'?'ghost':'human';}
 const key=`awakent:room:${code}`;
 for(let tries=0;tries<10;tries++){
 const old=await read(key);let s;
 if(b.action==='create'){if(old)throw new Error('Lobbycode bestaat al. Probeer opnieuw.');s=createRoom(code,b.id,b.token,b.name,b.role,now);}
 else{if(!old)throw new Error('Lobby niet gevonden of verlopen.');s=JSON.parse(old);apply(s,b,now);}
 s.version++;if(await commit(key,old,JSON.stringify(s)))return res.status(200).json({state:publicState(s,now),...(['create','join'].includes(b.action)?{id:b.id,token:b.token}:{})});
 }
 return res.status(409).json({error:'Lobby is druk. Probeer opnieuw.'});
 }catch(e){return res.status(400).json({error:e.message||'Verzoek mislukt.'});}
}
