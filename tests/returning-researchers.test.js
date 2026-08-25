const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const englishPage = fs.readFileSync(new URL('../returning-researchers.html', `file://${__filename}`), 'utf8');
const japanesePage = fs.readFileSync(new URL('../jp/returning-researchers.html', `file://${__filename}`), 'utf8');
const css = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');
const researchPath = fs.readFileSync(new URL('../scripts/research-path.js', `file://${__filename}`), 'utf8');

for (const [language, source] of [['English', english], ['Japanese', japanese]]) {
  test(`${language} homepage links to the separate returning-researchers page`, () => {
    assert.match(source, /href="returning-researchers\.html"/);
    assert.match(source, /id="returning-researchers"[^>]*hidden/);
    assert.match(source, /class="returning-grid"/);
  });

  test(`${language} returning-researchers section exposes verified routes`, () => {
    assert.match(source, /https:\/\/doi\.org\/10\.5281\/zenodo\.22036921/);
    assert.match(source, /https:\/\/doi\.org\/10\.5281\/zenodo\.21897171/);
    assert.match(source, /https:\/\/doi\.org\/10\.5281\/zenodo\.21522012/);
    assert.match(source, /href="#cosmology-modeling"/);
    assert.match(source, /href="#cosmology-observational"/);
    assert.match(source, /mailto:matsuoka-gpt@technocratnet\.jp\?subject=/);
  });

  test(`${language} uses unique pathway targets`, () => {
    assert.equal((source.match(/id="returning-researchers"/g) || []).length, 1);
    assert.equal((source.match(/id="cosmology-modeling"/g) || []).length, 1);
    assert.equal((source.match(/id="cosmology-observational"/g) || []).length, 1);
  });

  test(`${language} loads the research-path behavior`, () => {
    assert.match(source, /scripts\/research-path\.js/);
  });
}

for (const [language, source] of [['English', englishPage], ['Japanese', japanesePage]]) {
  test(`${language} separate page contains the returning researcher content`, () => {
    assert.match(source, /id="returning-researchers-title"/);
    assert.match(source, /zenodo\.22036921/);
    assert.match(source, /#cosmology-modeling/);
    assert.match(source, /mailto:matsuoka-gpt@technocratnet\.jp/);
  });
}

test('returning-researchers layout includes desktop, tablet, mobile, and dark-theme styles', () => {
  assert.match(css, /\.returning-grid\s*\{[^}]*grid-template-columns:1\.05fr 1fr \.9fr/s);
  assert.match(css, /@media \(max-width:900px\)/);
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /\[data-theme="dark"\] \.returning-researchers/);
});

test('research-path behavior opens its target and ancestor details', () => {
  assert.match(researchPath, /target instanceof HTMLDetailsElement/);
  assert.match(researchPath, /parent instanceof HTMLDetailsElement/);
  assert.match(researchPath, /a\[href\^="#"\]/);
});
