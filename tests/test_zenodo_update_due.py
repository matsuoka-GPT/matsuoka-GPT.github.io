from __future__ import annotations

import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from scripts.check_zenodo_update_due import scheduled_update_due


class ScheduledUpdateDueTests(unittest.TestCase):
    def write_records(self, directory: str, generated_at: str) -> Path:
        path = Path(directory) / "zenodo_records.json"
        path.write_text(json.dumps({"generated_at": generated_at}), encoding="utf-8")
        return path

    def test_skips_when_japan_calendar_date_is_already_updated(self):
        with tempfile.TemporaryDirectory() as directory:
            records = self.write_records(directory, "2026-08-28T15:05:00+00:00")
            due, reason = scheduled_update_due(records, datetime.fromisoformat("2026-08-28T16:37:00+00:00"))

        self.assertFalse(due)
        self.assertEqual(reason, "already-updated-2026-08-29")

    def test_utc_previous_date_still_counts_as_today_in_japan(self):
        with tempfile.TemporaryDirectory() as directory:
            records = self.write_records(directory, "2026-08-28T23:50:00+00:00")
            due, _ = scheduled_update_due(records, datetime.fromisoformat("2026-08-29T00:20:00+00:00"))

        self.assertFalse(due)

    def test_runs_when_japan_calendar_date_has_advanced(self):
        with tempfile.TemporaryDirectory() as directory:
            records = self.write_records(directory, "2026-08-28T14:59:00+00:00")
            due, reason = scheduled_update_due(records, datetime.fromisoformat("2026-08-28T15:17:00+00:00"))

        self.assertTrue(due)
        self.assertEqual(reason, "update-due-2026-08-29")

    def test_runs_when_freshness_data_is_missing_or_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing.json"
            due_missing, _ = scheduled_update_due(missing, datetime.fromisoformat("2026-08-28T15:17:00+00:00"))
            invalid = Path(directory) / "invalid.json"
            invalid.write_text("not-json", encoding="utf-8")
            due_invalid, _ = scheduled_update_due(invalid, datetime.fromisoformat("2026-08-28T15:17:00+00:00"))

        self.assertTrue(due_missing)
        self.assertTrue(due_invalid)


if __name__ == "__main__":
    unittest.main()
