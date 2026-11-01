// phone-hud-crowding.test.js
// Developer: Marcus Daley
// Date: 2026-11-01
// Why: Keep phone interaction safety scoped to gameplay while preserving usable entry and reading surfaces.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.resolve(__dirname, '../client/styles.css'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../client/index.html'), 'utf8');

test('gameplay callout suppression preserves form and story text interaction', () => {
  const suppression = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /-webkit-touch-callout:\s*none/.test(body));
  assert.ok(suppression.length > 0);
  for (const [, selectors, body] of suppression) {
    assert.match(selectors, /\.is-running/);
    assert.doesNotMatch(selectors, /(?:^|,)\s*(?:html|body|\*|input|textarea)\s*(?:,|$)/);
    assert.doesNotMatch(selectors, /entry-panel|story-chapter|expedition-results/);
    assert.match(body, /user-select:\s*none/);
  }
  assert.match(css, /\.is-running \.bottom-ui, \.is-running \.bottom-ui \*\s*\{\s*pointer-events:\s*none/);
  assert.match(html, /id="status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="display-name"[^>]*autocomplete="nickname"/);
});

test('phone entry has a reserved uncropped artwork lane and an independently scrollable form', () => {
  assert.match(css, /html:not\(\.in-room\) #title-cover\s*\{[^}]*height:\s*var\(--entry-art-height\)[^}]*object-fit:\s*contain/);
  assert.match(css, /html:not\(\.in-room\) \.entry-panel\s*\{[^}]*top:\s*calc\(66px \+ var\(--entry-art-height\) \+ 50px\)[^}]*max-height:\s*none/);
  assert.match(css, /\.entry-panel\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.is-running \.game-shell > \.bottom-ui\s*\{[^}]*width:\s*min\(160px, 42vw\)/);
});
