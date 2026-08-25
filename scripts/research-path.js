(() => {
  function revealTarget(target) {
    if (!target) return;

    if (target instanceof HTMLDetailsElement) target.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }

  function targetFromHash(hash) {
    if (!hash || hash === '#') return null;
    try {
      return document.querySelector(hash);
    } catch {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    revealTarget(targetFromHash(window.location.hash));

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      revealTarget(targetFromHash(link.getAttribute('href')));
    });
  });
})();
