(function () {
  'use strict';

  var sections = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    sections.forEach(function (section) { revealObserver.observe(section); });
  } else {
    sections.forEach(function (section) { section.classList.add('is-visible'); });
  }

  var mobilePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  if (!mobilePointer.matches || !('IntersectionObserver' in window)) return;

  var cards = document.querySelectorAll('.member-card[data-greeting]');
  var greetingObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      greetingObserver.unobserve(entry.target);
      entry.target.classList.add('is-mobile-greeting');
      window.setTimeout(function () {
        entry.target.classList.remove('is-mobile-greeting');
      }, 1500);
    });
  }, {
    threshold: 0.55,
    rootMargin: '-12% 0px -12% 0px'
  });

  cards.forEach(function (card) { greetingObserver.observe(card); });
}());
