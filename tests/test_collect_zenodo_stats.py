from __future__ import annotations

import csv
import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"


class FixtureHandler(BaseHTTPRequestHandler):
    retry_count = 0

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
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


def test_collect_zenodo_stats_dashboard(tmp_path: Path):
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
