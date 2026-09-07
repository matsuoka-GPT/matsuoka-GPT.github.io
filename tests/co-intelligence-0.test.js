const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const doiUrl = 'https://doi.org/10.5281/zenodo.22651149';

test('Co-Intelligence Version 0.0 links to its published Zenodo record in both languages', () => {
  assert.match(englishHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>Co-Intelligence Version 0\\.0`));
  assert.match(japaneseHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>協働知性 Version 0\\.0`));
});

test('Co-Intelligence Version 0.0 is no longer marked as in editing', () => {
  const englishEntry = englishHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22651149"[\s\S]*?<\/a><\/li>/)?.[0];
  const japaneseEntry = japaneseHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22651149"[\s\S]*?<\/a><\/li>/)?.[0];

  assert.ok(englishEntry);
  assert.ok(japaneseEntry);
  assert.doesNotMatch(englishEntry, /\(In editing\)/);
  assert.doesNotMatch(japaneseEntry, /（編集中）/);
});
