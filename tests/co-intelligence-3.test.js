const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const englishHome = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japaneseHome = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const doiUrl = 'https://doi.org/10.5281/zenodo.22288840';

test('Co-Intelligence Version 3.0 links to its published Zenodo record in both languages', () => {
  assert.match(englishHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>Co-Intelligence Version 3\\.0`));
  assert.match(japaneseHome, new RegExp(`${doiUrl.replaceAll('.', '\\.') }[^>]*>協働知性 Version 3\\.0`));
});

test('Co-Intelligence Version 3.0 is no longer marked as in editing', () => {
  assert.doesNotMatch(englishHome, /Co-Intelligence 3\.0[\s\S]{0,200}\(In editing\)/);
  assert.doesNotMatch(japaneseHome, /協働知性 3\.0[\s\S]{0,200}（編集中）/);
});
