from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

import pytest

from scripts.collect_zenodo_stats import DEFAULT_API_URL, DEFAULT_AUTHOR, DEFAULT_PAGE_SIZE, METRIC_FIELDS, ZenodoRecord, apply_categories, apply_record_deltas, assert_delta_integrity, build_url, category_totals, download_ranking, fetch_missing_mapped_records, is_author_record, iter_records, load_category_rules, load_paper_categories, previous_history_row, record_delta_totals, request_json, update_history, write_dashboard

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"


class FixtureHandler(BaseHTTPRequestHandler):
    retry_count = 0
    queries = []

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        FixtureHandler.queries.append(query)
        page = query.get("page", ["1"])[0]
        if page == "1" and FixtureHandler.retry_count == 0:
            FixtureHandler.retry_count += 1
            self.send_response(429)
            self.send_header("Retry-After", "0")
            self.end_headers()
            return
        fixture = FIXTURES / ("zenodo_page1.json" if page == "1" else "zenodo_page2.json")
        body = fixture.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))




def make_record(index: int, downloads: int, unique_downloads: int | None = None, publication_date: str | None = None) -> ZenodoRecord:
    return ZenodoRecord(
        record_id=str(index),
        conceptrecid=f"c-{index}",
        title=f"Record {index} with a deliberately long title for clamp testing",
        doi=f"10.5281/zenodo.{index}",
        publication_date=publication_date or f"2026-01-{index:02d}",
        views=downloads * 2,
        unique_views=downloads,
        downloads=downloads,
        unique_downloads=unique_downloads if unique_downloads is not None else downloads,
        version="1",
        record_url=f"https://zenodo.org/records/{index}",
        downloads_delta=index,
    )


def previous_row(record: ZenodoRecord) -> dict[str, object]:
    return record.to_dict()


def assert_all_delta_integrity(records: list[ZenodoRecord], expected: dict[str, int]) -> None:
    deltas = record_delta_totals(records)
    assert deltas == {f"{field}_delta": expected[field] for field in METRIC_FIELDS}
    assert_delta_integrity(records, deltas)


def test_one_paper_gaining_five_views():
    before = make_record(1, downloads=10)
    current = ZenodoRecord(**{**before.to_dict(), "views": before.views + 5})

    records = apply_record_deltas([current], {before.conceptrecid: previous_row(before)})

    assert records[0].views_delta == 5
    assert_all_delta_integrity(records, {"views": 5, "unique_views": 0, "downloads": 0, "unique_downloads": 0})


def test_five_papers_gaining_one_view_each():
    before = [make_record(index, downloads=10) for index in range(1, 6)]
    current = [ZenodoRecord(**{**record.to_dict(), "views": record.views + 1}) for record in before]

    records = apply_record_deltas(current, {record.conceptrecid: previous_row(record) for record in before})

    assert [record.views_delta for record in records] == [1] * 5
    assert_all_delta_integrity(records, {"views": 5, "unique_views": 0, "downloads": 0, "unique_downloads": 0})


def test_newly_published_paper_uses_zero_baseline():
    new_paper = make_record(1, downloads=3, unique_downloads=2)

    records = apply_record_deltas([new_paper], {})

    assert_all_delta_integrity(
        records,
        {"views": 6, "unique_views": 3, "downloads": 3, "unique_downloads": 2},
    )


def test_multiple_workflow_runs_on_same_day_use_immediately_previous_run(tmp_path: Path):
    history_path = tmp_path / "history.csv"
    totals = {"records": 1, "views": 10, "unique_views": 8, "downloads": 5, "unique_downloads": 4}
    update_history(history_path, "2026-07-24T00:00:00+00:00", totals)
    totals["views"] = 15
    history = update_history(history_path, "2026-07-24T12:00:00+00:00", totals)

    assert len(history) == 2
    previous = previous_history_row(history, "2026-07-24T18:00:00+00:00")
    assert previous is not None
    assert previous["generated_at"] == "2026-07-24T12:00:00+00:00"


def test_no_changes_between_runs_have_zero_deltas():
    before = [make_record(index, downloads=10) for index in range(1, 4)]

    records = apply_record_deltas(before, {record.conceptrecid: previous_row(record) for record in before})

    assert_all_delta_integrity(records, {field: 0 for field in METRIC_FIELDS})


def test_download_ranking_order_uses_required_tie_breakers():
    records = [
        make_record(1, 10, 5, "2026-01-01"),
        make_record(2, 10, 7, "2026-01-01"),
        make_record(3, 10, 7, "2026-02-01"),
        make_record(4, 11, 1, "2025-01-01"),
    ]

    assert [record.record_id for record in download_ranking(records)] == ["4", "3", "2", "1"]


def test_dashboard_download_ranking_replaces_all_records(tmp_path: Path):
    records = [make_record(index, downloads=100 - index) for index in range(1, 14)]
    dashboard = tmp_path / "zenodo-stats.html"

    write_dashboard(
        dashboard,
        DEFAULT_AUTHOR,
        records,
        "2026-07-24T00:00:00+00:00",
        {"views_delta": 0, "unique_views_delta": 0, "downloads_delta": 0, "unique_downloads_delta": 0},
        [],
        [],
    )

    html = dashboard.read_text(encoding="utf-8")
    details_start = html.index('<details class="download-rankings">')
    details_html = html[details_start : html.index("</details>", details_start)]
    default_html = html[:details_start]

    assert "<h2>All Records</h2>" not in html
    assert "Show all download rankings" in details_html
    assert "https://zenodo.org/records/" in html
    assert "https://doi.org/" not in html
    assert "paper-title" in html
    assert all(f"<td>{rank}</td>" in default_html for rank in range(1, 11))
    assert all(f"<td>{rank}</td>" not in default_html for rank in range(11, 14))
    assert all(f"<td>{rank}</td>" in details_html for rank in range(11, 14))
    assert all(f"<td>{rank}</td>" not in details_html for rank in range(1, 11))
    assert html.count('Record ') == len(records) * 3


def test_ranking_titles_have_compact_modal_details(tmp_path: Path):
    records = [make_record(index, downloads=100 - index) for index in range(1, 14)]
    # The public link must not trust an API URL supplied by collected data.
    records[0] = ZenodoRecord(**{**records[0].to_dict(), "record_url": "https://zenodo.org/api/records/1"})
    dashboard = tmp_path / "zenodo-stats.html"

    write_dashboard(
        dashboard,
        DEFAULT_AUTHOR,
        records,
        "2026-07-24T00:00:00+00:00",
        {"views_delta": 0, "unique_views_delta": 0, "downloads_delta": 0, "unique_downloads_delta": 0},
        [],
        [],
    )

    page = dashboard.read_text(encoding="utf-8")
    detail_match = re.search(r'<script type="application/json" id="record-details">(.*?)</script>', page)
    assert detail_match is not None
    details = json.loads(detail_match.group(1))
    ranking_ids = re.findall(r'<button class="paper-title"[^>]+data-record-id="([^"]+)"', page)

    assert set(ranking_ids) == set(details)
    assert len(ranking_ids) == len(records)
    assert all(
        {
            "views", "unique_views", "downloads", "unique_downloads",
            "views_delta", "unique_views_delta", "downloads_delta", "unique_downloads_delta",
        } <= set(detail)
        for detail in details.values()
    )
    assert details["1"]["downloads_delta"] == 1
    assert details["1"]["record_url"] == "https://zenodo.org/records/1"
    assert "/api/records/" not in page
    assert 'target="_blank"' in page


def test_policy_papers_classify_as_homepage_categories():
    rules = load_category_rules(ROOT / "data" / "zenodo" / "categories.json")
    paper_categories = load_paper_categories(ROOT / "data" / "zenodo" / "paper_categories.json")
    records = [
        ZenodoRecord(
            record_id=str(index),
            conceptrecid=f"policy-{index}",
            title=title,
            doi=doi,
            publication_date="2026-01-01",
            views=1,
            unique_views=1,
            downloads=1,
            unique_downloads=1,
            version="v1.0",
            record_url=f"https://zenodo.org/records/policy{index}",
        )
        for index, (title, doi) in enumerate(
            [
                ("A Security-Centered National Model 2.0 / 安心醸成国家モデル 2.0", "10.5281/zenodo.18850250"),
                ("Selective Tax System / 選択税制", "10.5281/zenodo.19363781"),
                ("A national model for fostering peace of mind through a selective tax system", "10.5281/zenodo.18160163"),
                ("New aviation safety model / 新航空安全モデル", "10.5281/zenodo.18186447"),
            ],
            start=1,
        )
    ]

    categorized = apply_categories(records, rules, paper_categories)
    categories = category_totals(categorized, rules)

    assert [record.category for record in categorized].count("Social Design / Institutional Structures") == 3
    assert categorized[-1].category == "Thought Experiments / Structural Theory"
    assert next(category for category in categories if category["category"] == "Social Design / Institutional Structures")["records"] == 3
    assert next(category for category in categories if category["category"] == "Unclassified")["records"] == 0


def test_mapped_research_categories_cover_expected_sections_once():
    mapping = load_paper_categories(ROOT / "data" / "zenodo" / "paper_categories.json")
    records_payload = json.loads((ROOT / "data" / "zenodo" / "zenodo_records.json").read_text(encoding="utf-8"))
    record_dois = {record["doi"].lower() for record in records_payload["records"]}

    assert len(mapping) == len(set(mapping))
    assert record_dois < set(mapping)
    assert set(mapping) - record_dois == {"10.5281/zenodo.20151731"}
    assert mapping["10.5281/zenodo.18159902"] == "Co-Intelligence / Methodology"
    assert mapping["10.5281/zenodo.19053422"] == "Co-Intelligence / Methodology"
    assert mapping["10.5281/zenodo.18512529"] == "Cognitive Science / Structural Cognition"
    assert mapping["10.5281/zenodo.19583310"] == "Cognitive Science / Structural Cognition"
    assert mapping["10.5281/zenodo.18271759"] == "Thought Experiments / Structural Theory"
    assert mapping["10.5281/zenodo.18327352"] == "Thought Experiments / Structural Theory"
    assert mapping["10.5281/zenodo.18186447"] == "Thought Experiments / Structural Theory"
    assert mapping["10.5281/zenodo.20151731"] == "Thought Experiments / Structural Theory"
    assert mapping["10.5281/zenodo.18739136"] == "Co-Intelligence / Methodology"


def test_fetch_missing_mapped_records_supplements_author_search():
    existing = ZenodoRecord(
        record_id="1", conceptrecid="1", title="Existing", doi="10.5281/zenodo.1",
        publication_date="2026-01-01", views=1, unique_views=1, downloads=1,
        unique_downloads=1, version="1.0", record_url="https://zenodo.org/records/1",
    )
    payload = {
        "id": 20151731,
        "conceptrecid": "20151730",
        "metadata": {
            "title": "What Is Personality? / 人格とは何か",
            "doi": "10.5281/zenodo.20151731",
            "publication_date": "2026-05-12",
            "version": "1.0",
        },
        "stats": {},
        "links": {"html": "https://zenodo.org/records/20151731"},
    }

    with patch("scripts.collect_zenodo_stats.request_json", return_value=payload) as mocked:
        records = fetch_missing_mapped_records(
            [existing],
            {
                "10.5281/zenodo.1": "Existing category",
                "10.5281/zenodo.20151731": "Thought Experiments / Structural Theory",
            },
            DEFAULT_API_URL,
        )

    assert [record.doi for record in records] == ["10.5281/zenodo.1", "10.5281/zenodo.20151731"]
    mocked.assert_called_once_with("https://zenodo.org/api/records/20151731")


def test_category_counts_sum_to_total_paper_count():
    rules = load_category_rules(ROOT / "data" / "zenodo" / "categories.json")
    paper_categories = load_paper_categories(ROOT / "data" / "zenodo" / "paper_categories.json")
    records_payload = json.loads((ROOT / "data" / "zenodo" / "zenodo_records.json").read_text(encoding="utf-8"))
    records = [ZenodoRecord(**record) for record in records_payload["records"]]

    categorized = apply_categories(records, rules, paper_categories)
    categories = category_totals(categorized, rules)

    assert len(categorized) == 37
    assert sum(category["records"] for category in categories) == len(categorized)
    assert all(record.category != "Other" for record in categorized)

def test_default_author_uses_verified_zenodo_creator_name():
    assert DEFAULT_AUTHOR == "Matsuoka, Takafumi"


def test_exact_author_validation_accepts_verified_zenodo_creator_name():
    record = {"metadata": {"creators": [{"name": "Matsuoka, Takafumi"}]}}

    assert is_author_record(record, DEFAULT_AUTHOR)


def test_exact_author_validation_rejects_unrelated_creators():
    record = {"metadata": {"creators": [{"name": "Unrelated Creator"}]}}

    assert not is_author_record(record, DEFAULT_AUTHOR)

def test_default_page_size_uses_unauthenticated_safe_limit():
    assert DEFAULT_PAGE_SIZE == 25


def test_build_url_preserves_author_search_and_page_size():
    url = build_url(
        DEFAULT_API_URL,
        {
            "q": 'creators.name:"Matsuoka, Takafumi"',
            "all_versions": "true",
            "sort": "mostrecent",
            "size": DEFAULT_PAGE_SIZE,
            "page": 1,
        },
    )
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    assert parsed.scheme == "https"
    assert parsed.netloc == "zenodo.org"
    assert parsed.path == "/api/records"
    assert query["q"] == ['creators.name:"Matsuoka, Takafumi"']
    assert query["size"] == ["25"]
    assert query["page"] == ["1"]


def test_iter_records_keeps_paginating_after_25_records():
    pages = [
        {
            "hits": {"hits": [{"id": i} for i in range(1, 26)]},
            "links": {"next": "page-2"},
        },
        {
            "hits": {"hits": [{"id": i} for i in range(26, 31)]},
            "links": {},
        },
    ]
    urls = []

    def fake_request_json(url: str):
        urls.append(url)
        return pages.pop(0)

    with patch("scripts.collect_zenodo_stats.request_json", side_effect=fake_request_json):
        records = list(iter_records("Matsuoka, Takafumi", DEFAULT_PAGE_SIZE, DEFAULT_API_URL))

    assert [record["id"] for record in records] == list(range(1, 31))
    queries = [parse_qs(urlparse(url).query) for url in urls]
    assert [query["page"] for query in queries] == [["1"], ["2"]]
    assert all(query["size"] == ["25"] for query in queries)
    assert all(query["q"] == ['creators.name:"Matsuoka, Takafumi"'] for query in queries)


def test_request_json_logs_4xx_response_body(capsys):
    class BodyHTTPError(HTTPError):
        def read(self, *args, **kwargs):
            return b'{"message":"size must be between 1 and 25 for unauthenticated requests"}'

    error = BodyHTTPError("https://zenodo.org/api/records?size=100", 400, "Bad Request", {}, None)
    with patch("urllib.request.urlopen", side_effect=error):
        with pytest.raises(RuntimeError, match="HTTP 400"):
            request_json("https://zenodo.org/api/records?size=100")

    assert "size must be between 1 and 25" in capsys.readouterr().err

def test_collect_zenodo_stats_dashboard(tmp_path: Path):
    FixtureHandler.retry_count = 0
    FixtureHandler.queries = []
    server = HTTPServer(("127.0.0.1", 0), FixtureHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    output_dir = tmp_path / "data" / "zenodo"
    dashboard = tmp_path / "zenodo-stats.html"
    api_url = f"http://127.0.0.1:{server.server_port}/api/records"
    paper_categories = tmp_path / "paper_categories.json"
    paper_categories.write_text('{"papers": {}}', encoding="utf-8")

    previous_records = output_dir / "zenodo_records.csv"
    output_dir.mkdir(parents=True)
    previous_records.write_text(
        "record_id,conceptrecid,category,title,doi,publication_date,views,unique_views,downloads,unique_downloads,views_delta,unique_views_delta,downloads_delta,unique_downloads_delta,version,record_url\n"
        "102,c-dmf,Other,Old,10.5281/zenodo.102,2026-02-01,10,8,5,4,0,0,0,0,1,https://zenodo.org/records/102\n",
        encoding="utf-8",
    )
    (output_dir / "history.csv").write_text(
        "generated_at,records,views,unique_views,downloads,unique_downloads\n"
        "2026-07-23T00:00:00+00:00,1,10,8,5,4\n",
        encoding="utf-8",
    )

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "collect_zenodo_stats.py"),
            "--api-url",
            api_url,
            "--output-dir",
            str(output_dir),
            "--dashboard",
            str(dashboard),
            "--categories",
            str(ROOT / "data" / "zenodo" / "categories.json"),
            "--paper-categories",
            str(paper_categories),
            "--generated-at",
            "2026-07-24T00:00:00+00:00",
        ],
        check=True,
        cwd=ROOT,
    )

    first_success_queries = [query for query in FixtureHandler.queries if query.get("page") == ["1"] or query.get("page") == ["2"]]
    assert first_success_queries[0]["q"] == ['creators.name:"Matsuoka, Takafumi"']
    assert first_success_queries[0]["size"] == ["25"]
    assert [query["page"] for query in first_success_queries[:3]] == [["1"], ["1"], ["2"]]

    records = read_csv(output_dir / "zenodo_records.csv")
    assert len(records) == 2
    assert {row["conceptrecid"] for row in records} == {"c-dmf", "c-co"}
    dmf = next(row for row in records if row["conceptrecid"] == "c-dmf")
    co = next(row for row in records if row["conceptrecid"] == "c-co")
    assert dmf["views_delta"] == "2"
    assert dmf["downloads_delta"] == "2"
    assert dmf["category"] == "Cosmology / BFSSU & DMF"
    # A new concept uses a zero baseline and contributes all its counters.
    assert co["views_delta"] == "20"
    assert co["downloads_delta"] == "8"
    assert co["category"] == "Co-Intelligence / Methodology"

    history = read_csv(output_dir / "history.csv")
    assert len(history) == 2
    assert history[-1]["records"] == "2"
    assert history[-1]["views"] == "32"
    assert history[-1]["downloads"] == "15"

    payload = json.loads((output_dir / "zenodo_records.json").read_text(encoding="utf-8"))
    assert payload["stats_scope"].startswith("Zenodo default record statistics")
    # The older c-dmf version has 5 views and 2 downloads in the fixture.
    # Because newest-version stats are treated as Zenodo concept-level totals,
    # we must not sum older versions again (which would produce 37/17).
    assert payload["totals"]["views"] == 32
    assert payload["totals"]["downloads"] == 15
    assert payload["deltas"]["views_delta"] == 22
    assert payload["deltas"]["downloads_delta"] == 10
    assert payload["categories"][0]["records"] == 1

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "collect_zenodo_stats.py"),
            "--api-url",
            api_url,
            "--output-dir",
            str(output_dir),
            "--dashboard",
            str(dashboard),
            "--categories",
            str(ROOT / "data" / "zenodo" / "categories.json"),
            "--paper-categories",
            str(paper_categories),
            "--generated-at",
            "2026-07-24T12:00:00+00:00",
        ],
        check=True,
        cwd=ROOT,
    )
    same_day_history = read_csv(output_dir / "history.csv")
    assert len(same_day_history) == 3
    assert same_day_history[-1]["generated_at"] == "2026-07-24T12:00:00+00:00"

    html = dashboard.read_text(encoding="utf-8")
    assert "Zenodo Analytics Dashboard" in html
    assert "aggregated across all versions" in html
    assert "DMF Cosmology &amp; &lt;Escaped&gt;" in html
    assert "30-day Views and Downloads Trend" not in html
    assert "new Chart" not in html
    assert "Chart.js" not in html
    assert "paper-title" in html
    server.shutdown()
