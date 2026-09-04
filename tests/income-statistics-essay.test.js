const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../essays/why-income-statistics-feel-wrong-en.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../essays/why-income-statistics-feel-wrong-jp.html', `file://${__filename}`), 'utf8');
const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

test('the bilingual income statistics essay preserves its structural argument', () => {
  for (const source of [english, japanese]) {
    assert.match(source, /478|4\.78/);
    assert.match(source, /Google AI/);
    assert.match(source, /Article/);
    assert.match(source, /2026-09-04/);
    assert.match(source, /Collaborative Intelligence with Google AI/);
  }
});

test('essay pages expose reciprocal language and canonical metadata', () => {
  assert.match(japanese, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/why-income-statistics-feel-wrong-jp\.html"/);
  assert.match(english, /rel="canonical" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/why-income-statistics-feel-wrong-en\.html"/);
  for (const source of [english, japanese]) {
    assert.match(source, /hreflang="en"/);
    assert.match(source, /hreflang="ja"/);
    assert.match(source, /hreflang="x-default"/);
  }
});

test('homepages list essay 41 first in their matching language', () => {
  assert.match(englishHome, /id="essay41" href="\/essays\/why-income-statistics-feel-wrong-en\.html"/);
  assert.match(japaneseHome, /id="essay41" href="\.\.\/essays\/why-income-statistics-feel-wrong-jp\.html"/);
  assert.ok(englishHome.indexOf('id="essay41"') < englishHome.indexOf('id="essay40"'));
  assert.ok(japaneseHome.indexOf('id="essay41"') < japaneseHome.indexOf('id="essay40"'));
});

test('sitemap includes both localized essay URLs and alternates', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/why-income-statistics-feel-wrong-en\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/essays\/why-income-statistics-feel-wrong-jp\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/essays\/why-income-statistics-feel-wrong-en\.html"/);
});
