const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const viewerDirectory = path.join(__dirname, '..', 'viewer');
const viewerFiles = fs.readdirSync(viewerDirectory)
  .filter(file => file.endsWith('.html'));

test('every Structure Art Viewer is permanently dark and has no theme switcher', () => {
  assert.ok(viewerFiles.length > 0, 'at least one viewer page must exist');

  for (const file of viewerFiles) {
    const html = fs.readFileSync(path.join(viewerDirectory, file), 'utf8');

    assert.match(
      html,
      /<meta\s+name=["']color-scheme["']\s+content=["']dark["']\s*\/?\s*>/i,
      `${file} must declare a dark-only browser color scheme`
    );
    assert.match(
      html,
      /:root\s*\{[^}]*color-scheme:\s*dark\s*;/s,
      `${file} must render native controls in dark mode`
    );
    assert.doesNotMatch(html, /scripts\/theme\.js/i, `${file} must not load the theme switcher`);
    assert.doesNotMatch(html, /styles\/theme\.css/i, `${file} must not load switchable theme styles`);
    assert.doesNotMatch(html, /class=["'][^"']*theme-toggle/i, `${file} must not contain a theme button`);
  }
});
