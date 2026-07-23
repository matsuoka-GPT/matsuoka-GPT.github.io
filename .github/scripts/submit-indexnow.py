#!/usr/bin/env python3
"""Submit changed public HTML URLs to IndexNow for GitHub Pages."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HOST = os.environ.get("INDEXNOW_HOST", "matsuoka-gpt.github.io")
BASE_URL = os.environ.get("INDEXNOW_BASE_URL", f"https://{HOST}").rstrip("/")
ENDPOINT = os.environ.get("INDEXNOW_ENDPOINT", "https://api.indexnow.org/indexnow")
KEY = os.environ.get("INDEXNOW_KEY", "").strip()
BEFORE = os.environ.get("BEFORE_SHA", "").strip()
AFTER = os.environ.get("AFTER_SHA", "HEAD").strip() or "HEAD"

STATUS_REASONS = {
    400: "Bad Request: URL or API key format is invalid. Check JSON, URL encoding, and INDEXNOW_KEY.",
    403: "Forbidden: key validation failed. Confirm the key file is publicly available and contains the key.",
    422: "Unprocessable Entity: submitted URLs must belong to the host and match the key/host schema.",
    429: "Too Many Requests: IndexNow rate limit reached. Retry later or reduce submission frequency.",
}


def run_git(args: list[str]) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def resolve_base_sha() -> str:
    if BEFORE and BEFORE != "0" * 40:
        try:
            run_git(["cat-file", "-e", f"{BEFORE}^{{commit}}"])
            return BEFORE
        except subprocess.CalledProcessError:
            print(f"before SHA {BEFORE} is unavailable; falling back to {AFTER}^", file=sys.stderr)
    try:
        return run_git(["rev-parse", f"{AFTER}^"])
    except subprocess.CalledProcessError:
        return run_git(["hash-object", "-t", "tree", "/dev/null"])


def changed_html_paths(base: str) -> list[str]:
    raw = subprocess.check_output(
        ["git", "diff", "--name-status", "-z", base, AFTER, "--", "*.html", "*.htm"],
        text=False,
    )
    parts = raw.decode("utf-8", errors="surrogateescape").split("\0")
    paths: list[str] = []
    i = 0
    while i < len(parts) - 1:
        status = parts[i]
        i += 1
        if not status:
            continue
        code = status[0]
        if code in {"A", "M", "D"}:
            paths.append(parts[i])
            i += 1
        elif code in {"R", "C"}:
            old_path = parts[i]
            new_path = parts[i + 1]
            i += 2
            if code == "R":
                paths.append(old_path)
            paths.append(new_path)
        else:
            i += 1
    return paths


def is_public_html(path: str) -> bool:
    p = Path(path)
    if any(part.startswith(".") for part in p.parts):
        return False
    return p.suffix.lower() in {".html", ".htm"}


def path_to_url(path: str) -> str:
    normalized = path.replace(os.sep, "/").lstrip("/")
    return f"{BASE_URL}/{urllib.parse.quote(normalized, safe='/')}"


def submit(urls: list[str]) -> int:
    if not KEY:
        print("INDEXNOW_KEY secret is not set; skipping IndexNow submission.")
        return 0
    if not urls:
        print("No changed public HTML URLs to submit to IndexNow.")
        return 0

    key_location = f"{BASE_URL}/{urllib.parse.quote(KEY, safe='')}.txt"
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": key_location,
        "urlList": urls,
    }
    print(f"Submitting {len(urls)} URL(s) to IndexNow endpoint: {ENDPOINT}")
    for url in urls:
        print(f"- {url}")

    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status = response.status
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        status = exc.code
        body = exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        print(f"IndexNow submission failed: {exc}", file=sys.stderr)
        return 1

    if status in {200, 202}:
        print(f"IndexNow submission succeeded with HTTP {status}.")
        return 0

    print(f"IndexNow submission failed with HTTP {status}.", file=sys.stderr)
    print(STATUS_REASONS.get(status, "Unexpected IndexNow response. Check endpoint availability and response body."), file=sys.stderr)
    if body:
        print(f"Response body: {body}", file=sys.stderr)
    return 1


def main() -> int:
    base = resolve_base_sha()
    print(f"Detecting changed HTML files between {base} and {AFTER}.")
    paths = changed_html_paths(base)
    urls = sorted({path_to_url(path) for path in paths if is_public_html(path)})
    return submit(urls)


if __name__ == "__main__":
    raise SystemExit(main())
