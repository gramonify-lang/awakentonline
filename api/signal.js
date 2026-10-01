import {configured,readRoom,exchangeSignals,rateKey} from '../lib/store.mjs';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST vereist.'});
 if(!configured()&&process.env.VERCEL)return res.status(503).json({error:'Redis is niet ingesteld.'});
 try {
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
  if(!raw||raw.length>64000)throw Error('Ongeldig verbindingsverzoek.');
  const b=JSON.parse(raw),code=String(b.code||'').toUpperCase();
  if(!/^[A-F0-9]{6}$/.test(code))throw Error('Ongeldige lobbycode.');
  const stored=await readRoom(code,rateKey(req,'signal'));
  if(stored.hits>200)return res.status(429).json({error:'Te veel verbindingsverzoeken.'});
  if(!stored.raw)throw Error('Lobby niet gevonden.');
  const s=JSON.parse(stored.raw);
  if(!s.players[b.id]||s.players[b.id].token!==b.token)throw Error('Sessie ongeldig.');
  const now=Date.now(),list=b.messages||[];
  if(!Array.isArray(list)||list.length>16)throw Error('Te veel verbindingsberichten.');
  const outgoing=list.map(m=>{
   if(!m||!s.players[m.to]||m.to===b.id||typeof m.link!=='string'||!/^[a-f0-9]{16,40}$/.test(m.link))throw Error('Ongeldige ontvanger.');
   if(!['offer','answer','ice'].includes(m.type))throw Error('Onbekend verbindingstype.');
   const data=m.data;
   if(m.type==='ice') {if(data!==null&&(typeof data!=='object'||typeof data.candidate!=='string'||data.candidate.length>2048))throw Error('Ongeldige ICE-kandidaat.');}
   else if(!data||data.type!==m.type||typeof data.sdp!=='string'||data.sdp.length>16000)throw Error('Ongeldige verbindingsbeschrijving.');
   return {from:b.id,to:m.to,type:m.type,link:m.link,data,at:now};
  });
  const messages=(await exchangeSignals(code,b.id,outgoing)).filter(m=>s.players[m.from]&&now-m.at<45000);
  const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
  const urls=(process.env.WEBRTC_TURN_URLS||'').split(',').map(x=>x.trim()).filter(x=>/^turns?:/.test(x));
  if(urls.length&&process.env.WEBRTC_TURN_USERNAME&&process.env.WEBRTC_TURN_CREDENTIAL)iceServers.push({urls,username:process.env.WEBRTC_TURN_USERNAME,credential:process.env.WEBRTC_TURN_CREDENTIAL});
  return res.status(200).json({messages,iceServers,turnConfigured:iceServers.length>1});
 }catch(e){return res.status(400).json({error:e.message||'Verbinding mislukt.'});}
}
