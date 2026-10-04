const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-3-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/happiness-and-income-structure-part-3-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('part three preserves its central argument and series context', () => {
  assert.match(japanese, /所有することと、利用することは違う/);
  assert.match(japanese, /「どれだけ多く持っているか」ではなく、「どれだけ気持ちよく暮らせるか」/);
  assert.match(japanese, /次回は、「毎日のフルコースは幸福なのか」/);
  assert.match(english, /Owning something and using it are not the same/);
  assert.match(english, /not about how much we possess, but about how comfortably we can live/);
  assert.match(english, /Would a full-course meal every day make us happy/);
  for (const source of [english, japanese]) {
    assert.match(source, /2026-10-04/);
    assert.match(source, /"@type": "Article"/);
  }
});

test('part three pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-3-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-3-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
    assert.match(source, /#essay45/);
  }
});

test('homepages list essay 45 before essay 44 in their matching language', () => {
  assert.match(englishHome, /id="essay45" href="\/essays\/happiness-and-income-structure-part-3-en\.html"/);
  assert.match(japaneseHome, /id="essay45" href="\.\.\/essays\/happiness-and-income-structure-part-3-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay45"') < englishHome.indexOf('id="essay44"'));
  assert.ok(japaneseHome.indexOf('id="essay45"') < japaneseHome.indexOf('id="essay44"'));
});

test('sitemap includes both localized part three URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-3-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-3-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/happiness-and-income-structure-part-3-en\.html"/);
});
