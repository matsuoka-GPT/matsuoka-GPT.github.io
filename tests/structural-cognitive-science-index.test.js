const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const pages = [
  {
    file: 'index.html',
    category: 'Cognitive Science / Structural Cognition Models',
    first: 'Introduction to Structural Cognitive Science 0.0',
    second: 'Structural Cognitive Science 1.0',
    removed: 'Matsuoka x GPT Thought Experiment Lab 3.0',
    editing: '(In editing)',
  },
  {
    file: path.join('jp', 'index.html'),
    category: '認知科学 / 構造的認知モデル',
    first: '構造認知科学序説 0.0',
    second: '構造認知科学 1.0',
    removed: '松岡×GPT思考実験ラボ 3.0',
    editing: '（編集中）',
  },
];

for (const page of pages) {
  test(`${page.file} updates the structural cognitive science index`, () => {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    const categoryStart = html.indexOf(`<summary>${page.category}</summary>`);
    const categoryEnd = html.indexOf('</details>', categoryStart);
    const category = html.slice(categoryStart, categoryEnd);

    assert.ok(categoryStart >= 0);
    assert.ok(category.includes(page.first));
    assert.ok(category.includes(page.second));
    assert.ok(category.indexOf(page.first) < category.indexOf(page.second));
    assert.match(category, new RegExp(`<li><a href="https://doi\\.org/10\\.5281/zenodo\\.24122995" target="_blank">${page.first}`));
    assert.ok(!category.slice(category.indexOf(page.first), category.indexOf('</li>', category.indexOf(page.first))).includes(page.editing));
    assert.ok(!html.includes(page.removed));
  });
}

test('published structural cognitive science paper is classified and collected', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'data', 'zenodo', 'paper_categories.json'), 'utf8'));
  const records = JSON.parse(fs.readFileSync(path.join(root, 'data', 'zenodo', 'zenodo_records.json'), 'utf8'));
  const record = records.records.find((item) => item.doi === '10.5281/zenodo.24122995');

  assert.equal(categories.papers['10.5281/zenodo.24122995'], 'Cognitive Science / Structural Cognition');
  assert.ok(record);
  assert.equal(record.category, 'Cognitive Science / Structural Cognition');
  assert.equal(record.publication_date, '2026-11-11');
});
