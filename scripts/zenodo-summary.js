(() => {
  const metrics = [
    ["records", "📄"],
    ["views", "👁"],
    ["downloads", "⬇"]
  ];

  function renderSummary(container) {
    const heading = document.createElement("div");
    heading.className = "outputs-heading";

    const title = document.createElement("h2");
    title.textContent = container.dataset.title;

    const dashboard = document.createElement("a");
    dashboard.className = "analytics-link";
    dashboard.href = "/zenodo-stats.html";
    dashboard.target = "_blank";
    dashboard.rel = "noopener noreferrer";
    dashboard.innerHTML = '<span aria-hidden="true">📊</span> Analytics Dashboard';

    heading.append(title, dashboard);

    const stats = document.createElement("div");
    stats.className = "outputs-stats";
    stats.setAttribute("aria-label", container.dataset.ariaLabel);
    stats.setAttribute("aria-live", "polite");

    metrics.forEach(([metric, icon]) => {
      const card = document.createElement("div");
      card.className = "output-stat";

      const label = document.createElement("span");
      label.textContent = `${icon} ${container.dataset[`${metric}Label`]}`;

      const value = document.createElement("strong");
      value.dataset.zenodoStat = metric;
      value.textContent = "—";
      card.append(label, value);
      stats.append(card);
    });

    container.replaceChildren(heading, stats);

    fetch("/data/zenodo/zenodo_records.json")
      .then(response => {
        if (!response.ok) throw new Error(`Zenodo statistics request failed: ${response.status}`);
        return response.json();
      })
      .then(({ totals }) => {
        const number = new Intl.NumberFormat(container.dataset.locale || "en-US");
        metrics.forEach(([metric]) => {
          const value = totals?.[metric];
          const target = stats.querySelector(`[data-zenodo-stat="${metric}"]`);
          if (target && Number.isFinite(value)) target.textContent = number.format(value);
        });
      })
      .catch(error => console.warn("Unable to load Zenodo statistics.", error));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-zenodo-summary]").forEach(renderSummary);
  });
})();
