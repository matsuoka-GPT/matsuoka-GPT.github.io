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
    conceptualLabel: 'DMF Substrate Approach to Quantum Entanglement — Two-Part Series I',
    mathematicalLabel: 'DMF Substrate Approach to Quantum Entanglement — Two-Part Series II',
    conceptualTitle: 'Ontological Reinterpretation of Quantum Entanglement through the DMF Substrate',
    mathematicalTitle: 'Mathematical Model of Nonseparable Correlations within a Single DMF Substrate',
    status: '(In Preparation)',
  },
  {
    file: path.join('jp', 'index.html'),
    conceptualLabel: '量子もつれDMF基底論 二部作 I',
    mathematicalLabel: '量子もつれDMF基底論 二部作 II',
    conceptualTitle: '量子もつれのDMF基底による存在論的再解釈',
    mathematicalTitle: '単一DMF基底における非分離的相関の数理モデル',
    status: '（編集中）',
  },
];

for (const page of pages) {
  test(`${page.file} indexes the quantum-entanglement series in the requested categories`, () => {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    const conceptual = extractSection(html, 'cosmos-study--conceptual', 'cosmos-study--modeling');
    const modeling = extractSection(html, 'cosmos-study--modeling', 'cosmos-study--observational');

    assert.ok(conceptual.includes(`<strong>${page.conceptualLabel}</strong>`));
    assert.ok(conceptual.includes(page.conceptualTitle));
    assert.ok(!conceptual.includes(page.mathematicalLabel));
    assert.ok(modeling.includes(`<strong>${page.mathematicalLabel}</strong>`));
    assert.ok(modeling.includes(page.mathematicalTitle));
    assert.ok(!modeling.includes(page.conceptualLabel));
    assert.equal(html.split(`<strong>${page.conceptualLabel}</strong>`).length - 1, 1);
    assert.equal(html.split(`<strong>${page.mathematicalLabel}</strong>`).length - 1, 1);
    assert.ok(conceptual.includes(page.status));
    assert.ok(modeling.includes(page.status));
  });
}
