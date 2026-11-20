const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-extra-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-extra-jp.html', `file://${__filename}`), 'utf8');
const home = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('special essay pages preserve bilingual metadata and reciprocal navigation', () => {
  assert.match(english, /<html lang="en">/);
  assert.match(japanese, /<html lang="ja">/);
  assert.match(english, /Does Happiness Have a “Reversal Zone”\?/);
  assert.match(japanese, /幸福には「反転領域」があるのではないか/);
  assert.match(english, /happiness-and-income-structure-extra-jp\.html/);
  assert.match(japanese, /happiness-and-income-structure-extra-en\.html/);
  assert.match(english, /datePublished": "2026-11-20"/);
  assert.match(japanese, /datePublished": "2026-11-20"/);
});

test('special essay is the newest essay entry in both home pages', () => {
  assert.ok(home.indexOf('id="essay49"') >= 0 && home.indexOf('id="essay49"') < home.indexOf('id="essay48"'));
  assert.ok(japaneseHome.indexOf('id="essay49"') >= 0 && japaneseHome.indexOf('id="essay49"') < japaneseHome.indexOf('id="essay48"'));
});

test('return links target the new home-page entry', () => {
  assert.equal((english.match(/href="\/index\.html#essay49"/g) || []).length, 2);
  assert.equal((japanese.match(/href="\/jp\/index\.html#essay49"/g) || []).length, 2);
});

test('sitemap includes both localized URLs and reciprocal alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-extra-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-extra-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-extra-en\.html"/);
});
