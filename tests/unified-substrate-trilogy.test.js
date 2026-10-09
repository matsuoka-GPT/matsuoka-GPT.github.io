const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function extractSection(html, startClass, endClass) {
  const start = html.indexOf(startClass);
  const end = html.indexOf(endClass, start + startClass.length);
  assert.notEqual(start, -1, `${startClass} section must exist`);
  assert.notEqual(end, -1, `${endClass} section must follow ${startClass}`);
  return html.slice(start, end);
}

const pages = [
  {
    file: 'index.html',
    labels: [
      'Unified Substrate Theory Trilogy I',
      'Unified Substrate Theory Trilogy II',
      'Unified Substrate Theory Trilogy III',
    ],
    titles: [
      'Invariance of the Speed of Light and the Relativistic Speed Limit in the BFSSU/DMF Substrate',
      'Emergence of Relativistic Spacetime Structure from the DMF Substrate',
      'BFSSU/DMF Unified Substrate Theory',
    ],
    status: '(In Preparation)',
  },
  {
    file: path.join('jp', 'index.html'),
    labels: ['統一基底論三部作 I', '統一基底論三部作 II', '統一基底論三部作 III'],
    titles: [
      'BFSSU/DMF基底における光速度不変性と相対論的速度限界',
      'DMF基底からの相対論的時空構造の創発',
      'BFSSU/DMF統一基底論',
    ],
    status: '（編集中）',
  },
];

for (const page of pages) {
  test(`${page.file} indexes the trilogy in the requested categories`, () => {
    const html = readPage(page.file);
    const conceptual = extractSection(html, 'cosmos-study--conceptual', 'cosmos-study--modeling');
    const modeling = extractSection(html, 'cosmos-study--modeling', 'cosmos-study--observational');

    assert.ok(conceptual.includes(page.labels[0]));
    assert.ok(modeling.includes(page.labels[1]));
    assert.ok(conceptual.includes(page.labels[2]));
    assert.ok(!conceptual.includes(page.labels[1]));
    assert.ok(!modeling.includes(page.labels[0]));
    assert.ok(!modeling.includes(page.labels[2]));

    for (let index = 0; index < page.labels.length; index += 1) {
      assert.equal(html.split(`<strong>${page.labels[index]}</strong>`).length - 1, 1);
      assert.ok(html.includes(page.titles[index]));
    }
    assert.equal(html.split(page.status).length - 1 >= 3, true);
  });
}
