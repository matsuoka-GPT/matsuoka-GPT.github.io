(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const tags = Array.from(document.querySelectorAll(".tags .tag.tooltip"));
    const mobileQuery = window.matchMedia("(max-width: 1024px)");

    if (!tags.length) return;

    const isMobile = () => mobileQuery.matches;

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
      tag.addEventListener("pointerenter", () => {
        if (!isMobile()) tag.classList.add("hover-active");
      });

      tag.addEventListener("pointerleave", () => {
        tag.classList.remove("hover-active");
      });

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

    document.addEventListener("pointerover", (event) => {
      if (!isMobile() && !event.target.closest(".tags .tag.tooltip")) closeAll();
    });

    document.addEventListener("click", () => {
      if (isMobile()) closeAll();
    });

    document.addEventListener("touchstart", (event) => {
      if (isMobile() && !event.target.closest(".tags .tag.tooltip")) closeAll();
    }, { passive: true });

    window.addEventListener("scroll", closeAll, { passive: true });
    window.addEventListener("blur", closeAll);
    document.addEventListener("visibilitychange", closeAll);
    window.addEventListener("resize", syncMode);
    window.addEventListener("orientationchange", syncMode);

    syncMode();
  });
})();
