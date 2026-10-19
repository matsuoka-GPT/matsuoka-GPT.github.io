const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const pages = [
  {
    file: 'index.html',
    category: 'Cognitive Science / Structural Cognition Models',
    first: 'Introduction to Structural Cognitive Science',
    second: 'Structural Cognitive Science 1.0',
    removed: 'Matsuoka x GPT Thought Experiment Lab 3.0',
  },
  {
    file: path.join('jp', 'index.html'),
    category: '認知科学 / 構造的認知モデル',
    first: '構造認知科学序説',
    second: '構造認知科学 1.0',
    removed: '松岡×GPT思考実験ラボ 3.0',
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
    assert.match(category, new RegExp(`<li><a href="#outputs">${page.first}`));
    assert.ok(!html.includes(page.removed));
  });
}
