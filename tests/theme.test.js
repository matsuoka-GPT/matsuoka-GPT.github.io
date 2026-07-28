const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/theme.js', `file://${__filename}`), 'utf8');

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function loadTheme(userAgent, platform = 'iPhone', maxTouchPoints = 5, session = storage()) {
  let click;
  let reloads = 0;
  const toggle = {
    dataset: {}, className: '', setAttribute() {},
    addEventListener(type, listener) { if (type === 'click') click = listener; }
  };
  const classList = { add() {}, remove() {} };
  const root = { dataset: {}, classList, offsetWidth: 0 };
  const local = storage();
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame: callback => { callback(); return 1; },
    cancelAnimationFrame() {}, addEventListener() {},
    location: { reload() { reloads += 1; } },
    scrollX: 12, scrollY: 34, scrollTo() {}
  };
  const document = {
    documentElement: root, readyState: 'complete',
    querySelector: () => toggle, createElement: () => toggle,
    body: { appendChild() {} }, dispatchEvent() {}
  };
  const context = {
    window, document, navigator: { userAgent, platform, maxTouchPoints },
    localStorage: local, sessionStorage: session,
    CustomEvent: function () {}
  };
  vm.runInNewContext(source, context);
  return { click, local, session, reloads: () => reloads };
}

test('reloads only iOS Safari after a direct toggle and persists first', () => {
  const safari = loadTheme('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1');
  assert.equal(safari.reloads(), 0, 'initial theme restoration must not reload');
  safari.click();
  assert.equal(safari.local.getItem('site-theme'), 'light');
  assert.equal(safari.reloads(), 1);

  for (const ua of [
    'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
  ]) {
    const browser = loadTheme(ua);
    browser.click();
    assert.equal(browser.reloads(), 0);
  }
});

test('session marker prevents a reload loop and is consumed on load', () => {
  const session = storage({
    'site-theme-ios-reload': JSON.stringify({ x: 12, y: 34 })
  });
  const safari = loadTheme(
    'Mozilla/5.0 (iPad) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    'iPad', 5, session
  );
  assert.equal(safari.reloads(), 0);
  assert.equal(session.getItem('site-theme-ios-reload'), null);
});
