const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/researchers-and-explorers-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/researchers-and-explorers-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('the bilingual essay preserves its central distinction', () => {
  assert.match(japanese, /研究者は、既存の枠組みの中で洗練を進める/);
  assert.match(japanese, /探究者は、そもそも枠組みそのものを問い直す/);
  assert.match(english, /A researcher refines knowledge within an established framework/);
  assert.match(english, /An explorer questions the framework itself/);
  for (const source of [english, japanese]) {
    assert.match(source, /BFSSU\/DMF/);
    assert.match(source, /2026-09-12/);
    assert.match(source, /"@type": "Article"/);
  }
});

test('essay pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/researchers-and-explorers-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/researchers-and-explorers-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
  }
});

test('homepages list essay 42 first in their matching language', () => {
  assert.match(englishHome, /id="essay42" href="\/essays\/researchers-and-explorers-en\.html"/);
  assert.match(japaneseHome, /id="essay42" href="\.\.\/essays\/researchers-and-explorers-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay42"') < englishHome.indexOf('id="essay41"'));
  assert.ok(japaneseHome.indexOf('id="essay42"') < japaneseHome.indexOf('id="essay41"'));
});

test('sitemap includes both localized essay URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/researchers-and-explorers-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/researchers-and-explorers-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/researchers-and-explorers-en\.html"/);
});
