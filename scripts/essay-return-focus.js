(() => {
  const essayLinkSelector = '#essays a[id^="essay"]';
  let activeTargetId = '';

  const targetFromHash = () => {
    if (!window.location.hash) return null;
    try {
      return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch {
      return null;
    }
  };

  const openAncestorDetails = (target) => {
    let ancestor = target.parentElement?.closest('details');
    while (ancestor) {
      ancestor.open = true;
      ancestor = ancestor.parentElement?.closest('details');
    }
  };

  const centerTarget = (target) => {
    openAncestorDetails(target);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        target.focus({ preventScroll: true });
      });
    });
  };

  const restoreHashTarget = () => {
    const target = targetFromHash();
    if (!target) return;
    activeTargetId = target.id;
    centerTarget(target);
    window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
  };

  const rememberEssayBeforeNavigation = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest(essayLinkSelector);
    if (!link || link.target === '_blank') return;
    window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}#${encodeURIComponent(link.id)}`);
  };

  document.addEventListener('click', rememberEssayBeforeNavigation);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreHashTarget, { once: true });
  } else {
    restoreHashTarget();
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restoreHashTarget();
  });

  window.addEventListener('load', () => {
    if (!activeTargetId) return;
    const target = document.getElementById(activeTargetId);
    if (target) centerTarget(target);
    activeTargetId = '';
  });
})();
