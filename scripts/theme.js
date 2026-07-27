(function () {
  'use strict';

  var storageKey = 'site-theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function storedPreference() {
    try {
      var value = localStorage.getItem(storageKey);
      return value === 'dark' || value === 'light' || value === 'system' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function currentPreference() {
    return storedPreference() || 'system';
  }

  function resolvedTheme(preference) {
    return preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  }

  function nextPreference(preference) {
    return preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
  }

  function updateButton(button, preference) {
    var labels = { system: '◐ System', light: '☀ Light', dark: '🌙 Dark' };
    var next = nextPreference(preference);
    button.textContent = labels[preference];
    button.dataset.mode = preference;
    button.setAttribute('aria-label', 'Theme: ' + preference + '. Switch to ' + next + ' theme');
    button.title = 'Theme: ' + preference + ' · Next: ' + next;
  }

  function applyPreference(preference, button) {
    root.setAttribute('data-theme-preference', preference);
    root.setAttribute('data-theme', resolvedTheme(preference));
    if (button) updateButton(button, preference);
  }

  // Runs in <head>, before the page is painted, to prevent a theme flash.
  applyPreference(currentPreference());

  function mountToggle() {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    updateButton(button, currentPreference());
    button.addEventListener('click', function () {
      var next = nextPreference(root.getAttribute('data-theme-preference'));
      try { localStorage.setItem(storageKey, next); } catch (error) { /* Theme still works for this page. */ }
      applyPreference(next, button);
    });
    document.body.appendChild(button);

    // Enable transitions only after the initial theme has painted, avoiding a flash on load.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { root.classList.add('theme-ready'); });
    });

    media.addEventListener('change', function (event) {
      if (root.getAttribute('data-theme-preference') === 'system') {
        root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  } else {
    mountToggle();
  }
}());
