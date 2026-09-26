const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const doiUrl = 'https://doi.org/10.5281/zenodo.22976862';

test('cosmic mass circulation paper links to Zenodo in both languages', () => {
  for (const [file, title, editing] of [
    ['index.html', 'BFSSU/DMF Cosmic Mass Circulation Model', '(In editing)'],
    ['jp/index.html', 'BFSSU/DMF宇宙の質量循環モデル', '（編集中）'],
  ]) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const entry = [...html.matchAll(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.22976862"[^>]*>[\s\S]*?<\/a><\/li>/g)]
      .map((match) => match[0])
      .find((candidate) => candidate.includes(title));
    assert.ok(entry, file);
    assert.ok(entry.includes(title));
    assert.ok(entry.includes(doiUrl));
    assert.ok(!entry.includes(editing));
  }
});

test('cosmic mass circulation paper is classified under BFSSU and DMF cosmology', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers['10.5281/zenodo.22976862'], 'Cosmology / BFSSU & DMF');
});
