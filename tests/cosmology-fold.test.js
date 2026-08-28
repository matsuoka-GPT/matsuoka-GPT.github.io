const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function cosmologyGroups(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const viewer = source.indexOf('viewer/Structure Art Viewer-cosmic-phase.html');
  const start = source.lastIndexOf('<!--', viewer);
  const end = source.indexOf('<!--', viewer);
  const block = source.slice(start, end);

  return [...block.matchAll(/<details class="cosmos-study cosmos-study--([^"]+)">([\s\S]*?)<\/details>/g)]
    .map((match) => ({
      kind: match[1],
      papers: [...match[2].matchAll(/<li>[\s\S]*?<\/li>/g)].length,
    }));
}

test('English and Japanese Cosmology outputs use the same two-level classification', () => {
  const expected = [
    { kind: 'conceptual', papers: 22 },
    { kind: 'modeling', papers: 15 },
    { kind: 'observational', papers: 6 },
  ];

  assert.deepEqual(cosmologyGroups('index.html'), expected);
  assert.deepEqual(cosmologyGroups('jp/index.html'), expected);
});

test('the unpublished Cosmology series papers are non-linked drafts in both languages', () => {
  const expectedTitles = {
    'index.html': [
      'The Grand Circulation Hypothesis in BFSSU/DMF Cosmology',
      'A Unified Interpretation of Stellar Evolution through DMF–Matter Positive Feedback',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part I: Foundations of DMF Kinematics',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part II: DMF Conservation Laws and Open-System Flow',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part III: DMF Gravitational Response and Equations of Motion',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part IV: DMF Linear Perturbations and Gravitational Instability',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part V: DMF Nonlinear Growth and Local Structure Formation',
      'BFSSU/DMF Dynamics and Gravitational Theory, Part VI: DMF Density Structures and Newtonian Gravity',
    ],
    'jp/index.html': [
      'BFSSU/DMF宇宙論における大循環仮説',
      'DMF–物質正帰還による恒星進化の統一的解釈',
      'BFSSU/DMF動力学・重力理論 第1部　DMF運動学の基礎',
      'BFSSU/DMF動力学・重力理論 第2部　DMF保存則と開放系流動',
      'BFSSU/DMF動力学・重力理論 第3部　DMF重力応答と運動方程式',
      'BFSSU/DMF動力学・重力理論 第4部　DMF線形摂動と重力不安定性',
      'BFSSU/DMF動力学・重力理論 第5部　DMF非線形成長と局所構造形成',
      'BFSSU/DMF動力学・重力理論 第6部　DMF密度構造とニュートン重力',
    ],
  };

  for (const [file, titles] of Object.entries(expectedTitles)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const title of titles) {
      const start = source.indexOf(`<li><span class="output-draft">${title}`);
      assert.notEqual(start, -1, `${title} should be rendered as a non-linked draft`);
      const end = source.indexOf('</li>', start);
      const entry = source.slice(start, end);
      assert.doesNotMatch(entry, /<a\b|href=/);
      assert.match(entry, file === 'index.html' ? /\(In editing\)/ : /（編集中）/);
    }
  }
});

test('the maximum cosmic scale paper links to its published Zenodo record', () => {
  const titles = {
    'index.html': 'The Determination Principle of the Maximum Cosmic Scale in Hierarchical Universes',
    'jp/index.html': '階層宇宙における最大スケールの決定原理',
  };

  for (const [file, title] of Object.entries(titles)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const start = source.indexOf(`<li><a href="https://doi.org/10.5281/zenodo.22036921" target="_blank">${title}`);
    assert.notEqual(start, -1, `${title} should link to the published Zenodo record`);
    const end = source.indexOf('</li>', start);
    assert.doesNotMatch(source.slice(start, end), /In editing|編集中/);
  }
});

test('the maximum cosmic scale paper has an explicit dashboard category', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers['10.5281/zenodo.22036921'], 'Cosmology / BFSSU & DMF');
});

test('the energy discrepancy index paper links to its published Zenodo record', () => {
  const titles = {
    'index.html': 'Introduction of the Energy Discrepancy Index χ in a Hierarchical Universe and Multi-Scale Verification',
    'jp/index.html': '階層宇宙におけるエネルギー不整合指標 χ の導入と多スケール検証',
  };

  for (const [file, title] of Object.entries(titles)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const start = source.indexOf(`<li><a href="https://doi.org/10.5281/zenodo.22135767" target="_blank">${title}`);
    assert.notEqual(start, -1, `${title} should link to the published Zenodo record`);
    const end = source.indexOf('</li>', start);
    assert.doesNotMatch(source.slice(start, end), /In editing|編集中/);
  }
});

test('the energy discrepancy index paper has an explicit dashboard category', () => {
  const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/zenodo/paper_categories.json'), 'utf8'));
  assert.equal(categories.papers['10.5281/zenodo.22135767'], 'Cosmology / BFSSU & DMF');
});
