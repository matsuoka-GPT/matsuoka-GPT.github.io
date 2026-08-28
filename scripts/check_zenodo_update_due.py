from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

DEFAULT_RECORDS_PATH = Path("data/zenodo/zenodo_records.json")
DEFAULT_TIMEZONE = "Asia/Tokyo"


def parse_timestamp(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        raise ValueError("generated_at must include a timezone")
    return parsed


def scheduled_update_due(records_path: Path, now: datetime, timezone_name: str = DEFAULT_TIMEZONE) -> tuple[bool, str]:
    timezone = ZoneInfo(timezone_name)
    if now.tzinfo is None:
        raise ValueError("now must include a timezone")

    try:
        payload = json.loads(records_path.read_text(encoding="utf-8"))
        generated_at = parse_timestamp(payload["generated_at"])
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        return True, f"freshness-unavailable-{type(error).__name__.lower()}"

    generated_date = generated_at.astimezone(timezone).date()
    current_date = now.astimezone(timezone).date()
    if generated_date == current_date:
        return False, f"already-updated-{current_date.isoformat()}"
    return True, f"update-due-{current_date.isoformat()}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Decide whether today's scheduled Zenodo update is due.")
    parser.add_argument("--records", type=Path, default=DEFAULT_RECORDS_PATH)
    parser.add_argument("--timezone", default=DEFAULT_TIMEZONE)
    parser.add_argument("--now", help="ISO-8601 timestamp used for deterministic verification")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    timezone = ZoneInfo(args.timezone)
    now = parse_timestamp(args.now) if args.now else datetime.now(timezone)
    should_run, reason = scheduled_update_due(args.records, now, args.timezone)
    print(f"should_run={'true' if should_run else 'false'}")
    print(f"reason={reason}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
