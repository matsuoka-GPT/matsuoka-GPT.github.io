#!/usr/bin/env python3
"""Collect Zenodo record statistics and generate a static analytics dashboard."""

from __future__ import annotations

import argparse
import csv
import html
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

DEFAULT_API_URL = "https://zenodo.org/api/records"
DEFAULT_AUTHOR = "Takafumi Matsuoka"
DEFAULT_OUTPUT_DIR = Path("data/zenodo")
DEFAULT_DASHBOARD_PATH = Path("zenodo-stats.html")
DEFAULT_CATEGORIES_PATH = Path("data/zenodo/categories.json")
DEFAULT_HISTORY_PATH = Path("data/zenodo/history.csv")
DEFAULT_PAGE_SIZE = 100
MAX_RETRIES = 5
BACKOFF_SECONDS = 2.0
STATS_SCOPE = "Zenodo default record statistics: aggregated across all versions of each concept record"
METRIC_FIELDS = ["views", "unique_views", "downloads", "unique_downloads"]
HISTORY_FIELDS = ["generated_at", "records", *METRIC_FIELDS]
RECORD_FIELDS = [
    "record_id",
    "conceptrecid",
    "category",
    "title",
    "doi",
    "publication_date",
    *METRIC_FIELDS,
    "views_delta",
    "unique_views_delta",
    "downloads_delta",
    "unique_downloads_delta",
    "version",
    "record_url",
]


@dataclass(frozen=True)
class ZenodoRecord:
    record_id: str
    conceptrecid: str
    title: str
    doi: str
    publication_date: str
    views: int
    unique_views: int
    downloads: int
    unique_downloads: int
    version: str
    record_url: str
    category: str = "Other"
    views_delta: int = 0
    unique_views_delta: int = 0
    downloads_delta: int = 0
    unique_downloads_delta: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {field: getattr(self, field) for field in RECORD_FIELDS}


@dataclass(frozen=True)
class CategoryRule:
    name: str
    title_terms: tuple[str, ...]
    doi_terms: tuple[str, ...]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect Zenodo public record statistics for an author.")
    parser.add_argument("--author", default=DEFAULT_AUTHOR, help="Creator name to match exactly.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Zenodo records API endpoint.")
    parser.add_argument("--categories", type=Path, default=DEFAULT_CATEGORIES_PATH)
    parser.add_argument("--dashboard", type=Path, default=DEFAULT_DASHBOARD_PATH)
    parser.add_argument("--generated-at", help="Override generation timestamp for reproducible tests.")
    parser.add_argument(
        "--include-all-versions",
        action="store_true",
        help="Keep every version. By default only the newest version per concept record is retained.",
    )
    return parser.parse_args()


def request_json(url: str) -> dict[str, Any]:
    headers = {"User-Agent": "matsuoka-github-pages-zenodo-stats/2.0"}
    for attempt in range(1, MAX_RETRIES + 1):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            retry_after: float | None = None
            if isinstance(exc, urllib.error.HTTPError) and exc.code < 500 and exc.code != 429:
                raise RuntimeError(f"Zenodo API request failed: HTTP {exc.code} {url}") from exc
            if isinstance(exc, urllib.error.HTTPError):
                retry_after_header = exc.headers.get("Retry-After")
                if retry_after_header:
                    try:
                        retry_after = float(retry_after_header)
                    except ValueError:
                        retry_after = None
            if attempt == MAX_RETRIES:
                raise RuntimeError(f"Zenodo API request failed after {MAX_RETRIES} attempts: {url}") from exc
            sleep_for = retry_after if retry_after is not None else BACKOFF_SECONDS * (2 ** (attempt - 1))
            print(f"Warning: Zenodo API error ({exc}); retrying in {sleep_for:.1f}s", file=sys.stderr)
            time.sleep(sleep_for)
    raise AssertionError("unreachable")


def build_url(api_url: str, params: dict[str, Any]) -> str:
    return f"{api_url}?{urllib.parse.urlencode(params)}"


def iter_records(author: str, page_size: int, api_url: str) -> Iterable[dict[str, Any]]:
    params: dict[str, Any] = {
        "q": f'creators.name:"{author}"',
        "all_versions": "true",
        "sort": "mostrecent",
        "size": page_size,
        "page": 1,
    }
    seen_api_ids: set[str] = set()
    while True:
        payload = request_json(build_url(api_url, params))
        hits = payload.get("hits", {}).get("hits", [])
        if not hits:
            break
        for hit in hits:
            api_id = str(hit.get("id", ""))
            if api_id and api_id in seen_api_ids:
                continue
            seen_api_ids.add(api_id)
            yield hit
        if payload.get("links", {}).get("next"):
            params["page"] += 1
            continue
        break


def is_author_record(record: dict[str, Any], author: str) -> bool:
    creators = record.get("metadata", {}).get("creators", [])
    return any(str(creator.get("name", "")).strip() == author for creator in creators)


def stats_value(stats: dict[str, Any], key: str) -> int:
    try:
        return int(stats.get(key, 0) or 0)
    except (TypeError, ValueError):
        return 0


def normalize_record(record: dict[str, Any]) -> ZenodoRecord:
    metadata = record.get("metadata", {})
    stats = record.get("stats", {})
    links = record.get("links", {})
    return ZenodoRecord(
        record_id=str(record.get("id", "")),
        conceptrecid=str(record.get("conceptrecid") or record.get("id", "")),
        title=str(metadata.get("title", "")),
        doi=str(metadata.get("doi", "")),
        publication_date=str(metadata.get("publication_date", "")),
        views=stats_value(stats, "views"),
        unique_views=stats_value(stats, "unique_views"),
        downloads=stats_value(stats, "downloads"),
        unique_downloads=stats_value(stats, "unique_downloads"),
        version=str(metadata.get("version", "")),
        record_url=str(links.get("html") or links.get("self") or ""),
    )


def record_sort_key(record: ZenodoRecord) -> tuple[str, int]:
    try:
        numeric_id = int(record.record_id)
    except ValueError:
        numeric_id = 0
    return (record.publication_date, numeric_id)


def deduplicate_versions(records: list[ZenodoRecord]) -> list[ZenodoRecord]:
    # Zenodo displays record usage statistics aggregated across all versions by
    # default, while exposing version-specific counts separately in its UI.
    # Therefore, retaining only the newest record per conceptrecid avoids double
    # counting version records without undercounting the concept-level totals.
    newest_by_concept: dict[str, ZenodoRecord] = {}
    for record in records:
        current = newest_by_concept.get(record.conceptrecid)
        if current is None or record_sort_key(record) > record_sort_key(current):
            newest_by_concept[record.conceptrecid] = record
    return sorted(newest_by_concept.values(), key=record_sort_key, reverse=True)


def totals(records: list[ZenodoRecord]) -> dict[str, int]:
    return {
        "records": len(records),
        "views": sum(record.views for record in records),
        "unique_views": sum(record.unique_views for record in records),
        "downloads": sum(record.downloads for record in records),
        "unique_downloads": sum(record.unique_downloads for record in records),
    }


def load_history(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def history_key(row: dict[str, str]) -> str:
    return row.get("generated_at", "")[:10]


def metric_int(row: dict[str, Any], field: str) -> int:
    try:
        return int(row.get(field, 0) or 0)
    except (TypeError, ValueError):
        return 0


def previous_history_row(history: list[dict[str, str]], today: str) -> dict[str, str] | None:
    older = [row for row in history if history_key(row) < today]
    return older[-1] if older else None


def history_delta(current: dict[str, int], previous: dict[str, str] | None) -> dict[str, int]:
    if previous is None:
        return {f"{field}_delta": 0 for field in METRIC_FIELDS}
    return {f"{field}_delta": current[field] - metric_int(previous, field) for field in METRIC_FIELDS}


def update_history(path: Path, generated_at: str, current: dict[str, int]) -> list[dict[str, str]]:
    today = generated_at[:10]
    history = load_history(path)
    new_row = {"generated_at": generated_at, **{field: str(current[field]) for field in ["records", *METRIC_FIELDS]}}
    replaced = False
    updated: list[dict[str, str]] = []
    for row in history:
        if history_key(row) == today:
            if not replaced:
                updated.append(new_row)
                replaced = True
            continue
        updated.append({field: row.get(field, "") for field in HISTORY_FIELDS})
    if not replaced:
        updated.append(new_row)
    updated.sort(key=history_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=HISTORY_FIELDS)
        writer.writeheader()
        writer.writerows(updated)
    return updated


def load_previous_records(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {row.get("conceptrecid") or row.get("record_id", ""): row for row in csv.DictReader(handle)}


def apply_record_deltas(records: list[ZenodoRecord], previous: dict[str, dict[str, str]]) -> list[ZenodoRecord]:
    updated = []
    for record in records:
        old = previous.get(record.conceptrecid)
        deltas = {f"{field}_delta": 0 if old is None else getattr(record, field) - metric_int(old, field) for field in METRIC_FIELDS}
        updated.append(ZenodoRecord(**{**record.__dict__, **deltas}))
    return updated


def load_category_rules(path: Path) -> list[CategoryRule]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rules = []
    for item in payload.get("categories", []):
        match = item.get("match", {})
        rules.append(
            CategoryRule(
                name=str(item.get("name", "Other")),
                title_terms=tuple(str(term).lower() for term in match.get("title", [])),
                doi_terms=tuple(str(term).lower() for term in match.get("doi", [])),
            )
        )
    return rules or [CategoryRule("Other", (), ())]


def categorize_record(record: ZenodoRecord, rules: list[CategoryRule]) -> str:
    title = record.title.lower()
    doi = record.doi.lower()
    fallback = "Other"
    for rule in rules:
        if rule.name.lower() == "other":
            fallback = rule.name
            continue
        if any(term and term in title for term in rule.title_terms):
            return rule.name
        if any(term and term in doi for term in rule.doi_terms):
            return rule.name
    return fallback


def apply_categories(records: list[ZenodoRecord], rules: list[CategoryRule]) -> list[ZenodoRecord]:
    return [ZenodoRecord(**{**record.__dict__, "category": categorize_record(record, rules)}) for record in records]


def category_totals(records: list[ZenodoRecord], rules: list[CategoryRule]) -> list[dict[str, Any]]:
    names = [rule.name for rule in rules]
    if "Other" not in names:
        names.append("Other")
    result = []
    for name in names:
        grouped = [record for record in records if record.category == name]
        result.append({"category": name, **totals(grouped)})
    return result


def download_ranking(records: list[ZenodoRecord]) -> list[ZenodoRecord]:
    return sorted(records, key=lambda record: (record.downloads, record.unique_downloads, record.views), reverse=True)


def recent_growth_ranking(records: list[ZenodoRecord]) -> list[ZenodoRecord]:
    return sorted(records, key=lambda record: (record.downloads_delta, record.views_delta, record.unique_downloads_delta), reverse=True)


def write_csv(path: Path, records: list[ZenodoRecord]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=RECORD_FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow(record.to_dict())


def write_json(path: Path, author: str, records: list[ZenodoRecord], generated_at: str, aggregate_delta: dict[str, int], categories: list[dict[str, Any]]) -> None:
    payload = {
        "author": author,
        "generated_at": generated_at,
        "stats_scope": STATS_SCOPE,
        "totals": totals(records),
        "deltas": aggregate_delta,
        "categories": categories,
        "download_ranking": [record.to_dict() for record in download_ranking(records)],
        "recent_growth_ranking": [record.to_dict() for record in recent_growth_ranking(records)],
        "records": [record.to_dict() for record in records],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def markdown_table(records: list[ZenodoRecord]) -> str:
    lines = [
        "| Rank | Category | Title | DOI | Publication date | Views | Δ Views | Downloads | Δ Downloads |",
        "| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ]
    for rank, record in enumerate(records, start=1):
        doi = f"[{record.doi}](https://doi.org/{record.doi})" if record.doi else ""
        title = record.title.replace("|", "\\|")
        lines.append(
            f"| {rank} | {record.category} | {title} | {doi} | {record.publication_date} | "
            f"{record.views} | {record.views_delta} | {record.downloads} | {record.downloads_delta} |"
        )
    return "\n".join(lines)


def write_markdown(path: Path, author: str, records: list[ZenodoRecord], generated_at: str, aggregate_delta: dict[str, int], categories: list[dict[str, Any]]) -> None:
    aggregate = totals(records)
    category_lines = ["| Category | Records | Views | Unique views | Downloads | Unique downloads |", "| --- | ---: | ---: | ---: | ---: | ---: |"]
    for category in categories:
        category_lines.append(
            f"| {category['category']} | {category['records']} | {category['views']} | {category['unique_views']} | {category['downloads']} | {category['unique_downloads']} |"
        )
    content = [
        f"# Zenodo statistics for {author}",
        "",
        f"Generated at: {generated_at}",
        "",
        f"Statistics scope: {STATS_SCOPE}",
        "",
        "## Totals",
        "",
        f"- Records: {aggregate['records']}",
        f"- Views: {aggregate['views']} ({aggregate_delta['views_delta']:+})",
        f"- Unique views: {aggregate['unique_views']} ({aggregate_delta['unique_views_delta']:+})",
        f"- Downloads: {aggregate['downloads']} ({aggregate_delta['downloads_delta']:+})",
        f"- Unique downloads: {aggregate['unique_downloads']} ({aggregate_delta['unique_downloads_delta']:+})",
        "",
        "## Download ranking",
        "",
        markdown_table(download_ranking(records)),
        "",
        "## Recent growth ranking",
        "",
        markdown_table(recent_growth_ranking(records)),
        "",
        "## Categories",
        "",
        "\n".join(category_lines),
        "",
        "## Records",
        "",
        markdown_table(records),
        "",
    ]
    path.write_text("\n".join(content), encoding="utf-8")


def safe(value: Any) -> str:
    return html.escape(str(value), quote=True)


def fmt_delta(value: int) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value}"


def history_chart_points(history: list[dict[str, str]]) -> list[dict[str, Any]]:
    return [
        {"date": history_key(row), "views": metric_int(row, "views"), "downloads": metric_int(row, "downloads")}
        for row in history[-30:]
    ]


def metric_card(label: str, value: int, delta: int | None = None) -> str:
    delta_html = f'<span class="delta">{safe(fmt_delta(delta))} since previous run</span>' if delta is not None else ""
    return f'<article class="metric-card"><span>{safe(label)}</span><strong>{value:,}</strong>{delta_html}</article>'


def record_rows(records: list[ZenodoRecord]) -> str:
    rows = []
    for record in records:
        doi = safe(record.doi)
        title = safe(record.title)
        title_html = f'<a href="{safe(record.record_url)}">{title}</a>' if record.record_url else title
        doi_html = f'<a href="https://doi.org/{doi}">{doi}</a>' if doi else ""
        rows.append(
            "<tr>"
            f"<td>{title_html}<small>{safe(record.category)}</small></td>"
            f"<td>{doi_html}</td>"
            f"<td>{safe(record.publication_date)}</td>"
            f"<td>{record.views:,}<small>{fmt_delta(record.views_delta)}</small></td>"
            f"<td>{record.unique_views:,}<small>{fmt_delta(record.unique_views_delta)}</small></td>"
            f"<td>{record.downloads:,}<small>{fmt_delta(record.downloads_delta)}</small></td>"
            f"<td>{record.unique_downloads:,}<small>{fmt_delta(record.unique_downloads_delta)}</small></td>"
            "</tr>"
        )
    return "\n".join(rows)


def compact_rows(records: list[ZenodoRecord], metric: str) -> str:
    rows = []
    for rank, record in enumerate(records[:10], start=1):
        delta = getattr(record, f"{metric}_delta", 0)
        rows.append(
            "<tr>"
            f"<td>{rank}</td>"
            f"<td>{safe(record.title)}</td>"
            f"<td>{getattr(record, metric):,}</td>"
            f"<td>{fmt_delta(delta)}</td>"
            "</tr>"
        )
    return "\n".join(rows)


def category_rows(categories: list[dict[str, Any]]) -> str:
    return "\n".join(
        "<tr>"
        f"<td>{safe(category['category'])}</td>"
        f"<td>{category['records']:,}</td>"
        f"<td>{category['views']:,}</td>"
        f"<td>{category['unique_views']:,}</td>"
        f"<td>{category['downloads']:,}</td>"
        f"<td>{category['unique_downloads']:,}</td>"
        "</tr>"
        for category in categories
    )


def write_dashboard(path: Path, author: str, records: list[ZenodoRecord], generated_at: str, aggregate_delta: dict[str, int], categories: list[dict[str, Any]], history: list[dict[str, str]]) -> None:
    aggregate = totals(records)
    chart_points = history_chart_points(history)
    html_text = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
  <title>Zenodo Analytics Dashboard | Matsuoka x GPT Thought Experiment Lab</title>
  <meta name=\"description\" content=\"Daily Zenodo analytics for {safe(author)}.\" />
  <script src=\"https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js\"></script>
  <style>
    :root {{
      --w: 980px; --bg0:#ffffff; --bg1:#fbfcff; --text:#111; --muted:#475069;
      --line: rgba(18, 26, 40, .10); --card: rgba(255,255,255,.82);
      --shadow: 0 10px 30px rgba(18, 26, 40, .06); --shadow2: 0 12px 34px rgba(18, 26, 40, .09);
      --radius: 16px; --radius2: 12px; --accent: #2b64ff; --accent2:#1b46c9;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family: system-ui, -apple-system, \"Segoe UI\", \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif; line-height:1.7; color:var(--text); background: radial-gradient(1100px 600px at 15% -8%, rgba(43,100,255,.18), transparent 60%), radial-gradient(1200px 720px at 85% 85%, rgba(43,100,255,.10), transparent 65%), linear-gradient(180deg, #ffffff, #f6f8ff 55%, #ffffff); }}
    a {{ color: inherit; }} a:hover {{ color: var(--accent2); }}
    .wrap {{ max-width:var(--w); margin:0 auto; padding: 34px 18px 44px; }}
    header {{ display:flex; justify-content:space-between; align-items:center; gap:14px; padding: 8px 0 20px; }}
    .brand {{ font-weight:900; letter-spacing:-.02em; }} .brand span {{ color:var(--accent2); }}
    .home-link {{ text-decoration:none; border:1px solid var(--line); border-radius:999px; padding:8px 12px; background:rgba(255,255,255,.72); }}
    .hero, .card {{ border:1px solid var(--line); border-radius:var(--radius); background:var(--card); box-shadow:var(--shadow); backdrop-filter: blur(10px); }}
    .hero {{ padding:24px; margin-bottom:16px; }} h1 {{ font-size: clamp(30px, 5vw, 52px); line-height:1.04; margin: 0 0 12px; letter-spacing:-.045em; }}
    .muted {{ color:var(--muted); }} .updated {{ display:inline-block; margin-top:10px; font-size:14px; color:var(--muted); }}
    .metrics {{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin:16px 0; }}
    .metric-card {{ border:1px solid var(--line); border-radius:var(--radius2); background:rgba(255,255,255,.75); box-shadow:var(--shadow); padding:14px; }}
    .metric-card span {{ display:block; color:var(--muted); font-size:13px; }} .metric-card strong {{ display:block; font-size:28px; line-height:1.2; }} .delta {{ color:var(--accent2)!important; font-size:12px!important; }}
    .grid {{ display:grid; grid-template-columns: 1fr 1fr; gap:16px; }} .card {{ padding:18px; margin-bottom:16px; overflow:hidden; }}
    h2 {{ margin:0 0 12px; font-size:22px; letter-spacing:-.02em; }}
    .table-wrap {{ overflow-x:auto; }} table {{ width:100%; border-collapse:collapse; min-width:680px; }} th,td {{ border-bottom:1px solid var(--line); padding:10px 8px; text-align:left; vertical-align:top; }} th {{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }} td small {{ display:block; color:var(--muted); margin-top:2px; }}
    canvas {{ width:100%; min-height:280px; }}
    footer {{ color:var(--muted); font-size:13px; margin-top:20px; }}
    @media (max-width: 820px) {{ .metrics, .grid {{ grid-template-columns:1fr; }} header {{ align-items:flex-start; flex-direction:column; }} .hero {{ padding:18px; }} table {{ min-width:760px; }} }}
  </style>
</head>
<body>
  <main class=\"wrap\">
    <header><div class=\"brand\">Matsuoka × GPT <span>Thought Experiment Lab</span></div><a class=\"home-link\" href=\"./\">Home</a></header>
    <section class=\"hero\">
      <h1>Zenodo Analytics Dashboard</h1>
      <p class=\"muted\">Public Zenodo record statistics collected via the Zenodo REST API for {safe(author)}.</p>
      <p class=\"muted\">Scope: {safe(STATS_SCOPE)}.</p>
      <span class=\"updated\">Last updated: {safe(generated_at)}</span>
    </section>
    <section class=\"metrics\">
      {metric_card('Total papers', aggregate['records'])}
      {metric_card('Total Views', aggregate['views'], aggregate_delta['views_delta'])}
      {metric_card('Total Unique Views', aggregate['unique_views'], aggregate_delta['unique_views_delta'])}
      {metric_card('Total Downloads', aggregate['downloads'], aggregate_delta['downloads_delta'])}
      {metric_card('Total Unique Downloads', aggregate['unique_downloads'], aggregate_delta['unique_downloads_delta'])}
    </section>
    <section class=\"card\"><h2>30-day Views and Downloads Trend</h2><canvas id=\"trendChart\"></canvas></section>
    <section class=\"grid\">
      <article class=\"card\"><h2>Downloads Top 10</h2><div class=\"table-wrap\"><table><thead><tr><th>Rank</th><th>Title</th><th>Downloads</th><th>Δ</th></tr></thead><tbody>{compact_rows(download_ranking(records), 'downloads')}</tbody></table></div></article>
      <article class=\"card\"><h2>Recent Growth Top 10</h2><div class=\"table-wrap\"><table><thead><tr><th>Rank</th><th>Title</th><th>Downloads</th><th>Δ</th></tr></thead><tbody>{compact_rows(recent_growth_ranking(records), 'downloads')}</tbody></table></div></article>
    </section>
    <section class=\"card\"><h2>Category Totals</h2><div class=\"table-wrap\"><table><thead><tr><th>Category</th><th>Records</th><th>Views</th><th>Unique Views</th><th>Downloads</th><th>Unique Downloads</th></tr></thead><tbody>{category_rows(categories)}</tbody></table></div></section>
    <section class=\"card\"><h2>All Records</h2><div class=\"table-wrap\"><table><thead><tr><th>Title</th><th>DOI</th><th>Published</th><th>Views</th><th>Unique Views</th><th>Downloads</th><th>Unique Downloads</th></tr></thead><tbody>{record_rows(records)}</tbody></table></div></section>
    <footer>Generated automatically from Zenodo public records. Category rules are maintained in <code>data/zenodo/categories.json</code>.</footer>
  </main>
  <script>
    const points = {json.dumps(chart_points, ensure_ascii=False)};
    const ctx = document.getElementById('trendChart');
    new Chart(ctx, {{
      type: 'line',
      data: {{ labels: points.map(p => p.date), datasets: [{{ label: 'Views', data: points.map(p => p.views), borderColor: '#2b64ff', backgroundColor: 'rgba(43,100,255,.12)', tension: .28 }}, {{ label: 'Downloads', data: points.map(p => p.downloads), borderColor: '#111827', backgroundColor: 'rgba(17,24,39,.10)', tension: .28 }}] }},
      options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'bottom' }} }}, scales: {{ y: {{ beginAtZero: true }} }} }}
    }});
  </script>
</body>
</html>
"""
    path.write_text(html_text, encoding="utf-8")


def generated_timestamp(value: str | None) -> str:
    if value:
        return value
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def main() -> int:
    args = parse_args()
    records_path = args.output_dir / "zenodo_records.csv"
    history_path = args.output_dir / "history.csv"

    raw_records = [
        normalize_record(record)
        for record in iter_records(args.author, args.page_size, args.api_url)
        if is_author_record(record, args.author)
    ]
    records = raw_records if args.include_all_versions else deduplicate_versions(raw_records)
    records = sorted(records, key=record_sort_key, reverse=True)

    rules = load_category_rules(args.categories)
    records = apply_categories(records, rules)
    records = apply_record_deltas(records, load_previous_records(records_path))
    generated_at = generated_timestamp(args.generated_at)
    aggregate = totals(records)
    prior_history = load_history(history_path)
    aggregate_delta = history_delta(aggregate, previous_history_row(prior_history, generated_at[:10]))
    categories = category_totals(records, rules)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(records_path, records)
    write_json(args.output_dir / "zenodo_records.json", args.author, records, generated_at, aggregate_delta, categories)
    write_markdown(args.output_dir / "zenodo_records.md", args.author, records, generated_at, aggregate_delta, categories)
    updated_history = update_history(history_path, generated_at, aggregate)
    write_dashboard(args.dashboard, args.author, records, generated_at, aggregate_delta, categories, updated_history)

    print(json.dumps({"totals": aggregate, "deltas": aggregate_delta, "download_ranking": [r.to_dict() for r in download_ranking(records)[:10]]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
