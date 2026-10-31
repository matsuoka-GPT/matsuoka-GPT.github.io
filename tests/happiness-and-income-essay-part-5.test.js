const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-5-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-5-jp.html', `file://${__filename}`), 'utf8');
const home = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');
const homeStyles = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');

test('part five pages preserve bilingual metadata and reciprocal navigation', () => {
  assert.match(english, /<html lang="en">/);
  assert.match(japanese, /<html lang="ja">/);
  assert.match(english, /The Structure of Happiness and Income, Part 5/);
  assert.match(japanese, /幸福と年収の構造論 第5回/);
  assert.match(english, /happiness-and-income-structure-part-5-jp\.html/);
  assert.match(japanese, /happiness-and-income-structure-part-5-en\.html/);
  assert.match(english, /datePublished": "2026-10-31"/);
  assert.match(japanese, /datePublished": "2026-10-31"/);
});

test('part five is the newest essay entry in both home pages', () => {
  const englishPartFive = home.indexOf('id="essay47"');
  const englishPartFour = home.indexOf('id="essay46"');
  const japanesePartFive = japaneseHome.indexOf('id="essay47"');
  const japanesePartFour = japaneseHome.indexOf('id="essay46"');

  assert.ok(englishPartFive >= 0 && englishPartFive < englishPartFour);
  assert.ok(japanesePartFive >= 0 && japanesePartFive < japanesePartFour);
  assert.match(home, /happiness-and-income-structure-part-5-en\.html/);
  assert.match(japaneseHome, /happiness-and-income-structure-part-5-jp\.html/);
});

test('part five essay return links target its unique home-page entry', () => {
  assert.equal((english.match(/href="\/index\.html#essay47"/g) || []).length, 2);
  assert.equal((japanese.match(/href="\/jp\/index\.html#essay47"/g) || []).length, 2);
});

test('sitemap includes both localized part five URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-5-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-5-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-5-en\.html"/);
});

test('the newest essay automatically receives the shared NEW UP badge', () => {
  assert.match(homeStyles, /#essays \.outputs-grid > li:first-child::before\s*\{/);
  assert.match(homeStyles, /content:\s*"NEW UP!"/);
  assert.match(homeStyles, /background:\s*#c2410c/);
});
