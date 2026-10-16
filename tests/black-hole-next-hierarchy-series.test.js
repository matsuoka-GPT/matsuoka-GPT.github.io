const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

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
    series: 'Black Holes and Next-Hierarchical Spacetime Formation in BFSSU/DMF Cosmology: A Two-Paper Series',
    paperI: 'Paper I',
    paperII: 'Paper II',
    titleI: 'Reinterpreting the Event Horizon in BFSSU/DMF Cosmology:',
    titleII: 'A Mathematical Model of DMF Redistribution inside Black Holes and the Growth of Next-Hierarchical Spacetime:',
    status: '(In Preparation)',
  },
  {
    file: path.join('jp', 'index.html'),
    series: 'BFSSU/DMF宇宙論におけるブラックホールと次階層時空形成 ― 二部作',
    paperI: '第I論文',
    paperII: '第II論文',
    titleI: 'BFSSU/DMF宇宙論における事象の地平線の再解釈',
    titleII: 'ブラックホール内部におけるDMF再配置と次階層時空成長の数理モデル',
    status: '（編集中）',
  },
];

for (const page of pages) {
  test(`${page.file} indexes both papers independently in the requested categories`, () => {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    const conceptual = extractSection(html, 'cosmos-study--conceptual', 'cosmos-study--modeling');
    const modeling = extractSection(html, 'cosmos-study--modeling', 'cosmos-study--observational');

    assert.ok(conceptual.includes(`<strong>${page.series}</strong>`));
    assert.ok(conceptual.includes(`<strong>${page.paperI}</strong>`));
    assert.ok(conceptual.includes(page.titleI));
    assert.ok(!conceptual.includes(`<strong>${page.paperII}</strong>`));
    assert.ok(modeling.includes(`<strong>${page.series}</strong>`));
    assert.ok(modeling.includes(`<strong>${page.paperII}</strong>`));
    assert.ok(modeling.includes(page.titleII));
    assert.ok(!modeling.includes(`<strong>${page.paperI}</strong>`));
    assert.equal(html.split(`<strong>${page.series}</strong>`).length - 1, 2);
    assert.ok(conceptual.includes(page.status));
    assert.ok(modeling.includes(page.status));
  });
}
