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
    { kind: 'conceptual', papers: 20 },
    { kind: 'modeling', papers: 9 },
    { kind: 'observational', papers: 6 },
  ];

  assert.deepEqual(cosmologyGroups('index.html'), expected);
  assert.deepEqual(cosmologyGroups('jp/index.html'), expected);
});
