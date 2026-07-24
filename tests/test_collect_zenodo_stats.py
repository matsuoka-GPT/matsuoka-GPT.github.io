from __future__ import annotations

import csv
import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

import pytest

from scripts.collect_zenodo_stats import DEFAULT_API_URL, DEFAULT_AUTHOR, DEFAULT_PAGE_SIZE, build_url, is_author_record, iter_records, request_json

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
    assert dmf["category"] == "BFSSU / DMF Cosmology"
    assert co["views_delta"] == "0"
    assert co["downloads_delta"] == "0"
    assert co["category"] == "Co-Intelligence"

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
            "--generated-at",
            "2026-07-24T12:00:00+00:00",
        ],
        check=True,
        cwd=ROOT,
    )
    same_day_history = read_csv(output_dir / "history.csv")
    assert len(same_day_history) == 2
    assert same_day_history[-1]["generated_at"] == "2026-07-24T12:00:00+00:00"

    html = dashboard.read_text(encoding="utf-8")
    assert "Zenodo Analytics Dashboard" in html
    assert "aggregated across all versions" in html
    assert "DMF Cosmology &amp; &lt;Escaped&gt;" in html
    assert "30-day Views and Downloads Trend" in html
    assert "new Chart" in html
    server.shutdown()
