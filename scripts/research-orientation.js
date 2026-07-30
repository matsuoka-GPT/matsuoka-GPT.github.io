(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('tour-js');
  function mount(tour) {
    var steps = Array.prototype.slice.call(tour.querySelectorAll('[data-step]'));
    var dots = Array.prototype.slice.call(tour.querySelectorAll('.progress a'));
    var status = tour.querySelector('[data-status]');
    var current = 0;
    function indexFromHash() {
      var id = window.location.hash.slice(1);
      if (!id) return 0;
      var found = steps.findIndex(function (step) { return step.id === id; });
      return found < 0 ? 0 : found;
    }
    function resetPanelScroll(step) {
      var previewScroller = step.querySelector('.tour-stage > :first-child');
      var guideScroller = step.querySelector('.callout');
      if (previewScroller) previewScroller.scrollTop = 0;
      if (guideScroller) guideScroller.scrollTop = 0;
    }
    function resetPreviewState(step) {
      var preview = step.querySelector('.tour-stage > :first-child');
      if (!preview) return;
      preview.querySelectorAll('details').forEach(function (details) {
        details.open = false;
        details.removeAttribute('open');
      });
      preview.querySelectorAll('[aria-expanded="true"]').forEach(function (control) {
        control.setAttribute('aria-expanded', 'false');
        var panelId = control.getAttribute('aria-controls');
        var panel = panelId && document.getElementById(panelId);
        if (panel && preview.contains(panel)) panel.hidden = true;
      });
      preview.querySelectorAll('.expanded, .is-expanded, .accordion-expanded, .open, .is-open, .accordion-open').forEach(function (element) {
        element.classList.remove('expanded', 'is-expanded', 'accordion-expanded', 'open', 'is-open', 'accordion-open');
      });
    }
    function show(index, options) {
      options = options || {};
      var destination = Math.max(0, Math.min(steps.length - 1, index));
      resetPreviewState(steps[destination]);
      resetPanelScroll(steps[destination]);
      current = destination;
      steps.forEach(function (step, i) { step.hidden = i !== current; });
      dots.forEach(function (dot, i) {
        if (i === current) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
      status.textContent = tour.dataset.stepWord + ' ' + (current + 1) + ' ' + tour.dataset.ofWord + ' ' + steps.length;
      steps[current].querySelector('[data-back]').disabled = current === 0;
      if (options.hash !== false) window.history.pushState(null, '', '#' + steps[current].id);
      if (options.focus) steps[current].querySelector('h2').focus({ preventScroll: true });
    }
    tour.addEventListener('click', function (event) {
      if (event.target.closest('[data-next]')) show(current + 1, { focus: true });
      else if (event.target.closest('[data-back]')) show(current - 1, { focus: true });
      else if (event.target.closest('[data-skip]')) show(steps.length - 1, { focus: true });
      else if (event.target.closest('[data-restart]')) show(0, { focus: true });
    });
    window.addEventListener('hashchange', function () { show(indexFromHash(), { hash: false, focus: true }); });
    document.addEventListener('keydown', function (event) {
      var interactive = event.target.closest && event.target.closest('input, textarea, select, button, a, [contenteditable="true"]');
      if (interactive || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' && current < steps.length - 1) { event.preventDefault(); show(current + 1, { focus: true }); }
      else if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); show(current - 1, { focus: true }); }
      else if (event.key === 'Escape') { event.preventDefault(); show(steps.length - 1, { focus: true }); }
    });
    var initial = indexFromHash();
    if (window.location.hash && initial === 0 && window.location.hash !== '#welcome') window.history.replaceState(null, '', '#welcome');
    show(initial, { hash: false, focus: false });
  }
  function init() { document.querySelectorAll('[data-tour]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
