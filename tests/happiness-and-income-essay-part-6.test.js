const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-6-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-6-jp.html', `file://${__filename}`), 'utf8');
const home = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');
const homeStyles = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');

test('final installment pages preserve bilingual metadata and reciprocal navigation', () => {
  assert.match(english, /<html lang="en">/);
  assert.match(japanese, /<html lang="ja">/);
  assert.match(english, /The Structure of Happiness and Income, Final Installment/);
  assert.match(japanese, /幸福と年収の構造論 最終回/);
  assert.match(english, /Happiness Is Not Maximization but Optimization/);
  assert.match(japanese, /幸福とは最大化ではなく最適化である/);
  assert.match(english, /happiness-and-income-structure-part-6-jp\.html/);
  assert.match(japanese, /happiness-and-income-structure-part-6-en\.html/);
  assert.match(english, /datePublished": "2026-11-11"/);
  assert.match(japanese, /datePublished": "2026-11-11"/);
});

test('final installment is the newest essay entry in both home pages', () => {
  const englishPartSix = home.indexOf('id="essay48"');
  const englishPartFive = home.indexOf('id="essay47"');
  const japanesePartSix = japaneseHome.indexOf('id="essay48"');
  const japanesePartFive = japaneseHome.indexOf('id="essay47"');

  assert.ok(englishPartSix >= 0 && englishPartSix < englishPartFive);
  assert.ok(japanesePartSix >= 0 && japanesePartSix < japanesePartFive);
  assert.match(home, /happiness-and-income-structure-part-6-en\.html/);
  assert.match(japaneseHome, /happiness-and-income-structure-part-6-jp\.html/);
});

test('final installment return links target its unique home-page entry', () => {
  assert.equal((english.match(/href="\/index\.html#essay48"/g) || []).length, 2);
  assert.equal((japanese.match(/href="\/jp\/index\.html#essay48"/g) || []).length, 2);
});

test('sitemap includes both localized final-installment URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-6-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-6-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-6-en\.html"/);
});

test('the newest essay automatically receives the shared NEW UP badge', () => {
  assert.match(homeStyles, /#essays \.outputs-grid > li:first-child::before\s*\{/);
  assert.match(homeStyles, /content:\s*"NEW UP!"/);
  assert.match(homeStyles, /background:\s*#c2410c/);
});
