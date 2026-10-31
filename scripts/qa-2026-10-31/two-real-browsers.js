// two-real-browsers.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Prove independent real-client synchronization through browser inputs instead of mock players.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const original = path.resolve(__dirname, '../capture-character-deepwood.js');
let prefix = fs.readFileSync(original, 'utf8').split('async function run() {')[0];

async function runTwoBrowsers() {
  const app = createGameServer({ host: 'localhost', port: 0 });
  await app.listen();
  const url = `http://localhost:${app.httpServer.address().port}/`;
  fs.mkdirSync(outputPath, { recursive: true });
  const browsers = [];
  const observations = [];
  const hashes = () => Object.fromEntries(['client/app.js','client/index.html','client/styles.css','client/render.js','server/server.js','server/config/game-parameters.js','server/weapon-profile.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  const startHashes = hashes();
  const head = execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
  async function page(name) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-real-client-'));
    const child = spawn(chromePath, ['--headless=new','--disable-background-networking','--disable-extensions','--no-first-run','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-angle=swiftshader','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1440,900','about:blank'], {stdio:'ignore'});
    const entry = {name, child, profile, latest: null};
    browsers.push(entry);
    let port;
    for (let i=0;i<150&&!port;i++) {
      try { port = Number(fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split(/\r?\n/)[0]); } catch { await delay(100); }
    }
    if (!port) throw new Error(`DevTools unavailable for ${name}`);
    const targets = await waitForJson(`http://localhost:${port}/json`);
    entry.dev = await connectDevTools(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
    entry.send = entry.dev.send;
    entry.dev.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method !== 'Network.webSocketFrameReceived') return;
      const packet = message.params.response.payloadData;
      if (!packet.startsWith('42')) return;
      try { const [type,payload] = JSON.parse(packet.slice(2)); if(type === 'room:snapshot') entry.latest = payload; } catch {}
    });
    await entry.send('Page.enable'); await entry.send('Runtime.enable'); await entry.send('Network.enable'); await entry.send('Log.enable');
    await entry.send('Page.navigate',{url});
    await waitForCondition(entry.send,"document.querySelector('#connection-label')?.textContent === 'CONNECTED'",`${name} connection`);
    return entry;
  }
  async function ui(entry, expression) { return evaluate(entry.send,expression); }
  async function wait(predicate,label,limit=100) { for(let i=0;i<limit;i++){if(predicate())return;await delay(80);}throw new Error(`Timed out: ${label}`); }
  async function capture(entry,label,width=1440,height=900,mobile=false) {
    await entry.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await entry.send('Emulation.setTouchEmulationEnabled',{enabled:mobile});
    await entry.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:mobile?'coarse':'fine'}]});
    await delay(180);
    const png=await entry.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    fs.writeFileSync(path.join(outputPath,`${label}-${width}x${height}.png`),Buffer.from(png.data,'base64'));
  }
  let code;
  function snap(){return app.getRoomSnapshot(code);}
  function player(name){return Object.values(snap().players).find(p=>p.displayName===name);}
  async function key(entry,key,down){await entry.send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key,code:'Key'+key.toUpperCase(),windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});}
  async function move(entry,target,tolerance=.6){
    await entry.send('Page.bringToFront');
    await ui(entry,"document.querySelector('#viewport').focus(); true");
    for(let i=0;i<180;i++){
      const p=player(entry.name).transform.position;
      const dx=target.x-p.x,dz=target.z-p.z;
      if(Math.hypot(dx,dz)<=tolerance)return;
      const chosen=Math.abs(dx)>Math.abs(dz)?dx>0?'d':'a':dz>0?'s':'w';
      await key(entry,chosen,true); await delay(85); await key(entry,chosen,false); await delay(35);
    }
    throw new Error(`Keyboard route blocked for ${entry.name}`);
  }
  function summarize(state){return {phase:state.phase,space:state.space?.id, floor:state.floor.index,players:Object.values(state.players).map(p=>({name:p.displayName,position:p.transform.position,health:p.health.current,role:p.combatProfile?.role,range:p.combatProfile?.rangeMeters})).sort((a,b)=>a.name.localeCompare(b.name)),enemies:Object.values(state.enemies).map(e=>({kind:e.kind,health:e.health.current,position:e.transform.position})).sort((a,b)=>a.kind.localeCompare(b.kind))};}
  async function agreement(label){
    await delay(160);
    const expected=summarize(snap());
    for(const browser of browsers){
      if(!browser.latest)throw new Error(`No real socket snapshot observed for ${browser.name}`);
      const seen=summarize(browser.latest);
      if(seen.phase!==expected.phase||seen.space!==expected.space||seen.players.length!==2||seen.enemies.length!==expected.enemies.length)throw new Error(`State divergence ${label} ${browser.name}`);
      for(const p of expected.players){const q=seen.players.find(x=>x.name===p.name);if(!q||q.health!==p.health||Math.hypot(q.position.x-p.position.x,q.position.z-p.position.z)>.75)throw new Error(`Player state divergence ${label}`);}
      for(let i=0;i<expected.enemies.length;i++){if(seen.enemies[i].health!==expected.enemies[i].health)throw new Error(`Enemy health divergence ${label}`);}
    }
    observations.push({label,server:expected,bothRealBrowsersAgree:true});
  }
  try {
    const host=await page('Axe Vanguard'),peer=await page('Arcane Mage');
    for(const [width,height,mobile] of [[1440,900,false],[390,844,true],[844,390,true]])await capture(host,'title-lobby',width,height,mobile);
    await ui(host,"document.querySelector('#display-name').value='Axe Vanguard'; document.querySelector('#create-room').click(); true");
    await waitForCondition(host.send,"!document.querySelector('#add-mocks')?.hidden",'host lobby');
    code=await ui(host,"document.querySelector('#room-label').textContent");
    await ui(peer,`document.querySelector('#display-name').value='Arcane Mage'; document.querySelector('#room-code').value=${JSON.stringify(code)}; document.querySelector('#join-room').click(); true`);
    await waitForCondition(host.send,"document.querySelector('#start-room')?.disabled === false",'two real roster');
    await ui(host,"document.querySelector('#start-room').click(); true");
    await wait(()=>browsers.every(b=>b.latest?.phase==='RUNNING'),'both running');
    for(const b of browsers)await ui(b,"(() => { const s=document.createElement('style');s.textContent='.room-tag,#status{visibility:hidden!important}';document.head.append(s);return true;})()");
    await agreement('two real players started');
    const mageBefore={...player(peer.name).transform.position};
    await move(host,{x:4,z:0});
    if(Math.hypot(player(peer.name).transform.position.x-mageBefore.x,player(peer.name).transform.position.z-mageBefore.z)>.1)throw new Error('Host movement moved peer');
    await agreement('host keyboard movement independent');
    await move(peer,{x:2,z:-1});
    await agreement('peer keyboard movement independent');
    const enemy=()=>Object.values(snap().enemies).find(e=>e.health.current>0);
    await move(host,enemy().transform.position,1.0);
    await wait(()=>player(host.name).health.current<100,'natural enemy damage',100);
    await agreement('natural enemy damage shared');
    for(const entry of [host,peer]){
      const before=enemy().health.current;
      await ui(entry,"document.querySelector('#attack-enemy').click(); true");
      await wait(()=>Object.values(snap().enemies)[0].health.current<before,`${entry.name} attack damage`);
      await agreement(`${entry.name} actual UI attack`);
      await delay(480);
    }
    for(let hit=0;hit<12&&enemy();hit++){
      await move(host,enemy().transform.position,1.0);
      await ui(host,"document.querySelector('#attack-enemy').click(); true");await delay(500);
    }
    if(!snap().floor.requiredObjectives.sentinelDefeated)throw new Error('Default sentinel fight did not clear');
    await capture(host,'two-real-clients-sentinel-clear');
    await move(host,snap().portals[0].position,.7);
    await ui(host,"document.querySelector('#enter-portal').click(); true");
    await wait(()=>snap().space.id!=='entry','actual portal transition');
    await agreement('both browsers share portal space');
    await capture(peer,'peer-after-portal');
    await ui(peer,"document.querySelector('#story-chapter-continue')?.click(); true");
    await ui(peer,"document.querySelector('#hud-toggle').click(); true");
    await capture(peer,'expanded-phone-hud',390,844,true);
    const result={candidateHead:head,sourceAtStart:startHashes,sourceAtEnd:hashes(),configuration:'default health100 speed5; no bot/probe; two independent real Chrome processes',observations,browserErrors,browserWarnings};
    fs.writeFileSync(path.join(outputPath,'report.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({candidateHead:head,observations:observations.length,browserErrors:browserErrors.length,outputPath}));
  } finally {
    for(const browser of browsers){browser.dev?.socket.close();browser.child.kill();}
    await app.close();
  }
}
const compiled=new Module(original,module);
compiled.filename=original;
compiled.paths=Module._nodeModulePaths(path.dirname(original));
compiled._compile(prefix+'\n'+runTwoBrowsers.toString()+"\nrunTwoBrowsers().catch(error=>{console.error(error.stack);process.exitCode=1;});",original);
