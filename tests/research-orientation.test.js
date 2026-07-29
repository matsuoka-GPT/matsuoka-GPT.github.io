const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/research-orientation.js', `file://${__filename}`), 'utf8');
const styles = fs.readFileSync(new URL('../styles/research-orientation.css', `file://${__filename}`), 'utf8');

test('interactive steps share the same top edge while the no-script fallback remains spaced', () => {
  assert.match(styles, /\.tour-step \+ \.tour-step\s*\{\s*margin-top:\s*4rem;/);
  assert.match(styles, /\.tour-js \.tour-step\s*\{\s*margin-top:\s*0;/);
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
