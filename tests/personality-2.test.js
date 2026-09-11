const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const categories = JSON.parse(fs.readFileSync(new URL('../data/zenodo/paper_categories.json', `file://${__filename}`), 'utf8'));
const doiUrl = 'https://doi.org/10.5281/zenodo.22699226';

test('Personality 2.0 links to its published Zenodo record in both languages', () => {
  assert.match(englishHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>What Is Personality\\? 2\\.0`));
  assert.match(japaneseHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>人格とは何か 2\\.0`));
});

test('Personality 2.0 is no longer marked as in editing', () => {
  const englishEntry = englishHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22699226"[\s\S]*?<\/a><\/li>/)?.[0];
  const japaneseEntry = japaneseHome.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22699226"[\s\S]*?<\/a><\/li>/)?.[0];

  assert.ok(englishEntry);
  assert.ok(japaneseEntry);
  assert.doesNotMatch(englishEntry, /\(In editing\)/);
  assert.doesNotMatch(japaneseEntry, /（編集中）/);
});

test('Personality 2.0 is classified as a structural thought experiment', () => {
  assert.equal(categories.papers['10.5281/zenodo.22699226'], 'Thought Experiments / Structural Theory');
});
