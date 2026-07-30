const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/research-orientation-hint.js', `file://${__filename}`), 'utf8');
const styles = fs.readFileSync(new URL('../styles/home.css', `file://${__filename}`), 'utf8');
const pages = ['../index.html', '../jp/index.html'].map(path =>
  fs.readFileSync(new URL(path, `file://${__filename}`), 'utf8')
);

function classList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name)
  };
}

function loadHint({ seen = false, reducedMotion = false } = {}) {
  const documentListeners = {};
  const windowListeners = {};
  const timers = [];
  const stored = new Map(seen ? [['researchOrientationHintSeen', 'true']] : []);
  const entry = { classList: classList() };
  const hint = {
    id: 'research-orientation-hint', hidden: true, classList: classList(),
    closest: () => entry
  };
  const attributes = new Map();
  const link = {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name)
  };
  const document = {
    getElementById: () => hint,
    querySelector: () => link,
    addEventListener(type, listener) { documentListeners[type] = listener; },
    removeEventListener(type) { delete documentListeners[type]; }
  };
  const window = {
    sessionStorage: {
      getItem: key => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value)
    },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: callback => { timers.push(callback); },
    requestAnimationFrame: callback => callback(),
    addEventListener(type, listener) { windowListeners[type] = listener; },
    removeEventListener(type) { delete windowListeners[type]; }
  };

  vm.runInNewContext(source, { window, document, Set });
  documentListeners.DOMContentLoaded();
  return { attributes, documentListeners, entry, hint, stored, timers, windowListeners };
}

test('both homepages provide the localized accessible hint beside the unchanged destination', () => {
  for (const page of pages) {
    assert.match(page, /id="research-orientation-hint"/);
    assert.match(page, /role="note"/);
    assert.match(page, /class="orientation-link" href="research-orientation\.html"/);
    assert.match(page, /research-orientation-hint\.js/);
  }
  assert.match(pages[0], /<span class="first-visit-hint">\s*First-time visitor\? Start here\.\s*<span class="hint-pointer" aria-hidden="true">👇<\/span>\s*<\/span>/);
  assert.match(pages[1], /<span class="first-visit-hint">\s*初めての方はこちらから。<span class="hint-pointer" aria-hidden="true">👇<\/span>\s*<\/span>/);
});

test('Twemoji can replace the pointer glyph without replacing its animated wrapper', () => {
  const twemojiRendered = pages[0].replace(
    '👇',
    '<img class="emoji" src="images/twemoji/1f447.svg" alt="">'
  );

  assert.match(twemojiRendered, /<span class="hint-pointer" aria-hidden="true">\s*<img class="emoji"[^>]* alt="">\s*<\/span>/);
});

test('the first visit appears after a delay and a page click dismisses and records it', () => {
  const state = loadHint();
  assert.equal(state.hint.hidden, true);
  assert.equal(state.timers.length, 1);

  state.timers.shift()();
  assert.equal(state.hint.hidden, false);
  assert.equal(state.hint.classList.contains('is-visible'), true);
  assert.equal(state.attributes.get('aria-describedby'), 'research-orientation-hint');

  state.documentListeners.click({});
  assert.equal(state.stored.get('researchOrientationHintSeen'), 'true');
  state.timers.shift()();
  assert.equal(state.hint.hidden, true);
  assert.equal(state.attributes.has('aria-describedby'), false);
});

test('seen sessions skip the hint and reduced motion dismisses without a timer', () => {
  assert.equal(loadHint({ seen: true }).timers.length, 0);

  const state = loadHint({ reducedMotion: true });
  state.timers.shift()();
  state.windowListeners.scroll();
  assert.equal(state.hint.hidden, true);
  assert.equal(state.timers.length, 0);
});

test('keyboard navigation dismisses while unrelated typing does not', () => {
  const state = loadHint();
  state.timers.shift()();
  state.documentListeners.keydown({ key: 'a' });
  assert.equal(state.stored.has('researchOrientationHintSeen'), false);
  state.documentListeners.keydown({ key: 'Tab' });
  assert.equal(state.stored.get('researchOrientationHintSeen'), 'true');
});

test('hint styling includes dark, mobile, and reduced-motion treatments', () => {
  assert.match(styles, /\[data-theme="dark"\] \.orientation-hint/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*\.orientation-entry\.hint-active/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.orientation-hint/);
  assert.match(styles, /\.hint-pointer\s*{\s*display:inline-block;\s*will-change:transform;\s*animation:hint-pointer-bounce \.65s ease-in-out \.4s 3;/);
  assert.match(styles, /@keyframes hint-pointer-bounce[\s\S]*translateY\(4px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.hint-pointer\s*{\s*animation: none;/);
});
