#!/usr/bin/env python3
"""Refresh cases.json from the Supreme Court's oral argument audio pages.

Run by .github/workflows/update-cases.yml once a day. It reads the argument
list for the current term and the previous one, then visits each new case's
audio page to find the exact MP3 and transcript links.

Usage:
    python scripts/update_cases.py              # current + previous term
    python scripts/update_cases.py --terms 2026 # specific term(s)
    python scripts/update_cases.py --fixtures DIR  # read saved HTML instead of the network (testing)

Standard library only, so the workflow needs no installs.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

try:
    from zoneinfo import ZoneInfo
    EASTERN = ZoneInfo("America/New_York")
except Exception:  # pragma: no cover - zoneinfo missing
    EASTERN = dt.timezone(dt.timedelta(hours=-5))

BASE = "https://www.supremecourt.gov"
LIST_URL = BASE + "/oral_arguments/argument_audio/{term}"
DETAIL_URL = BASE + "/oral_arguments/audio/{term}/{docket}"
MP3_GUESS = BASE + "/media/audio/mp3files/{docket}.mp3"

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "cases.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; scotusfi-updater/1.0; +https://scotusfi.com)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

ROW_RE = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.I | re.S)
CELL_RE = re.compile(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", re.I | re.S)
AUDIO_LINK_RE = re.compile(
    r"""<a\b[^>]*href\s*=\s*["']([^"']*?/audio/(\d{4})/([A-Za-z0-9._-]+))["'][^>]*>""",
    re.I,
)
DATE_RE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b")
MP3_RE = re.compile(r"""href\s*=\s*["']([^"']+?\.mp3)["']""", re.I)
PDF_RE = re.compile(r"""href\s*=\s*["']([^"']*argument_transcripts[^"']+?\.pdf)["']""", re.I)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def current_term(today: dt.date | None = None) -> int:
    """A term starts on the first Monday of October and runs into the next summer."""
    today = today or dt.datetime.now(EASTERN).date()
    return today.year if today.month >= 10 else today.year - 1


def text_of(fragment: str) -> str:
    return WS_RE.sub(" ", html.unescape(TAG_RE.sub(" ", fragment))).strip()


class Fetcher:
    def __init__(self, fixtures: Path | None = None, delay: float = 0.6):
        self.fixtures = fixtures
        self.delay = delay
        self._last = 0.0

    def get(self, url: str) -> str:
        if self.fixtures:
            name = re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("supremecourt.gov/")[-1]) + ".html"
            path = self.fixtures / name
            if not path.exists():
                raise FileNotFoundError(path)
            return path.read_text(encoding="utf-8")

        wait = self.delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        last_err: Exception | None = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=30) as resp:
                    self._last = time.monotonic()
                    charset = resp.headers.get_content_charset() or "utf-8"
                    return resp.read().decode(charset, errors="replace")
            except (urllib.error.URLError, TimeoutError) as err:
                last_err = err
                time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"GET {url} failed: {last_err}")


def parse_list(page: str, term: int) -> list[dict]:
    """Pull docket, case name and date from a term's argument audio list."""
    cases: dict[str, dict] = {}
    for row in ROW_RE.findall(page):
        link = AUDIO_LINK_RE.search(row)
        if not link:
            continue
        _href, link_term, docket = link.groups()
        if int(link_term) != term:
            continue

        cells = CELL_RE.findall(row) or [row]
        first = text_of(cells[0])
        name = first[len(docket):].strip() if first.startswith(docket) else first.replace(docket, "", 1).strip()
        name = name.strip(" -–—:")

        date_iso = None
        m = DATE_RE.search(text_of(row))
        if m:
            mo, day, yr = (int(x) for x in m.groups())
            yr = yr + 2000 if yr < 100 else yr
            try:
                date_iso = dt.date(yr, mo, day).isoformat()
            except ValueError:
                pass

        if docket in cases or not name:
            continue
        cases[docket] = {
            "docket": docket,
            "name": name,
            "date": date_iso,
            "page": DETAIL_URL.format(term=term, docket=docket),
        }
    return list(cases.values())


def parse_detail(page: str, page_url: str) -> dict:
    mp3 = MP3_RE.search(page)
    pdf = PDF_RE.search(page)
    return {
        "audio": urljoin(page_url, html.unescape(mp3.group(1))) if mp3 else None,
        "transcript": urljoin(page_url, html.unescape(pdf.group(1))) if pdf else None,
    }


def load_existing() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"terms": []}


def update(terms: list[int], fetch: Fetcher) -> tuple[dict, list[str]]:
    existing = load_existing()
    old_terms = {t["term"]: t for t in existing.get("terms", [])}
    errors: list[str] = []
    new_terms = []

    for term in terms:
        old_cases = {c["docket"]: c for c in old_terms.get(term, {}).get("cases", [])}
        try:
            listed = parse_list(fetch.get(LIST_URL.format(term=term)), term)
        except Exception as err:  # keep what we had
            errors.append(f"term {term}: {err}")
            if term in old_terms:
                new_terms.append(old_terms[term])
            continue

        if not listed and old_cases:
            errors.append(f"term {term}: list page had no cases; keeping previous data")
            new_terms.append(old_terms[term])
            continue

        cases = []
        for item in listed:
            prev = old_cases.get(item["docket"], {})
            case = {**prev, **item}
            if not prev.get("checked"):
                url = DETAIL_URL.format(term=term, docket=item["docket"])
                try:
                    detail = parse_detail(fetch.get(url), url)
                    case.update({k: v for k, v in detail.items() if v})
                    case["checked"] = bool(detail["audio"])
                except Exception as err:
                    errors.append(f"{item['docket']}: {err}")
            case.setdefault("audio", MP3_GUESS.format(docket=item["docket"]))
            case.setdefault("transcript", None)
            case.setdefault("checked", False)
            cases.append(case)

        cases.sort(key=lambda c: (c.get("date") or "", c["docket"]), reverse=True)
        new_terms.append({"term": term, "cases": cases})

    new_terms.sort(key=lambda t: t["term"], reverse=True)
    return {"terms": new_terms}, errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--terms", type=int, nargs="+", help="term years to fetch (default: current and previous)")
    ap.add_argument("--fixtures", type=Path, help="read saved HTML from this folder instead of the network")
    args = ap.parse_args()

    term = current_term()
    terms = args.terms or [term, term - 1]
    data, errors = update(terms, Fetcher(args.fixtures))

    for e in errors:
        print("warning:", e, file=sys.stderr)

    old = load_existing()
    if old.get("terms") == data["terms"]:
        print("No changes.")
    else:
        data = {
            "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            "source": "https://www.supremecourt.gov/oral_arguments/argument_audio.aspx",
            **data,
        }
        OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        counts = ", ".join(f"OT{t['term']}: {len(t['cases'])}" for t in data["terms"])
        print(f"Wrote {OUT.name} ({counts})")

    total = sum(len(t["cases"]) for t in data["terms"])
    return 1 if total == 0 else 0


if __name__ == "__main__":
    sys.exit(main())
