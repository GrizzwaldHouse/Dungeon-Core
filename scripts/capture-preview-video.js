// capture-preview-video.js
// Developer: Marcus Daley
// Date: 2026-11-01
// Why: Reuse the authoritative campaign driver to record a local gameplay preview and protected story evidence.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const original = path.join(root, 'scripts/capture-character-deepwood.js');
const outputPath = path.resolve(process.argv[2] || 'docs/evidence/post-release-visual-pass');
const required = (source, from, to) => {
  if (!source.includes(from)) throw new Error(`Campaign capture anchor changed: ${from.slice(0, 72)}`);
  return source.replace(from, to);
};

let source = fs.readFileSync(original, 'utf8');
source = required(source,
  "'--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profilePath}`",
  "'--no-first-run', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profilePath}`");
source = required(source,
  "devTools = await connectDevTools(target.webSocketDebuggerUrl);",
  "devTools = await connectDevTools(target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));"
);
source = required(source,
  "await waitForCondition(send, \"document.querySelector('#connection-label')?.textContent === 'CONNECTED'\", 'local Socket.IO connection');",
  `await waitForCondition(send, "document.querySelector('#connection-label')?.textContent === 'CONNECTED'", 'local Socket.IO connection');
    const titleFrame = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    fs.writeFileSync(path.join(outputPath, 'title.png'), Buffer.from(titleFrame.data, 'base64'));`);

source = required(source,
  "await waitForCondition(send, \"document.querySelector('#viewport')?.classList.contains('webgl-ready')\", 'WebGL ready');",
  `await waitForCondition(send, "document.querySelector('#viewport')?.classList.contains('webgl-ready')", 'WebGL ready');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outputPath });
    await evaluate(send, \`(() => {
      const canvas = document.querySelector('#viewport canvas');
      if (!canvas || !canvas.captureStream || !window.MediaRecorder) throw new Error('Canvas recording unavailable');
      const recorder = new MediaRecorder(canvas.captureStream(12), { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 1200000 });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      window.__qaRecording = { recorder, chunks };
      recorder.start(1000);
      return true;
    })()\`);`);

source = required(source,
  "if (!result.ok) throw new Error(`${label}: ${result.error}`);\n    };",
  `if (!result.ok) throw new Error(\`\${label}: \${result.error}\`);
      if (label === 'entry gate') {
        await waitForCondition(send, "document.querySelector('#story-chapter')?.open === true", 'protected story artwork');
        const chapterFrame = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
        fs.writeFileSync(path.join(outputPath, 'protected-story-arrival.png'), Buffer.from(chapterFrame.data, 'base64'));
        const heldTick = snapshot().tick;
        const heldHealth = snapshot().players[snapshot().hostPlayerId].health.current;
        await delay(250);
        if (snapshot().tick !== heldTick || snapshot().players[snapshot().hostPlayerId].health.current !== heldHealth)
          throw new Error('Combat progressed while travel story obscured the scene');
      }
      await evaluate(send, "document.querySelector('#story-chapter-continue')?.click(); true");
      await waitFor((state) => state.arrival === null, 'party arrival readiness');
    };`);

source = required(source,
  "const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();",
  `await evaluate(send, \`new Promise((resolve, reject) => {
      const recording = window.__qaRecording;
      if (!recording) return reject(new Error('Recording did not start'));
      recording.recorder.onstop = () => {
        const video = new Blob(recording.chunks, { type: 'video/webm' });
        if (!video.size) return reject(new Error('Recorded video was empty'));
        const link = document.createElement('a');
        link.href = URL.createObjectURL(video);
        link.download = 'dungeon-core-gameplay-canvas.webm';
        document.body.append(link);
        link.click();
        setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); resolve(video.size); }, 1000);
      };
      recording.recorder.stop();
    })\`);
    for (let attempt = 0; attempt < 60 && !fs.existsSync(path.join(outputPath, 'dungeon-core-gameplay-canvas.webm')); attempt += 1)
      await delay(200);
    if (!fs.existsSync(path.join(outputPath, 'dungeon-core-gameplay-canvas.webm')))
      throw new Error('Chrome did not save the gameplay video');
    const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();`);

source = required(source,
  "source: 'live authoritative Deepwood server; local headless Chrome / SwiftShader',",
  "source: 'local authoritative campaign; Chrome / SwiftShader; canvas-only WebM plus full-page screenshots',");
if (process.env.QA_HEADED === '1') source = required(source, "'--headless=new', ", '');

new vm.Script(source, { filename: original });
if (process.env.QA_VALIDATE_ONLY === '1') {
  process.stdout.write('Preview capture anchors and compiled source validated.\n');
  return;
}
process.argv[2] = outputPath;
const compiled = new Module(original, module);
compiled.filename = original;
compiled.paths = Module._nodeModulePaths(path.dirname(original));
compiled._compile(source, original);
