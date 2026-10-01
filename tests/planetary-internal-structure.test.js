const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const doiUrl = 'https://doi.org/10.5281/zenodo.23092225';

test('planetary internal structure paper links to Zenodo in both languages', () => {
  for (const [file, title, editing] of [
    ['index.html', 'Reinterpreting Planetary Internal Structure in the DMF Cosmology', '(In editing)'],
    ['jp/index.html', 'DMF宇宙論に基づく惑星内部構造の再解釈', '（編集中）'],
  ]) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const entry = [...html.matchAll(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.23092225"[^>]*>[\s\S]*?<\/a><\/li>/g)]
      .map((match) => match[0])
      .find((candidate) => candidate.includes(title));
    assert.ok(entry, file);
    assert.ok(entry.includes(doiUrl));
    assert.ok(!entry.includes(editing));
  }
});

test('planetary internal structure paper is classified under BFSSU and DMF cosmology', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers['10.5281/zenodo.23092225'], 'Cosmology / BFSSU & DMF');
});

test('planetary internal structure paper is the latest returning-researcher route', () => {
  for (const file of ['returning-researchers.html', 'jp/returning-researchers.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const updates = html.match(/<ol class="returning-update-list">[\s\S]*?<\/ol>/)?.[0];
    const pathway = html.match(/<ol class="research-path-list">[\s\S]*?<\/ol>/)?.[0];
    assert.ok(updates, `${file} updates list`);
    assert.ok(pathway, `${file} pathway list`);
    assert.equal((updates.match(/<li>/g) || []).length, 3);
    assert.ok(updates.indexOf('zenodo.23092225') < updates.indexOf('zenodo.22976862'));
    assert.match(pathway, /zenodo\.23092225/);
  }
});
