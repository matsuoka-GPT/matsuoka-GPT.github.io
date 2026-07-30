const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../scripts/home-tooltips.js', `file://${__filename}`), 'utf8');

function createClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name),
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    }
  };
}

function loadTooltips() {
  const documentListeners = {};
  const windowListeners = {};
  const tagListeners = {};
  const tag = {
    classList: createClassList(),
    style: {},
    getBoundingClientRect: () => ({ left: 10, right: 110, top: 20, bottom: 60 }),
    addEventListener(type, listener) { tagListeners[type] = listener; }
  };
  const document = {
    body: { classList: createClassList() },
    querySelectorAll: () => [tag],
    addEventListener(type, listener) { documentListeners[type] = listener; }
  };
  const window = {
    matchMedia: () => ({ matches: false }),
    addEventListener(type, listener) { windowListeners[type] = listener; }
  };

  vm.runInNewContext(source, { window, document });
  documentListeners.DOMContentLoaded();
  return { tag, tagListeners, documentListeners, windowListeners };
}

test('desktop tooltip follows the visible tag bounds instead of stale pointer state', () => {
  const { tag, documentListeners } = loadTooltips();

  documentListeners.pointermove({ clientX: 50, clientY: 40 });
  assert.equal(tag.classList.contains('hover-active'), true);

  documentListeners.pointermove({ clientX: 50, clientY: 100 });
  assert.equal(tag.classList.contains('hover-active'), false);
});

test('navigation lifecycle events always clear an open tooltip', () => {
  const { tag, documentListeners, windowListeners } = loadTooltips();

  documentListeners.pointermove({ clientX: 50, clientY: 40 });
  windowListeners.pagehide();
  assert.equal(tag.classList.contains('hover-active'), false);

  documentListeners.pointermove({ clientX: 50, clientY: 40 });
  documentListeners.pointercancel();
  assert.equal(tag.classList.contains('hover-active'), false);
});
