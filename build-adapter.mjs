import {readFile,writeFile} from 'node:fs/promises';
let s=await readFile('original.html','utf8');
s=s.replace('    UI.el.startBtn.disabled = false;\n    this.ready = true;', '    UI.el.startBtn.disabled = false;\n    this.ready = true;\n    MP.init();');
s=s.replace('  if (!App.ready) return;', '  if (!App.ready) return;\n  MP.frame(dt);');
s=s.replace('    Interact.update();\n    Story.update(dt);\n    Lore.update(dt);', '    if (MP.started) MP.world(dt); else {\n    Interact.update();\n    Story.update(dt);\n    Lore.update(dt);\n    }');
s=s.replace("G.stage !== 'end' && !Panel.free) App.pause();", "G.stage !== 'end' && !Panel.free && UI.overlay !== 'mp') App.pause();");
s=s.replace('(function bootstrap() {',await readFile('multiplayer.js','utf8')+'\n(function bootstrap() {');await writeFile('index.html',s);
