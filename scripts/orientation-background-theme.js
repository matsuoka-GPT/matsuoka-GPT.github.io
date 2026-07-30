(function () {
  'use strict';

  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function readPreference() {
    try {
      var preference = localStorage.getItem('site-theme');
      return preference === 'light' || preference === 'dark' ? preference : 'system';
    } catch (error) {
      return 'system';
    }
  }

  function applyBackgroundTheme() {
    var preference = readPreference();
    root.dataset.orientationBackgroundTheme = preference === 'system'
      ? (media.matches ? 'dark' : 'light')
      : preference;
  }

  applyBackgroundTheme();

  function handleSystemChange() {
    if (readPreference() === 'system') applyBackgroundTheme();
  }

  if (media.addEventListener) media.addEventListener('change', handleSystemChange);
  else if (media.addListener) media.addListener(handleSystemChange);

  window.addEventListener('storage', function (event) {
    if (event.key === 'site-theme' || event.key === null) applyBackgroundTheme();
  });
  window.addEventListener('pageshow', applyBackgroundTheme);
}());
