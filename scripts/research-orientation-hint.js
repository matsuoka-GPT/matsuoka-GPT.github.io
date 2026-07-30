(() => {
  "use strict";

  const STORAGE_KEY = "researchOrientationHintSeen";
  const SHOW_DELAY = 650;
  const DISMISS_DELAY = 180;
  const NAVIGATION_KEYS = new Set([
    "Tab", "Enter", " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft",
    "ArrowRight", "PageUp", "PageDown", "Home", "End"
  ]);

  document.addEventListener("DOMContentLoaded", () => {
    const hint = document.getElementById("research-orientation-hint");
    const link = document.querySelector(".orientation-link");
    const entry = hint && hint.closest(".orientation-entry");
    if (!hint || !link || !entry) return;

    let hasAppeared = false;
    let dismissing = false;

    function storageHasSeenHint() {
      try {
        return window.sessionStorage.getItem(STORAGE_KEY) === "true";
      } catch (_) {
        return false;
      }
    }

    function markAsSeen() {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, "true");
      } catch (_) {
        // Storage can be unavailable in privacy modes; the hint still works.
      }
    }

    function removeInteractionListeners() {
      document.removeEventListener("click", dismissHint, true);
      document.removeEventListener("keydown", handleKeydown, true);
      window.removeEventListener("scroll", dismissHint);
    }

    function finishDismissal() {
      hint.hidden = true;
      hint.classList.remove("is-visible", "is-dismissing");
      entry.classList.remove("hint-active");
      link.removeAttribute("aria-describedby");
    }

    function dismissHint() {
      if (!hasAppeared || dismissing) return;
      dismissing = true;
      markAsSeen();
      removeInteractionListeners();
      hint.classList.add("is-dismissing");
      hint.classList.remove("is-visible");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishDismissal();
      } else {
        window.setTimeout(finishDismissal, DISMISS_DELAY);
      }
    }

    function handleKeydown(event) {
      if (NAVIGATION_KEYS.has(event.key)) dismissHint();
    }

    if (storageHasSeenHint()) return;

    window.setTimeout(() => {
      if (storageHasSeenHint()) return;
      hasAppeared = true;
      hint.hidden = false;
      entry.classList.add("hint-active");
      link.setAttribute("aria-describedby", hint.id);
      document.addEventListener("click", dismissHint, true);
      document.addEventListener("keydown", handleKeydown, true);
      window.addEventListener("scroll", dismissHint, { passive: true });
      window.requestAnimationFrame(() => hint.classList.add("is-visible"));
    }, SHOW_DELAY);
  });
})();
