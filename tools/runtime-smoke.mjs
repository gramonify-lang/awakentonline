import vm from 'node:vm';import fs from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map();function elem(){let ctx;const e={width:256,height:256,hidden:true,style:{},dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x);return x},remove(){},removeAttribute(){},setAttribute(){},getAttribute(){return null},addEventListener(){},focus(){},querySelector(){return elem()},querySelectorAll(){return []},getBoundingClientRect(){return {width:1280,height:720,left:0,top:0}},cloneNode(){return elem()},getContext(){return ctx??=new Proxy({canvas:e,measureText:t=>({width:String(t).length*15}),createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}})},toDataURL(){return 'data:image/png;base64,'}};return e;}
const d={createElement:()=>elem(),createElementNS:()=>elem(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,elem());return nodes.get(id)},querySelector:()=>elem(),querySelectorAll:()=>[],addEventListener(){},head:elem(),body:elem(),documentElement:elem(),fonts:{load:async()=>[]}};
const ctx={assert,console,document:d,window:null,self:null,navigator:{userAgent:'test',maxTouchPoints:0},location:{href:'http://localhost:3000',pathname:'/'},URL,performance,Date,Math,Uint8Array,Float32Array,Uint8ClampedArray,ArrayBuffer,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame(){},addEventListener(){},innerWidth:1280,innerHeight:720,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},Image:class{},fetch,AbortSignal};ctx.window=ctx;ctx.self=ctx;vm.createContext(ctx);
const html=fs.readFileSync('index.html','utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);for(let s of scripts){if(s.includes('(function bootstrap() {'))s=s.slice(0,s.indexOf('(function bootstrap() {'));vm.runInContext(s,ctx,{timeout:15000});}
console.log('Original + multiplayer scripts evaluated');
vm.runInContext(`scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(72,16/9,.05,100); renderer={capabilities:{getMaxAnisotropy:()=>1},getPixelRatio:()=>1,setSize(){},getSize:()=>new THREE.Vector2(1280,720)}; RW=1280;RH=720;mirrorRT=new THREE.WebGLRenderTarget(1280,720); postMat={uniforms:{uFade:{value:1},uFear:{value:0},uDesat:{value:0},uGrain:{value:0},uChroma:{value:0},uVig:{value:0},uVigR:{value:new THREE.Vector2()},uEdge:{value:0},uScare:{value:0},tScare:{value:null}}}; buildTextures();buildWorld();Actors.init();Story.init();console.log('Original world and actors constructed');`,ctx,{timeout:45000});
vm.runInContext(`UI.el=new Proxy({view:document.createElement('canvas')},{get:(o,k)=>o[k]||(o[k]=document.createElement('div'))}); UI.closeOverlay=()=>{UI.overlay=null};UI.clearThoughts=()=>{}; UI.prompt=()=>{};UI.hint=()=>{};Title.close=()=>{};Title.stopTease=()=>{};Sound.ok=false;Sound.init=()=>{};Sound.resume=()=>{};App.ready=true;MP.init();MP.session={id:'h',token:'ht',code:'ABCDEF'};MP.state={phase:'playing',until:Date.now()+720000,serverNow:Date.now(),tasks:MP.tasks.map(t=>({id:t.id,step:0,done:false})),players:{h:{id:'h',name:'H',pos:[3.3,0,3.2],hp:2,role:'human',cooldowns:{},seen:Date.now()},g:{id:'g',name:'G',pos:[12,0,3],hp:2,role:'ghost',cooldowns:{},seen:Date.now(),visibleUntil:Date.now()+6500}},doors:{},effects:[]}; MP.startWorld();MP.syncAvatars();MP.frame(.016);MP.world(.016);console.log('Multiplayer round initialized; frame and doors updated');`,ctx,{timeout:45000});
vm.runInContext(`
const rig=makePerson({}),rigPose={walk:1.2,amp:.8,pitch:.3,flash:true};poseHuman(rig,rigPose);
function vertexBounds(root){root.updateMatrixWorld(true);const box=new THREE.Box3(),v=new THREE.Vector3();root.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++)box.expandByPoint(v.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld));});return box;}
const beforeBox=vertexBounds(rig.root),stats=compactMultiplayerRig(rig);poseHuman(rig,rigPose);
const afterBox=vertexBounds(rig.root);
assert.ok(stats.after<stats.before);assert.ok(beforeBox.min.distanceTo(afterBox.min)<.00001&&beforeBox.max.distanceTo(afterBox.max)<.00001);
console.log('Original animated human geometry preserved; meshes '+stats.before+' → '+stats.after);
assert.equal(MP.avatars.get('g').H.smoke.pts.geometry.attributes.position.count,1000);
MP.frame(.016);assert.notEqual(MP.avatars.get('g').H.root.layers.mask,0x7fffffff);
buildPortals();
postMat.uniforms.uTime={value:0};postMat.uniforms.uCalm={value:0};postMat.uniforms.uPulse={value:0};postMat.uniforms.uWob={value:new THREE.Vector4()};
renderFrame=()=>{};Sound.suspend=()=>{throw Error('Multiplayer menu suspended audio');};
const originalWorld=MP.world;let worldFrames=0;MP.world=function(dt){worldFrames++;originalWorld.call(this,dt);};
App.last=1000;MP.round=MP.state.until;MP.network.resetRound(MP.round);MP.state.version=1;
Input.keys.KeyW=true;UI.onEscape();assert.equal(MP.menu,true);assert.equal(G.paused,false);assert.equal(Player.enabled,false);
const oldT=G.t,oldPos=Player.pos.clone();loop(1016);loop(1032);
assert.ok(G.t>oldT);assert.equal(worldFrames,2);assert.ok(Player.pos.distanceTo(oldPos)<.0001);assert.equal(UI.el.pause.hidden,false);
const hit=JSON.parse(JSON.stringify(MP.state));hit.players.h.hp=0;hit.version=2;hit.serverNow=Date.now();MP.accept(hit);loop(1048);
assert.equal(Player.enabled,false);assert.equal(MP.menu,true);assert.ok(UI.el.foundText.textContent.includes('uitgeschakeld'));
App.resume();assert.equal(MP.menu,false);assert.equal(G.paused,false);assert.equal(Player.enabled,false);
const revived=JSON.parse(JSON.stringify(MP.state));revived.players.h.hp=1;revived.version=3;revived.serverNow=Date.now();MP.accept(revived);assert.equal(Player.enabled,true);
MP.openTask(MP.tasks[0]);loop(1064);assert.equal(G.paused,false);assert.equal(Player.enabled,false);UI.onEscape();assert.equal(UI.overlay,null);assert.equal(Player.enabled,true);
MP.openLobby();loop(1080);assert.equal(G.paused,false);assert.equal(Player.enabled,false);MP.enter();assert.equal(Player.enabled,true);
MP.state.players.g=undefined;delete MP.state.players.g;MP.syncAvatars();assert.equal(MP.avatars.size,0);
console.log('Escape, damage/death, revive, puzzle/lobby menus and avatar disposal verified against the actual game loop');
`,ctx,{timeout:45000});
if(process.argv.includes('--export-walls'))fs.writeFileSync('lib/house-walls.json',vm.runInContext(`JSON.stringify(colliders.filter(c=>c.on&&c.occ&&!Object.values(DOORS).some(d=>d.col===c)))`,ctx));console.log('Original house integration check completed (mock DOM/canvas; no GPU rendering)');
