const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-2-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-2-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('part two preserves its central argument and series context', () => {
  assert.match(japanese, /「移動する」という基本機能は20倍にはならない/);
  assert.match(japanese, /豊かさというものは、単純な足し算ではない/);
  assert.match(japanese, /次回は、3LDKと豪邸から考えてみたい/);
  assert.match(english, /the basic function of “getting somewhere” does not become twenty times greater/);
  assert.match(english, /Prosperity, it seems, is not a matter of simple addition/);
  assert.match(english, /standard three-bedroom home with a luxury mansion/);
  for (const source of [english, japanese]) {
    assert.match(source, /2026-09-26/);
    assert.match(source, /"@type": "Article"/);
  }
});

test('part two pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-2-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-2-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
    assert.match(source, /#essay44/);
  }
});

test('homepages list essay 44 before essay 43 in their matching language', () => {
  assert.match(englishHome, /id="essay44" href="\/essays\/happiness-and-income-structure-part-2-en\.html"/);
  assert.match(japaneseHome, /id="essay44" href="\.\.\/essays\/happiness-and-income-structure-part-2-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay44"') < englishHome.indexOf('id="essay43"'));
  assert.ok(japaneseHome.indexOf('id="essay44"') < japaneseHome.indexOf('id="essay43"'));
});

test('sitemap includes both localized part two URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-2-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-2-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-2-en\.html"/);
});
