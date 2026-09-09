const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const doiUrl = 'https://doi.org/10.5281/zenodo.22670067';

test('The Structure of Foolish Acts links to its published Zenodo record in both languages', () => {
  assert.match(englishHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>The Structure of Foolish Acts`));
  assert.match(japaneseHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>愚行の正体`));
});

test('The Structure of Foolish Acts is no longer marked as in editing', () => {
  const englishEntry = englishHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22670067"[\s\S]*?<\/a><\/li>/)?.[0];
  const japaneseEntry = japaneseHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22670067"[\s\S]*?<\/a><\/li>/)?.[0];

  assert.ok(englishEntry);
  assert.ok(japaneseEntry);
  assert.doesNotMatch(englishEntry, /\(In editing\)/);
  assert.doesNotMatch(japaneseEntry, /（編集中）/);
});
