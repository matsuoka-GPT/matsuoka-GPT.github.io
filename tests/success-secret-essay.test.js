const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/what-is-the-secret-of-success-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/what-is-the-secret-of-success-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('the bilingual success essay preserves the central argument', () => {
  assert.match(japanese, /成功の秘訣とは/);
  assert.match(japanese, /好き × 初期条件 × 偶然 × 時代 × 運/);
  assert.match(japanese, /好きと成果が生み出す自然な継続/);
  assert.match(english, /What Is the Secret of Success\?/);
  assert.match(english, /What We Love × Starting Conditions × Chance × The Times × Luck/);
  assert.match(english, /natural persistence produced when enjoyment begins to yield results/);
  for (const source of [english, japanese]) {
    assert.match(source, /© 2026 Collaborative Intelligence with Copilot/);
  }
});

test('essay pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/what-is-the-secret-of-success-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/what-is-the-secret-of-success-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /"datePublished": "2026-08-25"/);
  }
});

test('homepages list essay 40 first in their matching language', () => {
  assert.match(englishHome, /id="essay40" href="\/essays\/what-is-the-secret-of-success-en\.html"/);
  assert.match(japaneseHome, /id="essay40" href="\.\.\/essays\/what-is-the-secret-of-success-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay40"') < englishHome.indexOf('id="essay39"'));
  assert.ok(japaneseHome.indexOf('id="essay40"') < japaneseHome.indexOf('id="essay39"'));
});

test('sitemap includes both localized essay URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/what-is-the-secret-of-success-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/what-is-the-secret-of-success-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/what-is-the-secret-of-success-en\.html"/);
});
