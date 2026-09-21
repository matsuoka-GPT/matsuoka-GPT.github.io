const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-1-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-1-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('the bilingual essay preserves its central argument and series context', () => {
  assert.match(japanese, /年収と幸福は、そもそも同じものを測っていない/);
  assert.match(japanese, /次回は、この「フェラーリ問題」から考えてみたい/);
  assert.match(english, /Income and happiness do not measure the same thing/);
  assert.match(english, /Ferrari problem/);
  for (const source of [english, japanese]) {
    assert.match(source, /2026-09-22/);
    assert.match(source, /"@type": "Article"/);
  }
});

test('essay pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-1-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-1-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
  }
});

test('homepages list essay 43 first in their matching language', () => {
  assert.match(englishHome, /id="essay43" href="\/essays\/happiness-and-income-structure-part-1-en\.html"/);
  assert.match(japaneseHome, /id="essay43" href="\.\.\/essays\/happiness-and-income-structure-part-1-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay43"') < englishHome.indexOf('id="essay42"'));
  assert.ok(japaneseHome.indexOf('id="essay43"') < japaneseHome.indexOf('id="essay42"'));
});

test('sitemap includes both localized essay URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-1-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-1-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-1-en\.html"/);
});
