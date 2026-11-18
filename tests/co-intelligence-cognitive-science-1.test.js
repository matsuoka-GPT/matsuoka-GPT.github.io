const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const english = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const japanese = fs.readFileSync(path.join(root, 'jp', 'index.html'), 'utf8');
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data', 'zenodo', 'paper_categories.json'), 'utf8'));
const records = JSON.parse(fs.readFileSync(path.join(root, 'data', 'zenodo', 'zenodo_records.json'), 'utf8'));

test('published Co-Intelligence Cognitive Science 1.0 links to its Zenodo DOI in both languages', () => {
  assert.match(
    english,
    /href="https:\/\/doi\.org\/10\.5281\/zenodo\.24328446" target="_blank">Cognitive Science of Co-Intelligence 1\.0/
  );
  assert.match(
    japanese,
    /href="https:\/\/doi\.org\/10\.5281\/zenodo\.24328446" target="_blank">協働知性認知科学 1\.0/
  );
});

test('published cards no longer show an editing status', () => {
  const englishCard = english.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.24328446"[\s\S]*?<\/a><\/li>/)?.[0] ?? '';
  const japaneseCard = japanese.match(/<li><a href="https:\/\/doi\.org\/10\.5281\/zenodo\.24328446"[\s\S]*?<\/a><\/li>/)?.[0] ?? '';

  assert.doesNotMatch(englishCard, /In editing|In Preparation/);
  assert.doesNotMatch(japaneseCard, /編集中/);
});

test('Zenodo data keeps the paper in its existing website category', () => {
  assert.equal(
    categories.papers['10.5281/zenodo.24328446'],
    'Social Design / Institutional Structures'
  );

  const record = records.records.find((entry) => entry.doi === '10.5281/zenodo.24328446');
  assert.ok(record, 'published record should be present in generated Zenodo data');
  assert.equal(record.category, 'Social Design / Institutional Structures');
  assert.equal(record.publication_date, '2026-11-18');
});
