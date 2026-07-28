(() => {
  const button = document.createElement("a");
  button.id = "backToTop";
  button.href = "#";
  button.setAttribute(
    "aria-label",
    document.documentElement.lang === "ja" ? "TOPに戻る" : "Back to top",
  );
  button.innerHTML = '<span class="top-icon" aria-hidden="true">🔝</span>';

  button.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const updateVisibility = () => {
    button.classList.toggle("show", window.scrollY > 200);
  };

  document.body.append(button);
  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });
})();
