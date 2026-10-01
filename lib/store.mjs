import {createHash} from 'node:crypto';
const rooms=new Map(),poses=new Map(),signals=new Map(),rates=new Map();
const TTL=7200;
const CAS="local v=redis.call('GET',KEYS[1]); if (v or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',7200); return 1";
const RATE="local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],10) end; return n";
// A delayed heartbeat may not overwrite a newer pose from another request.
const POSE="local v=redis.call('HGET',KEYS[1],ARGV[1]); if v then local p=cjson.decode(v); local q=cjson.decode(ARGV[2]); if p.seen>q.seen then return 0 end end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]); redis.call('EXPIRE',KEYS[1],7200); return 1";
const DRAIN="local a={}; for i=1,64 do local v=redis.call('LPOP',KEYS[1]); if not v then break end; a[#a+1]=v end; return a";
export const configured=()=>!!(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
export async function pipeline(commands) {
  const url=process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/,'')+'/pipeline';
  const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(commands),signal:AbortSignal.timeout(6000)});
  const j=await r.json();
  if(!r.ok||!Array.isArray(j)||j.some(x=>x.error))throw Error('Opslag tijdelijk onbereikbaar.');
  return j.map(x=>x.result);
}
export function rateKey(req,kind='game') {
  const ip=createHash('sha256').update(String(req.headers?.['x-forwarded-for']||'local')).digest('hex').slice(0,16);
  return `awakent:rate:${kind}:${ip}`;
}
function localRate(key) {
  const now=Date.now();let r=rates.get(key);
  if(!r||r.until<now){r={n:0,until:now+10000};rates.set(key,r);}
  if(rates.size>2000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);
  return ++r.n;
}
export async function readRoom(code,key) {
  if(!configured())return {raw:rooms.get(code)||null,poses:poses.get(code)||{},hits:key?localRate(key):0};
  const commands=[['GET',`awakent:room:${code}`],['HGETALL',`awakent:poses:${code}`]];
  if(key)commands.push(['EVAL',RATE,1,key]);
  const [raw,hash,hits=0]=await pipeline(commands);
  const entries=Array.isArray(hash)?Object.fromEntries(Array.from({length:hash.length/2},(_,i)=>[hash[i*2],hash[i*2+1]])):hash||{};
  return {raw,poses:Object.fromEntries(Object.entries(entries).map(([id,v])=>[id,typeof v==='string'?JSON.parse(v):v])),hits};
}
export async function commitRoom(code,old,next) {
  if(configured())return !!(await pipeline([['EVAL',CAS,1,`awakent:room:${code}`,old||'',next]]))[0];
  if((rooms.get(code)||null)!==old)return false;rooms.set(code,next);return true;
}
export async function savePose(code,id,p) {
  if(configured())return pipeline([['EVAL',POSE,1,`awakent:poses:${code}`,id,JSON.stringify(p)],['EXPIRE',`awakent:room:${code}`,TTL]]);
  let map=poses.get(code);if(!map){map={};poses.set(code,map);}
  if(!map[id]||map[id].seen<=p.seen)map[id]=structuredClone(p);
}
export async function exchangeSignals(code,id,outgoing) {
  const key=to=>`awakent:signal:${code}:${to}`;
  if(configured()) {
    const commands=[];
    for(const m of outgoing)commands.push(['RPUSH',key(m.to),JSON.stringify(m)],['LTRIM',key(m.to),-96,-1],['EXPIRE',key(m.to),45]);
    commands.push(['EVAL',DRAIN,1,key(id)]);
    const results=await pipeline(commands);
    return (results.at(-1)||[]).map(x=>JSON.parse(x));
  }
  const now=Date.now();
  for(const m of outgoing) {let q=signals.get(key(m.to));if(!q||q.until<now){q={until:now+45000,list:[]};signals.set(key(m.to),q);}q.list.push(structuredClone(m));q.list=q.list.slice(-96);}
  const q=signals.get(key(id));if(!q||q.until<now)return [];
  return q.list.splice(0,64);
}
