(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const tags = Array.from(document.querySelectorAll(".tags .tag.tooltip"));
    const mobileQuery = window.matchMedia("(max-width: 1024px)");

    if (!tags.length) return;

    const isMobile = () => mobileQuery.matches;

    function containsPoint(tag, x, y) {
      const bounds = tag.getBoundingClientRect();
      return x >= bounds.left && x <= bounds.right &&
        y >= bounds.top && y <= bounds.bottom;
    }

    function closeAll() {
      tags.forEach((tag) => {
        tag.classList.remove("active", "hover-active");
        tag.style.zIndex = "";
      });
    }

    function syncMode() {
      const mobile = isMobile();
      document.body.classList.toggle("is-mobile", mobile);
      closeAll();
    }

    tags.forEach((tag) => {
      tag.addEventListener("click", (event) => {
        if (!isMobile()) return;

        event.preventDefault();
        event.stopPropagation();
        const willOpen = !tag.classList.contains("active");
        closeAll();

        if (willOpen) {
          tag.classList.add("active");
          tag.style.zIndex = "10002";
        }
      });
    });

    document.addEventListener("pointermove", (event) => {
      if (isMobile()) return;

      tags.forEach((tag) => {
        tag.classList.toggle(
          "hover-active",
          containsPoint(tag, event.clientX, event.clientY)
        );
      });
    });

    document.addEventListener("click", () => {
      if (isMobile()) closeAll();
    });

    document.addEventListener("touchstart", (event) => {
      if (isMobile() && !event.target.closest(".tags .tag.tooltip")) closeAll();
    }, { passive: true });

    window.addEventListener("scroll", closeAll, { passive: true });
    window.addEventListener("blur", closeAll);
    window.addEventListener("pagehide", closeAll);
    document.addEventListener("pointerleave", closeAll);
    document.addEventListener("pointercancel", closeAll);
    document.addEventListener("visibilitychange", closeAll);
    window.addEventListener("resize", syncMode);
    window.addEventListener("orientationchange", syncMode);

    syncMode();
  });
})();
