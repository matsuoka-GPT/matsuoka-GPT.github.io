const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const redirect = fs.readFileSync(new URL('../en/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');
const home = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');

test('legacy English URL permanently points to the canonical English homepage', () => {
  assert.match(redirect, /<meta http-equiv="refresh" content="0; url=https:\/\/matsuoka-gpt\.github\.io\/">/);
  assert.match(redirect, /<link rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/">/);
  assert.match(redirect, /<meta name="robots" content="noindex,follow">/);
  assert.match(redirect, /location\.replace\(destination\.href\)/);
  assert.match(redirect, /<a href="https:\/\/matsuoka-gpt\.github\.io\/">/);
});

test('legacy English URL contains no obsolete research content', () => {
  assert.doesNotMatch(redirect, /BFSSU|DMF|In editing|Outputs \(Zenodo\)|Research Statement/);
});

test('legacy English URL is absent from the sitemap and homepage links', () => {
  for (const source of [sitemap, home, japaneseHome]) {
    assert.doesNotMatch(source, /https:\/\/matsuoka-gpt\.github\.io\/en\/|href="\/?en\/"/);
  }
});
