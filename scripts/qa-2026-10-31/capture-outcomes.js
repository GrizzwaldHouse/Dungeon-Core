// capture-outcomes.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Extend the authoritative campaign capture to show real outcome UI without inventing client snapshots.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../..');
const original = path.join(root, 'scripts/capture-character-deepwood.js');
let source = fs.readFileSync(original, 'utf8');
source = source.replace('const captures = [];', `const captures = [];
async function qaPause(label) {
  if (process.env.QA_OBSERVER !== '1') return;
  console.log(label + ': send any input to continue');
  await new Promise((resolve) => process.stdin.once('data', resolve));
}
const sourceFiles = ['client/app.js', 'client/index.html', 'client/styles.css', 'client/render.js', 'server/server.js'];
const fingerprint = () => Object.fromEntries(sourceFiles.map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const sourceAtStart = fingerprint();`);
source = source.replace("await waitForCondition(send, \"document.querySelector('#start-room')?.disabled === false\", 'two-player start control');", `
    if (process.env.QA_OBSERVER === '1') {
      console.log('OBSERVER_ROOM_CODE=' + roomCode);
      console.log('OBSERVER_JOIN_AT=' + gameUrl);
      for (let i = 0; i < 1200; i++) {
        if (Object.values(app.getRoomSnapshot(roomCode).players).filter((p) => p.connection === 'CONNECTED').length >= 3) break;
        if (i === 1199) throw new Error('External observer did not join');
        await delay(500);
      }
    }
    await waitForCondition(send, "document.querySelector('#start-room')?.disabled === false", 'two-player start control');`);
if (process.env.QA_HEADED === '1') source = source.replace("'--headless=new', ", '');
source = source.replace("gameUrl = `http://localhost:${app.httpServer.address().port}/`;", "gameUrl = `http://localhost:${app.httpServer.address().port}/`; console.log('LOCAL_QA_URL=' + gameUrl);");
source = source.replace("await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });", "await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); await send('Emulation.setTouchEmulationEnabled', { enabled: mobile }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: mobile ? 'coarse' : 'fine' }] });");
source = source.replace("const gitHead = execFileSync", `
    // This is an assisted authoritative run: speed 25 and health 1000 remain explicit harness settings.
    await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'Deepwood finish', 90);
    await enterPortal('Deepwood to rune trial');
    await waitFor((state) => state.floor?.phase === 'FLOOR_FOUR', 'rune trial');
    for (const rune of snapshot().encounter.runes) {
      const current = snapshot().players[joined.playerId].transform.position;
      await moveNear(app, peer, roomCode, joined.playerId, { x: 4, z: current.z }, 0.5);
      await moveNear(app, peer, roomCode, joined.playerId, { x: 4, z: rune.position.z }, 0.5);
      await moveNear(app, peer, roomCode, joined.playerId, rune.position, 0.8);
      await waitFor((state) => state.encounter.nextRuneIndex > rune.index, 'ordered rune');
    }
    await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'rune guardian', 40);
    await enterPortal('floor four exit');
    await enterPortal('rest to floor five');
    await waitFor((state) => state.floor?.phase === 'FLOOR_FIVE', 'floor five');
    await evaluate(send, "document.querySelector('#story-chapter-continue')?.click(); true");
    await captureState('floor-five-warden', 1440, 900, false);
    await strikeUntil((state) => state.encounter?.stage === 'CLEARED', 'final Warden', 100);
    await enterPortal('final victory gate');
    await waitFor((state) => state.phase === 'COMPLETED', 'authoritative victory');
    await qaPause('OBSERVER_VICTORY_READY');
    await waitForCondition(send, "!document.querySelector('#expedition-results')?.hidden", 'victory UI');
    await captureState('victory-results', 1440, 900, false);
    await captureState('victory-results', 390, 844, true);
    await captureState('victory-results', 844, 390, true);
    await evaluate(send, "document.querySelector('#results-leave').scrollIntoView({block:'nearest'}); true");
    await captureState('victory-actions-after-scroll', 844, 390, true);
    // Server-owned fixture damage is labeled separately from campaign play and normal enemy damage.
    const continued = await evaluate(send, \`(() => {
      const button = document.querySelector('#continue-cycle');
      if (!button) return false;
      button.click(); return true;
    })()\`);
    if (!continued) throw new Error('Host continue control missing');
    await waitFor((state) => state.phase === 'RUNNING', 'optional harder cycle');
    const livePlayers = Object.values(snapshot().players);
    for (const player of livePlayers) app.applyDamage({ roomCode, playerId: player.playerId, amount: player.health.max });
    await waitFor((state) => state.phase === 'FAILED', 'server fixture party wipe');
    await qaPause('OBSERVER_DEFEAT_READY');
    await waitForCondition(send, "!document.querySelector('#expedition-results')?.hidden", 'defeat UI');
    await captureState('defeat-results-server-fixture', 1440, 900, false);
    await captureState('defeat-results-server-fixture', 390, 844, true);
    await captureState('defeat-results-server-fixture', 844, 390, true);
    await evaluate(send, "document.querySelector('#results-leave').scrollIntoView({block:'nearest'}); true");
    await captureState('defeat-actions-after-scroll', 844, 390, true);
    const outcomeAction = await evaluate(send, \`(() => {
      const button = document.querySelector('#results-leave');
      const r = button.getBoundingClientRect();
      return { disabled: button.disabled, visible: !button.hidden, height: r.height, width: r.width,
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight };
    })()\`);
    if (!outcomeAction.visible || outcomeAction.disabled || !outcomeAction.inViewport)
      throw new Error('Outcome Leave expedition action is not reachable after scrolling');
    await evaluate(send, "document.querySelector('#results-leave').click(); true");
    await waitForCondition(send, "document.querySelector('#expedition-results')?.hidden === true", 'return from defeat');
    const gitHead = execFileSync`);
source = source.replace("source: 'live authoritative Deepwood server; local headless Chrome / SwiftShader',", "source: 'assisted authoritative campaign: playerSpeed 25, maxHealth 1000; defeat uses explicit server damage fixture; local Chrome / SwiftShader',");
source = source.replace('candidateHead: gitHead,', 'candidateHead: gitHead, sourceAtStart, sourceAtEnd: fingerprint(),');
const compiled = new Module(original, module);
compiled.filename = original;
compiled.paths = Module._nodeModulePaths(path.dirname(original));
compiled._compile(source, original);
