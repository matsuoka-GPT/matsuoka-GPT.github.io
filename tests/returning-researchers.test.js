const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const english = fs.readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../jp/index.html', `file://${__filename}`), 'utf8');
const englishPage = fs.readFileSync(new URL('../returning-researchers.html', `file://${__filename}`), 'utf8');
const japanesePage = fs.readFileSync(new URL('../jp/returning-researchers.html', `file://${__filename}`), 'utf8');
const css = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');
const researchPath = fs.readFileSync(new URL('../scripts/research-path.js', `file://${__filename}`), 'utf8');
const sitemap = fs.readFileSync(new URL('../sitemap.xml', `file://${__filename}`), 'utf8');

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

test('labels describe the currently cosmology-specific pathway', () => {
  assert.match(english, /Continue Exploring Cosmology/);
  assert.match(englishPage, /Continue Exploring Cosmology/);
  assert.match(japanese, /継続して宇宙論を読む方へ/);
  assert.match(japanesePage, /継続して宇宙論を読む方へ/);
});

test('sitemap contains reciprocal English and Japanese returning-researcher URLs', () => {
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/returning-researchers\.html<\/loc>/g) || []).length, 1);
  assert.equal((sitemap.match(/<loc>https:\/\/matsuoka-gpt\.github\.io\/jp\/returning-researchers\.html<\/loc>/g) || []).length, 1);
  assert.match(sitemap, /hreflang="x-default" href="https:\/\/matsuoka-gpt\.github\.io\/returning-researchers\.html"/);
});

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

test('both languages include the independent collapsible research message after the primary routes', () => {
  for (const [language, source, heading, note] of [
    ['English', englishPage, 'Research Message from the Lab', 'This research message is updated periodically as the project develops.'],
    ['Japanese', japanesePage, 'ラボからの研究メッセージ', '本メッセージは研究の進展に応じて不定期に更新します。']
  ]) {
    assert.match(source, new RegExp(heading));
    assert.match(source, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(source, /<details class="research-message">/);
    assert.ok(source.indexOf('returning-grid') < source.indexOf('research-message-section'), `${language} message follows the primary routes`);
  }
});

test('the first research message is a dated permanent record in both languages', () => {
  for (const [language, source, title, date] of [
    ['English', englishPage, 'From Conceptual Development to Mathematical Formulation and Observational Testability', 'August 2026'],
    ['Japanese', japanesePage, '概念形成から数理化・観測可能性へ', '2026年8月']
  ]) {
    assert.match(source, /Research Message No\. 1/);
    assert.match(source, new RegExp(title));
    assert.match(source, new RegExp(date));
    assert.match(source, /<time datetime="2026-08">/);
    assert.match(source, /official record published in August 2026|2026年8月公開時点の公式記録/);
    assert.ok(source.indexOf('research-message-meta') < source.indexOf('research-message-body'), `${language} metadata precedes the archived message body`);
  }
});

test('research message styles cover dark theme and phone layout', () => {
  assert.match(css, /\[data-theme="dark"\] \.research-message/);
  assert.match(css, /\.research-message-body/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.research-message > summary/);
});
