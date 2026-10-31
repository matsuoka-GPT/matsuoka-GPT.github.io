const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const doi = '10.5281/zenodo.23427988';
const doiUrl = `https://doi.org/${doi}`;

test('particle-generation paper links to its published Zenodo record in both languages', () => {
  for (const [file, title, oldTitle, editing] of [
    ['index.html', 'A Phase-Transition Model of Particle Generation Based on Dynamic Mass Flow', 'Phase Transition Model of Particle Emergence in Dual Mass Flow', '(In editing)'],
    ['jp/index.html', 'Dynamic Mass Flow 基底における粒子生成の相転移モデル', 'Dual Mass Flow基底における粒子生成の相転移モデル', '（編集中）'],
  ]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const entry = [...html.matchAll(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.23427988"[^>]*>[\s\S]*?<\/a><\/li>/g)]
      .map((match) => match[0])
      .find((candidate) => candidate.includes(title));
    assert.ok(entry, file);
    assert.ok(entry.includes(doiUrl));
    assert.ok(!entry.includes(editing));
    assert.ok(!html.includes(oldTitle));
  }
});

test('particle-generation paper is classified under BFSSU and DMF cosmology', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers[doi], 'Cosmology / BFSSU & DMF');
});

test('particle-generation paper remains in the latest returning-researcher records', () => {
  for (const file of ['returning-researchers.html', 'jp/returning-researchers.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const updates = html.match(/<ol class="returning-update-list">[\s\S]*?<\/ol>/)?.[0];
    const pathway = html.match(/<ol class="research-path-list">[\s\S]*?<\/ol>/)?.[0];
    assert.ok(updates, `${file} updates list`);
    assert.ok(pathway, `${file} pathway list`);
    assert.equal((updates.match(/<li>/g) || []).length, 3);
    assert.ok(updates.indexOf('zenodo.23826325') < updates.indexOf('zenodo.23427988'));
    assert.match(updates, /zenodo\.23427988/);
    assert.match(pathway, /zenodo\.23826325/);
  }
});
