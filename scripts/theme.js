(function () {
  'use strict';

  var STORAGE_KEY = 'site-theme';
  var IOS_RELOAD_KEY = 'site-theme-ios-reload';
  var PREFERENCES = ['system', 'light', 'dark'];
  var LABELS = { system: '◐ System', light: '☀ Light', dark: '🌙 Dark' };
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var preference = readPreference();
  var toggle;
  var switchFrame;

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

  function isIOSSafari() {
    var userAgent = navigator.userAgent || '';
    var isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isSafari = /Safari/.test(userAgent) &&
      !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/.test(userAgent);
    return isIOS && isSafari;
  }

  function reloadIOSSafariAfterUserChange() {
    if (!isIOSSafari()) return;
    try {
      // This one-shot reload is an iOS Safari repaint fallback.
      if (sessionStorage.getItem(IOS_RELOAD_KEY)) return;
      sessionStorage.setItem(IOS_RELOAD_KEY, JSON.stringify({
        x: window.scrollX || 0,
        y: window.scrollY || 0
      }));
      window.location.reload();
    } catch (error) {
      // Without a session guard, reloading could loop, so leave the repaint optimization in place.
    }
  }

  function restoreReloadScroll() {
    var saved;
    try {
      saved = sessionStorage.getItem(IOS_RELOAD_KEY);
      if (!saved) return;
      sessionStorage.removeItem(IOS_RELOAD_KEY);
      saved = JSON.parse(saved);
    } catch (error) {
      return;
    }
    window.requestAnimationFrame(function () {
      window.scrollTo(saved.x || 0, saved.y || 0);
    });
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

  function updateThemeAssets(theme) {
    document.querySelectorAll('[data-theme-src-light][data-theme-src-dark]').forEach(function (asset) {
      var source = asset.getAttribute('data-theme-src-' + theme);
      if (source && asset.getAttribute('src') !== source) asset.setAttribute('src', source);
    });
  }

  function applyTheme(value, options) {
    options = options || {};
    if (!isPreference(value)) value = 'system';

    var previousTheme = root.dataset.theme;
    var nextTheme = resolveTheme(value);
    var isThemeChange = previousTheme && previousTheme !== nextTheme;

    // WebKit may repaint separately composited backgrounds, shadows and filtered
    // surfaces on different frames.  Put every element in a no-transition state
    // before changing the theme, then retain it through the first themed paint.
    if (isThemeChange) {
      if (switchFrame) window.cancelAnimationFrame(switchFrame);
      root.classList.add('theme-switching');
      // Force WebKit to commit the transition override before variables change.
      void root.offsetWidth;
    }
    preference = value;
    // Both attributes are committed in the same JavaScript task, so every CSS variable
    // and component observes one coherent theme before the browser can paint again.
    root.dataset.themePreference = preference;
    root.dataset.theme = resolveTheme(preference);
    updateThemeAssets(root.dataset.theme);
    updateToggle();

    if (isThemeChange) {
      // Force all theme-dependent styles into the same layout/repaint batch.
      void root.offsetWidth;
      switchFrame = window.requestAnimationFrame(function () {
        switchFrame = window.requestAnimationFrame(function () {
          root.classList.remove('theme-switching');
          switchFrame = null;
        });
      });
    }

    if (options.persist) {
      try {
        localStorage.setItem(STORAGE_KEY, preference);
        options.persisted = true;
      } catch (error) { /* In-memory mode still works. */ }
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
    updateThemeAssets(root.dataset.theme);
    toggle = document.querySelector('.theme-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      document.body.appendChild(toggle);
    }
    updateToggle();
    toggle.addEventListener('click', function () {
      var options = { persist: true };
      applyTheme(nextPreference(preference), options);
      if (options.persisted) reloadIOSSafariAfterUserChange();
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
  restoreReloadScroll();
}());
