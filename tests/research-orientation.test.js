const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/research-orientation.js', `file://${__filename}`), 'utf8');
const styles = fs.readFileSync(new URL('../styles/research-orientation.css', `file://${__filename}`), 'utf8');
const english = fs.readFileSync(new URL('../research-orientation.html', `file://${__filename}`), 'utf8');
const japanese = fs.readFileSync(new URL('../jp/research-orientation.html', `file://${__filename}`), 'utf8');

test('interactive steps share the same top edge while the no-script fallback remains spaced', () => {
  assert.match(styles, /\.tour-step \+ \.tour-step\s*\{\s*margin-top:\s*4rem;/);
  assert.match(styles, /\.tour-js \.tour-step\s*\{\s*margin-top:\s*0;/);
});

test('each language places one dynamic status beside the skip control', () => {
  for (const html of [english, japanese]) {
    assert.equal((html.match(/data-status/g) || []).length, 1);
    assert.equal((html.match(/class="step-label"/g) || []).length, 0);
    assert.match(html, /<div class="tour-exit">\s*<p data-status[^>]*>[^<]+<\/p>\s*<button class="skip"[^>]*data-skip>/);
  }
  assert.match(styles, /\.tour-exit\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.progress\s*\{[^}]*grid-column:\s*2;/);
});

function load(hash = '') {
  const listeners = {};
  const docListeners = {};
  const steps = ['welcome','hub','workflow','method','outputs','zenodo','assistant','explore'].map(id => {
    const heading = { focus() { heading.focused = true; } };
    const back = { disabled: false };
    return { id, hidden: false, querySelector: s => s === 'h2' ? heading : back, heading, back };
  });
  const dots = steps.map(() => ({ attrs: {}, setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];} }));
  const status = { textContent: '' };
  const tour = {
    dataset: { stepWord: 'Step', ofWord: 'of' },
    querySelectorAll: selector => selector === '[data-step]' ? steps : dots,
    querySelector: () => status,
    addEventListener(type, fn) { listeners[type] = fn; }
  };
  const location = { hash };
  const history = {
    pushState(a,b,value) { location.hash = value; },
    replaceState(a,b,value) { location.hash = value; }
  };
  const document = {
    documentElement: { classList: { add() {} } }, readyState: 'complete',
    querySelectorAll: () => [tour],
    addEventListener(type, fn) { docListeners[type] = fn; }
  };
  const window = { location, history, addEventListener(type, fn) { listeners[type] = fn; } };
  vm.runInNewContext(source, { document, window, Array });
  function target(action) {
    return { closest(selector) { return selector === action ? {} : null; } };
  }
  return { steps, dots, status, location, listeners, docListeners, target };
}

test('opens a valid shared step hash and updates accessible progress', () => {
  const app = load('#assistant');
  assert.equal(app.steps[6].hidden, false);
  assert.equal(app.steps.filter(step => !step.hidden).length, 1);
  assert.equal(app.dots[6].attrs['aria-current'], 'step');
  assert.equal(app.status.textContent, 'Step 7 of 8');
});

test('invalid hash safely resolves to welcome', () => {
  const app = load('#not-a-step');
  assert.equal(app.location.hash, '#welcome');
  assert.equal(app.steps[0].hidden, false);
  assert.equal(app.steps[0].back.disabled, true);
});

test('next, back, skip, restart, and keyboard navigation change steps', () => {
  const app = load('#welcome');
  app.listeners.click({ target: app.target('[data-next]') });
  assert.equal(app.location.hash, '#hub');
  app.listeners.click({ target: app.target('[data-back]') });
  assert.equal(app.location.hash, '#welcome');
  app.listeners.click({ target: app.target('[data-skip]') });
  assert.equal(app.location.hash, '#explore');
  app.listeners.click({ target: app.target('[data-restart]') });
  assert.equal(app.location.hash, '#welcome');
  app.docListeners.keydown({ target: { closest: () => null }, key: 'ArrowRight', preventDefault() {} });
  assert.equal(app.location.hash, '#hub');
  app.docListeners.keydown({ target: { closest: () => null }, key: 'Escape', preventDefault() {} });
  assert.equal(app.location.hash, '#explore');
});

test('arrow keys do not override interactive controls', () => {
  const app = load('#welcome');
  app.docListeners.keydown({ target: { closest: () => ({}) }, key: 'ArrowRight', preventDefault() { throw Error('should not prevent'); } });
  assert.equal(app.location.hash, '#welcome');
});

test('step one mounts the shared homepage entrance as an interactive preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /data-home-entrance-preview/);
    assert.match(html, /home-entrance-preview\.js/);
    assert.doesNotMatch(html, /class="entrance-map"/);
    assert.match(html, /class="preview-guidance"/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('\.hero-inner > div:first-child'\)/);
  assert.match(previewSource, /className = 'home-entrance-preview-content light-preview'/);
  assert.match(previewSource, /researchProfile = entrance\.querySelector\('details'\)/);
  assert.match(previewSource, /content\.appendChild\(researchProfile\.cloneNode\(true\)\)/);
  assert.match(previewSource, /setAttribute\('target', '_blank'\)/);
  assert.match(previewSource, /setAttribute\('rel', 'noopener noreferrer'\)/);
  assert.match(previewSource, /philosophyLink\.classList\.add\('intro-philosophy-link'\)/);
  assert.match(previewSource, /disabled\.disabled = true/);
  assert.match(previewSource, /setAttribute\('aria-disabled', 'true'\)/);
  assert.doesNotMatch(previewSource, /iframe/i);
  assert.match(styles, /\.home-entrance-preview-content\.light-preview\s*\{[^}]*color-scheme:\s*light;/s);
  assert.match(styles, /\.light-preview \.guide-marker\.preview-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.96\);[^}]*color:\s*#1f2937 !important;/s);
  assert.match(styles, /\.light-preview \.intro-philosophy-link\s*\{[^}]*border:\s*1px solid #cbd5e1;[^}]*background:\s*rgba\(255,255,255,\.96\) !important;[^}]*color:\s*#1f2937 !important;/s);
  assert.match(styles, /\.light-preview \.intro-philosophy-link:focus-visible\s*\{[^}]*outline:\s*3px solid #2563eb;/s);
  assert.match(styles, /\.light-preview \.preview-orientation-control\s*\{[^}]*background:\s*#f1f5f9;[^}]*color:\s*#475569;/s);
});

test('step two mounts the shared homepage Research Hub as an interactive light preview', () => {
  for (const html of [english, japanese]) {
    assert.match(html, /data-home-hub-preview/);
    assert.match(html, /class="hub-overview orientation-preview--light"/);
    assert.match(html, /class="preview-guidance"/);
    assert.doesNotMatch(html, /class="hub-logo-grid"/);
  }
  const previewSource = fs.readFileSync(new URL('../scripts/home-entrance-preview.js', `file://${__filename}`), 'utf8');
  assert.match(previewSource, /source\.querySelector\('\.profile-card'\)/);
  assert.match(previewSource, /content\.classList\.add\('hub-preview-content', 'light-preview'\)/);
  assert.match(previewSource, /document\.querySelectorAll\('\[data-home-hub-preview\]'\)\.forEach\(mount\)/);
  assert.match(previewSource, /className = 'research-hub-preview-stage'/);
  assert.match(previewSource, /scale = Math\.min\(1, availableWidth \/ naturalWidth\)/);
  assert.match(previewSource, /stageSizer\.style\.height = \(content\.offsetHeight \* scale\)/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-architect'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-profiles'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-assistant'/);
  assert.match(previewSource, /addMarker\(markers, 'hub-marker hub-marker-explore'/);
  assert.match(styles, /\.research-hub-preview-stage\s*\{[^}]*width:\s*430px;[^}]*transform:\s*scale\(var\(--hub-preview-scale, 1\)\);[^}]*transform-origin:\s*top left;/s);
  assert.match(styles, /\.hub-preview-content\s*\{[^}]*padding:\s*14px;[^}]*border-radius:\s*16px;[^}]*background:\s*rgba\(255,255,255,\.72\);/s);
  assert.match(styles, /\.hub-preview-markers \.guide-marker\s*\{[^}]*background:\s*rgba\(255,255,255,\.96\);[^}]*color:\s*#1f2937 !important;/s);
  assert.doesNotMatch(styles, /\.hub-preview-content \.research-identifiers[^}]*padding-right/);
  assert.doesNotMatch(styles, /\.hub-preview-content \.preview-link[^}]*box-shadow/);
  assert.match(styles, /\.orientation-preview--light\s*\{[^}]*color-scheme:\s*light;[^}]*--card-color:\s*#ffffff;[^}]*--text:\s*#111827;/s);
  assert.match(styles, /\.orientation-preview--light \.hub-preview-content img\s*\{[^}]*filter:\s*none !important;[^}]*opacity:\s*1 !important;/s);
  assert.match(styles, /\.hub-preview-content \.preview-link:focus-visible\s*\{[^}]*outline:\s*3px solid #155ed0;/s);
});
