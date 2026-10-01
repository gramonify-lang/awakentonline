import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import handler from './api/game.js';
const root=process.cwd();
http.createServer(async(req,res)=>{res.status=n=>{res.statusCode=n;return res};res.json=x=>res.end(JSON.stringify(x));try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/game'){let raw='';for await(const c of req){raw+=c;if(raw.length>4096){res.status(413).json({error:'Te groot.'});return;}}req.body=raw;return await handler(req,res);}const p=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(root+'/'))return res.status(403).end();const data=await readFile(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(p)]||'application/octet-stream');res.end(data);}catch{res.status(404).end('Niet gevonden');}}).listen(3000,()=>console.log('Awaken’t: http://localhost:3000 (lokale opslag; Vercel gebruikt Redis)'));
