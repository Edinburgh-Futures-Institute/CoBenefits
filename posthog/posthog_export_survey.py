"""
Export badge feedback survey data from PostHog.

Outputs (CSV):
- badge_survey_responses*.csv: one row per submitted response (stars + comment)
- badge_survey_locations*.csv: counts of shown/submitted/not-submitted by pathname

Events used:
- badge_feedback_shown
- badge_feedback_dismissed
- badge_feedback_submitted
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple
from urllib.parse import urljoin

import requests


SURVEY_EVENTS: Tuple[str, ...] = ("badge_feedback_shown", "badge_feedback_dismissed", "badge_feedback_submitted")
SUBMIT_EVENT = "badge_feedback_submitted"


def iso_now_utc() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_host(host: str) -> str:
    host = (host or "").strip()
    if not host:
        return "https://eu.posthog.com"
    return host.rstrip("/")


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def to_iso8601(value: str) -> str:
    """
    Accepts YYYY-MM-DD or ISO timestamp.
    Produces an ISO8601 string in UTC with Z suffix.
    """
    value = value.strip()
    if not value:
        raise ValueError("empty datetime")
    # Allow date-only for convenience.
    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        return f"{value}T00:00:00Z"
    # If user provided a Z timestamp, keep it.
    if value.endswith("Z"):
        return value
    # Try parsing as ISO and ensure timezone.
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def json_dumps(v: Any) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"), default=str)


@dataclass(frozen=True)
class PostHogConfig:
    host: str
    project_id: str
    personal_api_key: str
    timeout_s: int = 30
    max_retries: int = 6
    backoff_s: float = 1.0

    @property
    def events_url(self) -> str:
        return f"{self.host}/api/projects/{self.project_id}/events/"

    @property
    def headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.personal_api_key}"}


def request_json(
    session: requests.Session,
    url: str,
    *,
    headers: Dict[str, str],
    params: Optional[Dict[str, Any]] = None,
    timeout_s: int = 30,
    max_retries: int = 6,
    backoff_s: float = 1.0,
    verbose: bool = False,
) -> Dict[str, Any]:
    last_err: Optional[BaseException] = None
    for attempt in range(max_retries + 1):
        try:
            resp = session.get(url, headers=headers, params=params, timeout=timeout_s)

            # Fail fast on non-retryable client errors (wrong key/project/host/etc).
            if 400 <= resp.status_code < 500 and resp.status_code != 429:
                detail = ""
                try:
                    detail = resp.text.strip()
                except Exception:
                    detail = ""
                msg = f"PostHog request failed ({resp.status_code}) for {resp.request.method} {resp.url}"
                if resp.status_code in (401, 403):
                    msg += (
                        "\nAuth error. Ensure you're using a *personal API key* (typically starts with 'phx_'), "
                        "not the JS project key ('phc_*'), and that POSTHOG_PROJECT_ID matches the project."
                    )
                if detail:
                    msg += f"\nResponse: {detail[:500]}"
                raise RuntimeError(msg)

            if resp.status_code in (429, 500, 502, 503, 504):
                # Rate limit / transient backend errors.
                if attempt < max_retries:
                    wait = backoff_s * (2**attempt)
                    if verbose:
                        print(f"[posthog] transient {resp.status_code}; retrying in {wait:.1f}s", file=sys.stderr)
                    time.sleep(wait)
                    continue
            resp.raise_for_status()
            return resp.json()
        except BaseException as e:
            last_err = e
            if attempt >= max_retries:
                break
            wait = backoff_s * (2**attempt)
            if verbose:
                print(f"[posthog] request error; retrying in {wait:.1f}s: {e}", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"PostHog request failed after retries: {last_err}")


def iter_events(
    cfg: PostHogConfig,
    *,
    event_name: Optional[str],
    after: Optional[str],
    before: Optional[str],
    limit: int,
    verbose: bool,
) -> Iterator[Dict[str, Any]]:
    """
    Iterates PostHog events.

    Uses cursor pagination via the `next` URL in API responses.
    """
    session = requests.Session()
    url: Optional[str] = cfg.events_url
    params: Optional[Dict[str, Any]] = {"limit": int(limit)}
    if event_name:
        params["event"] = event_name
    if after:
        params["after"] = after
    if before:
        params["before"] = before

    page = 0
    while url:
        page += 1
        data = request_json(
            session,
            url,
            headers=cfg.headers,
            params=params,
            timeout_s=cfg.timeout_s,
            max_retries=cfg.max_retries,
            backoff_s=cfg.backoff_s,
            verbose=verbose,
        )
        params = None  # 'next' already includes any query params.
        results = data.get("results") or []
        if verbose:
            name = event_name or "*"
            print(f"[posthog] {name}: page {page} -> {len(results)} events", file=sys.stderr)
        for item in results:
            if isinstance(item, dict):
                yield item
        nxt = data.get("next")
        if isinstance(nxt, str) and nxt:
            # PostHog usually returns an absolute URL, but some deployments may return a relative path.
            url = urljoin(cfg.host + "/", nxt)
        else:
            url = None


def collect_events(
    cfg: PostHogConfig,
    event_names: Tuple[str, ...],
    *,
    after: Optional[str],
    before: Optional[str],
    limit: int,
    verbose: bool,
) -> Iterator[Dict[str, Any]]:
    for name in event_names:
        yield from iter_events(cfg, event_name=name, after=after, before=before, limit=limit, verbose=verbose)


def write_jsonl(path: str, rows: Iterable[Dict[str, Any]]) -> int:
    count = 0
    with open(path, "w", encoding="utf-8") as f:
        for ev in rows:
            f.write(json_dumps(ev))
            f.write("\n")
            count += 1
    return count


def write_csv(path: str, rows: Iterable[Dict[str, Any]]) -> int:
    rows_iter = iter(rows)
    try:
        first = next(rows_iter)
    except StopIteration:
        with open(path, "w", newline="", encoding="utf-8") as f:
            f.write("")
        return 0

    fieldnames = list(first.keys())
    count = 0
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerow(first)
        count += 1
        for r in rows_iter:
            w.writerow(r)
            count += 1
    return count


def extract_distinct_id(ev: Dict[str, Any]) -> Optional[str]:
    distinct_id = ev.get("distinct_id")
    if isinstance(distinct_id, str) and distinct_id:
        return distinct_id
    props = ev.get("properties") or {}
    if isinstance(props, dict):
        v = props.get("distinct_id")
        if isinstance(v, str) and v:
            return v
    return None


def extract_timestamp(ev: Dict[str, Any]) -> Optional[str]:
    ts = ev.get("timestamp")
    if isinstance(ts, str) and ts:
        return ts
    props = ev.get("properties") or {}
    if isinstance(props, dict):
        v = props.get("timestamp")
        if isinstance(v, str) and v:
            return v
    return None


def clean_text(v: Any) -> Optional[str]:
    if v is None:
        return None
    if not isinstance(v, str):
        v = str(v)
    v = v.replace("\r\n", "\n").replace("\r", "\n").strip()
    return v or None


def clean_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        try:
            return int(float(s))
        except ValueError:
            return None
    return None


def _day(ts: Optional[str]) -> Optional[str]:
    # ISO timestamps sort lexicographically; YYYY-MM-DD is first 10 chars.
    if isinstance(ts, str) and len(ts) >= 10:
        return ts[:10]
    return None


def _pathname(props: Dict[str, Any]) -> Optional[str]:
    v = props.get("pathname")
    return v if isinstance(v, str) and v else None


def _normalize_pathname(pathname: Optional[str]) -> Optional[str]:
    """
    Normalizes pathnames so local dev ("/cobenefit") and deployed subpath ("/CoBenefits/cobenefit")
    are grouped together.
    """
    if not pathname:
        return None
    p = pathname.strip()
    if not p:
        return None
    # Common deployment prefix in this repo.
    if p.startswith("/CoBenefits/"):
        p = p[len("/CoBenefits") :]
    elif p == "/CoBenefits":
        p = "/"
    # Remove trailing slash (except root).
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p


def _survey_group_for_pathname(pathname: Optional[str]) -> Optional[str]:
    """
    Buckets pages into exactly the three reporting groups requested:
    - cobenefit: any cobenefit page
    - nation: nation page(s)
    - lad: lad page(s)
    """
    p = _normalize_pathname(pathname)
    if not p:
        return None
    if p.startswith("/cobenefit"):
        return "cobenefit"
    if p.startswith("/location"):
        return "cobenefit"
    if p.startswith("/nation"):
        return "nation"
    if p.startswith("/lad"):
        return "lad"
    return None


def flatten_response(ev: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if ev.get("event") != SUBMIT_EVENT:
        return None
    props = ev.get("properties") if isinstance(ev.get("properties"), dict) else {}
    return {
        "timestamp": extract_timestamp(ev),
        "day": _day(extract_timestamp(ev)),
        "distinct_id": extract_distinct_id(ev),
        "pathname": _normalize_pathname(_pathname(props)),
        "rating": clean_int(props.get("rating")),
        "rating_label": props.get("rating_label"),
        "comment": clean_text(props.get("comment")),
    }


def iter_responses(events: Iterable[Dict[str, Any]]) -> Iterator[Dict[str, Any]]:
    for ev in events:
        r = flatten_response(ev)
        if r is not None:
            yield r


def build_location_rows(events: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns a simple location summary with exactly 3 rows (cobenefit/nation/lad) for the selected time window:
    - how often the badge survey was shown
    - how often it was submitted
    - how often it was not submitted (shown - submitted)

    Notes:
    - "not submitted" includes all cases where the survey was shown but never submitted
      (e.g. dismissed, ignored, navigated away, etc.).
    """
    counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"shown": 0, "submitted": 0})

    for ev in events:
        name = ev.get("event")
        if name not in SURVEY_EVENTS:
            continue
        props = ev.get("properties") if isinstance(ev.get("properties"), dict) else {}
        group = _survey_group_for_pathname(_pathname(props))
        if not group:
            continue

        if name == "badge_feedback_shown":
            counts[group]["shown"] += 1
        elif name == "badge_feedback_submitted":
            counts[group]["submitted"] += 1

    rows: List[Dict[str, Any]] = []
    for group in ("cobenefit", "nation", "lad"):
        c = counts.get(group, {"shown": 0, "submitted": 0})
        shown = c["shown"]
        submitted = c["submitted"]
        not_submitted = max(0, shown - submitted)
        response_rate = (submitted / shown) if shown else None
        rows.append(
            {
                "badge_survey_page_group": group,
                "badge_survey_shown_events": shown,
                "badge_survey_submitted_events": submitted,
                "badge_survey_not_submitted_events": not_submitted,
                "badge_survey_response_rate": response_rate,
            }
        )

    return rows


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Export badge feedback survey data (responses + location summary) from PostHog.")
    p.add_argument("--after", required=True, help="Start (inclusive). Accepts YYYY-MM-DD or ISO datetime.")
    p.add_argument("--before", default=None, help="End (exclusive). Accepts YYYY-MM-DD or ISO datetime.")
    p.add_argument("--outdir", default="posthog/exports", help="Output directory (default: posthog/exports).")
    p.add_argument("--limit", type=int, default=200, help="Page size for API requests (default: 200).")
    p.add_argument("--format", choices=("csv", "jsonl", "both"), default="csv", help="Write raw JSONL and/or CSV outputs.")
    p.add_argument("--stable-names", action="store_true", help="Write stable filenames (no timestamp), overwriting on each run.")
    p.add_argument("--host", default=os.getenv("POSTHOG_HOST", ""), help="PostHog app host (default: EU cloud).")
    p.add_argument("--project-id", default=os.getenv("POSTHOG_PROJECT_ID", ""), help="PostHog project ID.")
    p.add_argument("--api-key", default=os.getenv("POSTHOG_PERSONAL_API_KEY", ""), help="PostHog personal API key.")
    p.add_argument("--verbose", action="store_true", help="Print progress to stderr.")

    args = p.parse_args(argv)

    host = normalize_host(args.host)
    if not args.project_id:
        raise SystemExit("Missing PostHOG project id: set POSTHOG_PROJECT_ID or pass --project-id")
    if not args.api_key:
        raise SystemExit("Missing PostHOG personal api key: set POSTHOG_PERSONAL_API_KEY or pass --api-key")

    after = to_iso8601(args.after)
    before = to_iso8601(args.before) if args.before else None

    cfg = PostHogConfig(host=host, project_id=str(args.project_id), personal_api_key=str(args.api_key))
    ensure_dir(args.outdir)

    stamp = (os.getenv("POSTHOG_EXPORT_STAMP") or "").strip()
    if not stamp:
        stamp = iso_now_utc().replace(":", "").replace("-", "")
    suffix = "" if args.stable_names else f"_{stamp}"
    raw_path = os.path.join(args.outdir, f"badge_survey_raw{suffix}.jsonl")
    responses_path = os.path.join(args.outdir, f"badge_survey_responses{suffix}.csv")
    locations_path = os.path.join(args.outdir, f"badge_survey_locations{suffix}.csv")

    raw_iter = collect_events(cfg, SURVEY_EVENTS, after=after, before=before, limit=args.limit, verbose=args.verbose)

    if args.format == "jsonl":
        n = write_jsonl(raw_path, raw_iter)
        if args.verbose:
            print(f"[done] wrote {n} raw survey events -> {raw_path}", file=sys.stderr)
        return 0

    if args.format == "csv":
        # Need one pass for responses + locations. Buffer in memory (survey volume should be manageable).
        evs = list(raw_iter)
        n_resp = write_csv(responses_path, iter_responses(evs))
        location_rows = build_location_rows(evs)
        n_loc = write_csv(locations_path, location_rows)
        if args.verbose:
            print(f"[done] wrote {n_resp} survey responses -> {responses_path}", file=sys.stderr)
            print(f"[done] wrote {n_loc} location summary rows -> {locations_path}", file=sys.stderr)
        return 0

    # both
    evs = list(raw_iter)
    n_raw = write_jsonl(raw_path, evs)
    n_resp = write_csv(responses_path, iter_responses(evs))
    location_rows = build_location_rows(evs)
    n_loc = write_csv(locations_path, location_rows)
    if args.verbose:
        print(f"[done] wrote {n_raw} raw survey events -> {raw_path}", file=sys.stderr)
        print(f"[done] wrote {n_resp} survey responses -> {responses_path}", file=sys.stderr)
        print(f"[done] wrote {n_loc} location summary rows -> {locations_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

