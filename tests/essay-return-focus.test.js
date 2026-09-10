const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync(new URL('../scripts/essay-return-focus.js', `file://${__filename}`), 'utf8');
const english = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const styles = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');

test('both homepages use the shared essay return focus behavior', () => {
  assert.match(english, /<script src="scripts\/essay-return-focus\.js"><\/script>/);
  assert.match(japanese, /<script src="\.\.\/scripts\/essay-return-focus\.js"><\/script>/);
  assert.doesNotMatch(english, /window\.addEventListener\("load", \(\) => \{if \(!location\.hash\)/);
  assert.doesNotMatch(japanese, /window\.addEventListener\("load", \(\) => \{if \(!location\.hash\)/);
});

test('focus restoration does not wait for all page resources', () => {
  assert.match(script, /DOMContentLoaded/);
  assert.match(script, /pageshow/);
  assert.match(script, /event\.persisted/);
  assert.match(script, /ancestor\.open = true/);
  assert.match(script, /behavior: 'auto'/);
  assert.match(script, /block: 'center'/);
  assert.match(script, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(styles, /#essays a\[id\^="essay"\]:focus\s*\{[^}]*outline:\s*3px solid var\(--accent\)/s);
});

test('plain essay navigation preserves its target for browser back', () => {
  assert.match(script, /#essays a\[id\^="essay"\]/);
  assert.match(script, /replaceState[\s\S]*encodeURIComponent\(link\.id\)/);
  assert.match(script, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/);
});
