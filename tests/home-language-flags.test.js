const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const expectedFlags = [
  '1f1ef-1f1f5',
  '1f1fa-1f1f8',
  '1f1ec-1f1e7',
  '1f1e8-1f1f3',
  '1f1f0-1f1f7',
  '1f1eb-1f1f7',
  '1f1e9-1f1ea',
  '1f1ea-1f1f8',
  '1f1f5-1f1f9'
];

test('homepages render every supported-language flag with local Twemoji assets', () => {
  for (const [file, prefix] of [['index.html', ''], ['jp/index.html', '../']]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const languageFlags = html.match(/<span id="language-flags"[\s\S]*?<\/span><\/span>/)?.[0];

    assert.ok(languageFlags, `${file} has a language flag group`);
    assert.equal((languageFlags.match(/<img /g) || []).length, expectedFlags.length);
    assert.equal((languageFlags.match(/class="emoji"/g) || []).length, expectedFlags.length);
    assert.equal((languageFlags.match(/alt="\p{Regional_Indicator}{2}"/gu) || []).length, expectedFlags.length);

    for (const flag of expectedFlags) {
      const relativeAsset = `${prefix}images/twemoji/${flag}.svg`;
      assert.match(languageFlags, new RegExp(`src="${relativeAsset}"`));
      assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(root, file)), relativeAsset)));
    }
  }
});
