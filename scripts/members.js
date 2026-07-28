(function () {
  'use strict';
  var sections = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    sections.forEach(function (section) { section.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  sections.forEach(function (section) { observer.observe(section); });
}());
