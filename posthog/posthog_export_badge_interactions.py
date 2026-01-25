"""
Export badge interaction logs from PostHog.

Outputs:
- badge_interactions*.csv: one row per badge-related event (lightweight, not overly detailed)
- badge_interactions_raw*.jsonl (optional): raw PostHog events for the same window

Events used:
- badge_hover
- badge_hover_duration
- badge_click
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
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple
from urllib.parse import urljoin

import requests


BADGE_EVENTS: Tuple[str, ...] = (
    "badge_hover",
    "badge_hover_duration",
    "badge_click",
    "badge_feedback_shown",
    "badge_feedback_dismissed",
    "badge_feedback_submitted",
)

CSV_FIELDS: Tuple[str, ...] = ("time_utc", "user", "page", "action", "badge", "details")


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


def write_csv(path: str, rows: Iterable[Dict[str, Any]], fieldnames: Tuple[str, ...]) -> int:
    count = 0
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(fieldnames), extrasaction="ignore")
        w.writeheader()
        for r in rows:
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


def _day(ts: Optional[str]) -> Optional[str]:
    if isinstance(ts, str) and len(ts) >= 10:
        return ts[:10]
    return None


def _to_readable_time(ts: Optional[str]) -> Optional[str]:
    """
    Convert PostHog timestamp to a compact UTC string: YYYY-MM-DD HH:MM:SSZ.
    Falls back to the original string if parsing fails.
    """
    if not isinstance(ts, str) or not ts:
        return None
    s = ts.strip()
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc).replace(microsecond=0)
        return dt.strftime("%Y-%m-%d %H:%M:%SZ")
    except Exception:
        return s


def _normalize_pathname(pathname: Optional[str]) -> Optional[str]:
    if not pathname:
        return None
    p = str(pathname).strip()
    if not p:
        return None
    if p.startswith("/CoBenefits/"):
        p = p[len("/CoBenefits") :]
    elif p == "/CoBenefits":
        p = "/"
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p


def _clean_int(v: Any) -> Optional[int]:
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


def _interacted_badge_ids(props: Dict[str, Any]) -> Optional[str]:
    v = props.get("interacted_badge_ids")
    if v is None:
        return None
    if isinstance(v, (list, tuple)):
        return json_dumps(list(v))
    # Sometimes it may come as a string already.
    if isinstance(v, str) and v.strip():
        return v.strip()
    return json_dumps(v)


def _fmt_duration_ms(ms: Optional[int]) -> Optional[str]:
    if ms is None:
        return None
    if ms < 1000:
        return f"{ms}ms"
    seconds = ms / 1000.0
    if seconds < 10:
        return f"{seconds:.1f}s"
    return f"{seconds:.0f}s"


def _fmt_badge(badge_id: Any, badge_label: Any) -> Optional[str]:
    bid = str(badge_id).strip() if isinstance(badge_id, (str, int, float)) and str(badge_id).strip() else ""
    lbl = str(badge_label).strip() if isinstance(badge_label, str) and badge_label.strip() else ""
    if bid and lbl and lbl.lower() != bid.lower():
        return f"{bid} ({lbl})"
    return bid or (lbl or None)


def _fmt_id_list(ids_value: Any, *, max_items: int = 6) -> Optional[str]:
    """
    Human-compact representation of interacted badge ids.
    If the list is long, we keep the first few and append "…".
    """
    if ids_value is None:
        return None

    ids: List[str] = []
    if isinstance(ids_value, (list, tuple)):
        ids = [str(x).strip() for x in ids_value if str(x).strip()]
    elif isinstance(ids_value, str):
        s = ids_value.strip()
        if not s:
            return None
        if s.startswith("[") and s.endswith("]"):
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    ids = [str(x).strip() for x in parsed if str(x).strip()]
                else:
                    return s
            except Exception:
                return s
        else:
            return s
    else:
        return str(ids_value)

    if not ids:
        return None
    if len(ids) <= max_items:
        return ", ".join(ids)
    return ", ".join(ids[:max_items]) + ", …"


def _action_label(event_name: str) -> str:
    return {
        "badge_hover": "hover",
        "badge_hover_duration": "hover_end",
        "badge_click": "click",
        "badge_feedback_shown": "feedback_shown",
        "badge_feedback_dismissed": "feedback_dismissed",
        "badge_feedback_submitted": "feedback_submitted",
    }.get(event_name, event_name)


def _details_from_props(event_name: str, props: Dict[str, Any]) -> str:
    parts: List[str] = []

    if event_name == "badge_hover":
        mode = props.get("mode")
        if isinstance(mode, str) and mode:
            parts.append(f"mode={mode}")

    if event_name == "badge_hover_duration":
        mode = props.get("mode")
        if isinstance(mode, str) and mode:
            parts.append(f"mode={mode}")
        dur = _fmt_duration_ms(_clean_int(props.get("duration_ms")))
        if dur:
            parts.append(f"duration={dur}")
        ended_by = props.get("ended_by")
        if isinstance(ended_by, str) and ended_by:
            parts.append(f"ended_by={ended_by}")

    if event_name == "badge_click":
        click_kind = props.get("badge_click_kind")
        if isinstance(click_kind, str) and click_kind:
            parts.append(f"kind={click_kind}")
        btn = _clean_int(props.get("button"))
        if btn is not None:
            parts.append(f"button={btn}")

    if event_name.startswith("badge_feedback_"):
        count = _clean_int(props.get("interacted_badge_count"))
        if count is not None:
            parts.append(f"badges={count}")
        ids = _fmt_id_list(props.get("interacted_badge_ids"))
        if ids:
            parts.append(f"ids={ids}")
        thr = _clean_int(props.get("threshold"))
        if thr is not None:
            parts.append(f"threshold={thr}")
        if event_name == "badge_feedback_submitted":
            rating = _clean_int(props.get("rating"))
            if rating is not None:
                parts.append(f"rating={rating}")

    return "; ".join(parts)


def flatten_badge_event(ev: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name = ev.get("event")
    if name not in BADGE_EVENTS:
        return None
    props = ev.get("properties") if isinstance(ev.get("properties"), dict) else {}
    ts = extract_timestamp(ev)
    page = _normalize_pathname(props.get("pathname") if isinstance(props.get("pathname"), str) else None)
    badge = _fmt_badge(props.get("badge_id"), props.get("badge_label"))
    details = _details_from_props(str(name), props)
    return {
        "time_utc": _to_readable_time(ts),
        "user": extract_distinct_id(ev),
        "page": page,
        "action": _action_label(str(name)),
        "badge": badge,
        "details": details,
        # internal-only: used for sorting
        "_sort_ts": ts or "",
    }


def iter_flat_rows(events: Iterable[Dict[str, Any]]) -> Iterator[Dict[str, Any]]:
    for ev in events:
        row = flatten_badge_event(ev)
        if row is not None:
            yield row


def _sorted_rows(events: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Human-friendly CSV should be chronological.
    PostHog API pagination is per-event, so we buffer and sort.
    """
    rows = list(iter_flat_rows(events))
    rows.sort(key=lambda r: (str(r.get("_sort_ts") or ""), str(r.get("action") or "")))
    for r in rows:
        r.pop("_sort_ts", None)
    return rows


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Export badge interaction logs (hover/click + feedback prompt events) from PostHog.")
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
    raw_path = os.path.join(args.outdir, f"badge_interactions_raw{suffix}.jsonl")
    csv_path = os.path.join(args.outdir, f"badge_interactions{suffix}.csv")

    raw_iter = collect_events(cfg, BADGE_EVENTS, after=after, before=before, limit=args.limit, verbose=args.verbose)

    if args.format == "jsonl":
        n = write_jsonl(raw_path, raw_iter)
        if args.verbose:
            print(f"[done] wrote {n} raw badge events -> {raw_path}", file=sys.stderr)
        return 0

    if args.format == "csv":
        n = write_csv(csv_path, _sorted_rows(raw_iter), CSV_FIELDS)
        if args.verbose:
            print(f"[done] wrote {n} badge interaction rows -> {csv_path}", file=sys.stderr)
        return 0

    # both: need two passes -> buffer in memory (badge volume should be manageable)
    evs = list(raw_iter)
    n_raw = write_jsonl(raw_path, evs)
    n_csv = write_csv(csv_path, _sorted_rows(evs), CSV_FIELDS)
    if args.verbose:
        print(f"[done] wrote {n_raw} raw badge events -> {raw_path}", file=sys.stderr)
        print(f"[done] wrote {n_csv} badge interaction rows -> {csv_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

