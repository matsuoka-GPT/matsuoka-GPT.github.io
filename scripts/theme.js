(function () {
  'use strict';

  var STORAGE_KEY = 'site-theme';
  var PREFERENCES = ['system', 'light', 'dark'];
  var LABELS = { system: '◐ System', light: '☀ Light', dark: '🌙 Dark' };
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var preference = readPreference();
  var toggle;

  function isPreference(value) {
    return PREFERENCES.indexOf(value) !== -1;
  }

  function readPreference() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return isPreference(value) ? value : 'system';
    } catch (error) {
      return 'system';
    }
  }

  function resolveTheme(value) {
    return value === 'system' ? (media.matches ? 'dark' : 'light') : value;
  }

  function nextPreference(value) {
    return PREFERENCES[(PREFERENCES.indexOf(value) + 1) % PREFERENCES.length];
  }

  function updateToggle() {
    if (!toggle) return;
    var next = nextPreference(preference);
    toggle.textContent = LABELS[preference];
    toggle.dataset.mode = preference;
    toggle.setAttribute('aria-label', 'Theme: ' + preference + '. Switch to ' + next + ' theme');
    toggle.title = 'Theme: ' + preference + ' · Next: ' + next;
  }

  function applyTheme(value, options) {
    options = options || {};
    if (!isPreference(value)) value = 'system';

    var previousTheme = root.dataset.theme;
    preference = value;
    // Both attributes are committed in the same JavaScript task, so every CSS variable
    // and component observes one coherent theme before the browser can paint again.
    root.dataset.themePreference = preference;
    root.dataset.theme = resolveTheme(preference);
    updateToggle();

    if (options.persist) {
      try { localStorage.setItem(STORAGE_KEY, preference); } catch (error) { /* In-memory mode still works. */ }
    }

    if (previousTheme && (previousTheme !== root.dataset.theme || options.forceEvent)) {
      document.dispatchEvent(new CustomEvent('themechange', {
        detail: { theme: root.dataset.theme, preference: preference }
      }));
    }
    return root.dataset.theme;
  }

  // Public API for components that need to react to a theme without implementing
  // their own storage, media-query, or DOM-attribute logic.
  window.siteTheme = Object.freeze({
    getPreference: function () { return preference; },
    getTheme: function () { return root.dataset.theme; },
    setPreference: function (value) { return applyTheme(value, { persist: true }); }
  });

  // This script is loaded in <head>; applying synchronously prevents a first-paint flash.
  applyTheme(preference);

  function mountToggle() {
    toggle = document.querySelector('.theme-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      document.body.appendChild(toggle);
    }
    updateToggle();
    toggle.addEventListener('click', function () {
      applyTheme(nextPreference(preference), { persist: true });
    });

    // Initial rendering never transitions. Subsequent changes use the shared CSS timing.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { root.classList.add('theme-ready'); });
    });
  }

  function handleSystemChange() {
    if (preference === 'system') applyTheme('system');
  }
  if (media.addEventListener) media.addEventListener('change', handleSystemChange);
  else if (media.addListener) media.addListener(handleSystemChange);

  // Keep tabs/windows consistent and restore the current value from the back-forward cache.
  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === null) applyTheme(readPreference());
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) applyTheme(readPreference());
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  } else {
    mountToggle();
  }
}());
