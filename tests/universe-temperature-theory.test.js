const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const doi = '10.5281/zenodo.23826325';
const doiUrl = `https://doi.org/${doi}`;

test('temperature theory links to its published Zenodo record in both languages', () => {
  for (const [file, title, editing] of [
    ['index.html', 'A Structural Theory of Temperature in the Universe', '(In editing)'],
    ['jp/index.html', '宇宙における温度の構造理論', '（編集中）'],
  ]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const entry = [...html.matchAll(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.23826325"[^>]*>[\s\S]*?<\/a><\/li>/g)]
      .map((match) => match[0])
      .find((candidate) => candidate.includes(title));
    assert.ok(entry, file);
    assert.ok(entry.includes(doiUrl));
    assert.ok(!entry.includes(editing));
  }
});

test('temperature theory is classified under BFSSU and DMF cosmology', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers[doi], 'Cosmology / BFSSU & DMF');
});

test('temperature theory is the latest returning-researcher route', () => {
  for (const file of ['index.html', 'jp/index.html', 'returning-researchers.html', 'jp/returning-researchers.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const updates = html.match(/<ol class="returning-update-list">[\s\S]*?<\/ol>/)?.[0];
    const pathway = html.match(/<ol class="research-path-list">[\s\S]*?<\/ol>/)?.[0];
    assert.ok(updates, `${file} updates list`);
    assert.ok(pathway, `${file} pathway list`);
    assert.equal((updates.match(/<li>/g) || []).length, 3);
    assert.ok(updates.indexOf('zenodo.23826325') < updates.indexOf('zenodo.23427988'));
    assert.match(pathway, /zenodo\.23826325/);
  }
});
