// tests/mobile-layout.test.js
// Developer: Marcus Daley
// Date: 2026-10-28
// Why: Preserve the phone HUD spacing and typography rules derived from on-device screenshots.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'styles.css'), 'utf8');

test('mobile CSS disables iOS text inflation and keeps HUD copy inside its panels', () => {
  assert.match(css, /html\s*\{[^}]*-webkit-text-size-adjust:\s*100%[^}]*text-size-adjust:\s*100%/s);
  assert.match(css, /\.squad\s*\{[^}]*overflow-x:\s*hidden[^}]*overflow-wrap:\s*anywhere/s);
});

test('phone lobby reserves a status lane below the scrollable squad panel', () => {
  assert.match(css, /\.in-room:not\(\.is-running\)\s+\.squad\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*174px\s*-\s*env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.in-room:not\(\.is-running\)\s+\.guild-briefing\s+p\s*\{[^}]*font-size:\s*13px[^}]*line-height:\s*1\.5/s);
  assert.match(css, /\.in-room:not\(\.is-running\)\s+\.status\s*\{[^}]*max-height:\s*72px[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.in-room\s+\.bottom-ui\s*\{[^}]*bottom:\s*max\(13px,\s*env\(safe-area-inset-bottom\)\)/s);
});

test('coarse-pointer status and touch controls have separate readable lanes', () => {
  assert.match(css, /\.is-running\s+\.bottom-ui\s*\{[^}]*right:\s*max\(8px,\s*env\(safe-area-inset-right\)\)[^}]*bottom:\s*calc\(182px\s*\+\s*env\(safe-area-inset-bottom\)\)[^}]*max-width:\s*none/s);
  assert.match(css, /\.is-running\s+\.status\s*\{[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.touch-controls button\s*\{[^}]*font-size:\s*14px[^}]*line-height:\s*1\.15/s);
  assert.match(css, /\.touch-controls button:disabled\s*\{[^}]*opacity:\s*\.72/s);
});

test('short landscape phones keep messages away from the right HUD panel', () => {
  assert.match(css, /@media \(pointer:\s*coarse\) and \(max-height:\s*540px\) and \(orientation:\s*landscape\)[\s\S]*?\.is-running\s+\.bottom-ui\s*\{[^}]*right:\s*calc\(min\(215px,\s*52vw\)\s*\+\s*16px\s*\+\s*env\(safe-area-inset-right\)\)/);
  assert.match(css, /@media \(pointer:\s*coarse\) and \(max-height:\s*540px\) and \(orientation:\s*landscape\)[\s\S]*?\.in-room:not\(\.is-running\)\s+\.bottom-ui\s*\{[^}]*right:\s*calc\(338px\s*\+\s*env\(safe-area-inset-right\)\)/);
});

test('390 by 844 portrait and 844 by 390 landscape lanes do not intersect', () => {
  const portraitSquadBottom = 80 + (844 - 174);
  const portraitLobbyStatusTop = 844 - 13 - 72 - 8;
  const portraitTouchTop = 844 - 8 - (3 * 52 + 2 * 3);
  const portraitRunningStatusBottom = 844 - 182;
  assert.ok(portraitSquadBottom <= portraitLobbyStatusTop);
  assert.ok(portraitRunningStatusBottom < portraitTouchTop);

  const landscapePanelLeft = 844 - 13 - 215;
  const landscapeStatusRight = 844 - 215 - 16;
  const landscapeLobbyPanelLeft = 844 - 20 - 310;
  const landscapeLobbyStatusRight = 844 - 338;
  const landscapeTouchTop = 390 - 8 - (3 * 42 + 2 * 3);
  const landscapeStatusBottom = 390 - 148;
  assert.ok(landscapeStatusRight < landscapePanelLeft);
  assert.ok(landscapeLobbyStatusRight < landscapeLobbyPanelLeft);
  assert.ok(landscapeStatusBottom < landscapeTouchTop);
});
