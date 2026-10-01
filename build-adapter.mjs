import {readFile,writeFile} from 'node:fs/promises';
let s=await readFile('original.html','utf8');
function replaceOnce(from,to) {if(!s.includes(from))throw Error('Integratiepunt ontbreekt: '+from.slice(0,90));s=s.replace(from,to);}
replaceOnce('    UI.el.startBtn.disabled = false;\n    this.ready = true;', '    UI.el.startBtn.disabled = false;\n    this.ready = true;\n    MP.init();');
replaceOnce('  if (!App.ready) return;', '  if (!App.ready) return;\n  MP.frame(dt);');
replaceOnce('    Player.update(dt);', '    Player.update(dt);\n    MP.afterFrame();');
replaceOnce('    Interact.update();\n    Story.update(dt);\n    Lore.update(dt);', '    if (MP.started) MP.world(dt); else {\n    Interact.update();\n    Story.update(dt);\n    Lore.update(dt);\n    }');
replaceOnce("G.stage !== 'end' && !Panel.free) App.pause();", "G.stage !== 'end' && !Panel.free && UI.overlay !== 'mp') App.pause();");
replaceOnce("else if (UI.overlay && (Input.ePress || Input.click))", "else if (UI.overlay && UI.overlay !== 'mp' && (Input.ePress || Input.click))");
replaceOnce("const needLock = !isTouch && !Input.locked", "const needLock = !MP.menu && !MP.lobbyOpen && UI.overlay !== 'mp' && !isTouch && !Input.locked");
replaceOnce('if (!renderMirror(activeMirror))', 'if (!(MP.started ? MP.drawMirror(activeMirror) : renderMirror(activeMirror)))');
replaceOnce('const n = 2000, pos =', 'const n = o.particles || 2000, pos =');
const protocol=(await readFile('shared/protocol.js','utf8')).replaceAll('export function ','function ');
const adapter=[protocol,await readFile('network.js','utf8'),await readFile('rendering.js','utf8'),await readFile('multiplayer.js','utf8')].join('\n');
replaceOnce('(function bootstrap() {',adapter+'\n(function bootstrap() {');
await writeFile('index.html',s);
