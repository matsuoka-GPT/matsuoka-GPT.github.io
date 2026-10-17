const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-4-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-4-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('part four preserves its central argument and series context', () => {
  assert.match(japanese, /消費額は増やせても、人間の身体そのものは増やせない/);
  assert.match(japanese, /食には、明らかに「ちょうどいい」が存在する/);
  assert.match(japanese, /次回は、高級スーツとお気に入りのTシャツ/);
  assert.match(english, /spending can increase, but the human body itself cannot/);
  assert.match(english, /Food clearly has a “just right.”/);
  assert.match(english, /ten dollars, one hundred, or even one thousand/);
  assert.match(english, /a thousand-dollar dish/);
  assert.doesNotMatch(english, /yen/i);
  assert.match(english, /a fine suit and a favorite T-shirt/);
  for (const source of [english, japanese]) {
    assert.match(source, /2026-10-17/);
    assert.match(source, /"@type": "Article"/);
  }
});

test('part four pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-4-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-4-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
    assert.match(source, /#essay46/);
  }
});

test('homepages list essay 46 before essay 45 in their matching language', () => {
  assert.match(englishHome, /id="essay46" href="\/essays\/happiness-and-income-structure-part-4-en\.html"/);
  assert.match(japaneseHome, /id="essay46" href="\.\.\/essays\/happiness-and-income-structure-part-4-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay46"') < englishHome.indexOf('id="essay45"'));
  assert.ok(japaneseHome.indexOf('id="essay46"') < japaneseHome.indexOf('id="essay45"'));
});

test('sitemap includes both localized part four URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-4-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-4-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-4-en\.html"/);
});
