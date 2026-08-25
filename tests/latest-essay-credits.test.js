const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const pages = [
  'what-is-the-secret-of-success-en.html',
  'what-is-the-secret-of-success-jp.html',
  'what-is-a-strength-en.html',
  'what-is-a-strength-jp.html',
  'deep-thought-and-reality-en.html',
  'deep-thought-and-reality-jp.html'
];

test('latest three bilingual essays use the established readable credit style', () => {
  for (const page of pages) {
    const source = fs.readFileSync(new URL(`../essays/${page}`, `file://${__filename}`), 'utf8');
    assert.match(source, /\.footer\s*\{\s*text-align:center;\s*\}/);
    assert.doesNotMatch(source, /\.footer\s*\{[^}]*font-size:\.85rem/);
    assert.doesNotMatch(source, /\.footer\s*\{[^}]*color:#bbb/);
    assert.match(source, /© 2026 Collaborative Intelligence with Copilot/);
  }
});
