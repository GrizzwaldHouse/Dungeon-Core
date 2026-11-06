// vercel-build.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Build a reviewed static Vercel client without uploading private QA evidence or duplicating the authoritative server.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = __dirname;
const outputRoot = path.join(projectRoot, 'dist', 'vercel');
const clientRoot = path.join(projectRoot, 'client');
const clientFiles = [
  'index.html',
  'archway-preview.html',
  'preview-playthrough.html',
  'assets/archways/deepwood-archway-aqueduct.png',
  'assets/archways/deepwood-archway-root-crown.png',
  'deepwood.css',
  'story-preview.html',
  'qa.html',
  'qa.js',
  'qa.css',
  'story-preview.js',
  'story-preview.css',
  'story-chapters.css',
  'story-chapters.js',
  'quest-storyboard-draft.png',
  'app.js',
  'runtime-config.js',
  'network.js',
  'render.js',
  'touch-controls.js',
  'audio.js',
  'styles.css',
  'title-cover-deepwood.png'
];

// Why: Restrict cleanup and copying to the generated deployment directory so source and evidence cannot be overwritten.
// Input: The fixed project-root paths above; no command-line paths are trusted.
// Output: A complete static browser client under dist/vercel.
// Watch Out: Add new runtime assets to this allowlist and server/static-client.js together.
function build() {
  const expectedPrefix = path.join(projectRoot, 'dist') + path.sep;
  if (!outputRoot.startsWith(expectedPrefix)) throw new Error('Refusing to build outside the project dist directory');
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(path.join(outputRoot, 'assets', 'archways'), { recursive: true });
  for (const file of clientFiles) fs.copyFileSync(path.join(clientRoot, file), path.join(outputRoot, file));
  const configuredOrigin = String(process.env.GAME_SERVER_ORIGIN || '').trim();
  if (configuredOrigin) {
    const serverUrl = new URL(configuredOrigin);
    if (serverUrl.protocol !== 'https:' || serverUrl.origin !== configuredOrigin) {
      throw new TypeError('GAME_SERVER_ORIGIN must be one exact HTTPS origin');
    }
    const runtimeConfig = `// runtime-config.js\n// Developer: Marcus Daley\n// Date: 2026-10-31\n// Why: Bind this static client deployment to its separately hosted authoritative server.\n\n'use strict';\n\nwindow.DUNGEON_CORE_SERVER_ORIGIN = ${JSON.stringify(configuredOrigin)};\n`;
    fs.writeFileSync(path.join(outputRoot, 'runtime-config.js'), runtimeConfig);
  }
  fs.copyFileSync(path.join(projectRoot, 'shared', 'dungeon-layout.js'), path.join(outputRoot, 'dungeon-layout.js'));
  console.log(`Built ${clientFiles.length + 1} reviewed Vercel client files.`);
}

build();
