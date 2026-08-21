const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('all output titles use link or draft title elements in both languages', () => {
  for (const file of ['index.html', 'jp/index.html']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const start = source.indexOf('<section id="outputs"');
    const end = source.indexOf('<section id="collab"', start);
    const outputs = source.slice(start, end);
    const entries = [...outputs.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match => match[1].trim());

    assert.ok(entries.length > 0, `${file} should contain output titles`);
    for (const entry of entries) {
      assert.match(entry, /^(?:<a\b|<span class="output-draft">)/);
    }
  }
});

test('dark mode gives linked and non-linked output titles the same light blue', () => {
  const css = fs.readFileSync(path.join(root, 'styles/theme.css'), 'utf8');
  assert.match(css, /\[data-theme="dark"\] a\s*{\s*color:\s*var\(--link-color\)\s*!important;/);
  assert.match(css, /\[data-theme="dark"\] \.outputs-grid \.output-draft\s*{\s*color:\s*var\(--link-color\)\s*!important;/);
  assert.match(css, /--link-color:\s*#6ea8fe;/);
});
