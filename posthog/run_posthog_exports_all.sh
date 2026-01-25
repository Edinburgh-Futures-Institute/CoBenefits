#!/usr/bin/env bash
set -euo pipefail

# Run the PostHog survey (user rating) export with sensible defaults.
#
# Default outputs:
# - posthog/exports/badge_survey_*.csv
#
# Default time window:
# - from 30 days ago (UTC date) until now
#
# Optional overrides (no CLI flags needed):
POSTHOG_EXPORT_AFTER=2026-01-24
# - POSTHOG_EXPORT_BEFORE=YYYY-MM-DD
# - POSTHOG_EXPORT_OUTDIR=posthog/exports
# - POSTHOG_EXPORT_VERBOSE=1

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
posthog_dir="${repo_root}/posthog"
venv_dir="${posthog_dir}/.venv-posthog-export"
env_file="${posthog_dir}/posthog.env"
py_script_survey="${posthog_dir}/posthog_export_survey.py"
py_script_badges="${posthog_dir}/posthog_export_badge_interactions.py"
py_bin="${venv_dir}/bin/python"

outdir="${POSTHOG_EXPORT_OUTDIR:-posthog/exports}"
format="csv"
verbose="${POSTHOG_EXPORT_VERBOSE:-1}"
stamp="${POSTHOG_EXPORT_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

# macOS-compatible "30 days ago" (UTC). If it fails, fall back to 2026-01-01.
after="${POSTHOG_EXPORT_AFTER:-}"
if [[ -z "${after}" ]]; then
  after="$(date -u -v-30d +%F 2>/dev/null || true)"
fi
after="${after:-2026-01-01}"

before="${POSTHOG_EXPORT_BEFORE:-}"

if [[ -f "${env_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${env_file}"
  set +a
fi

if [[ -z "${POSTHOG_PROJECT_ID:-}" || -z "${POSTHOG_PERSONAL_API_KEY:-}" ]]; then
  echo "Missing required PostHog env vars." >&2
  echo "Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY (personal API key, not the JS phc_* key)." >&2
  echo "" >&2
  echo "Quick setup:" >&2
  echo "  cp posthog/posthog.env.example posthog/posthog.env" >&2
  echo "  # edit posthog/posthog.env and fill the values" >&2
  echo "  ./posthog/run_posthog_exports_all.sh" >&2
  exit 1
fi

python3_bin="python3"
if ! command -v "${python3_bin}" >/dev/null 2>&1; then
  echo "python3 not found on PATH" >&2
  exit 1
fi

if [[ ! -d "${venv_dir}" ]]; then
  "${python3_bin}" -m venv "${venv_dir}"
fi

if [[ ! -x "${py_bin}" ]]; then
  echo "Expected venv python at ${py_bin} but it is missing." >&2
  exit 1
fi

cd "${repo_root}"

"${py_bin}" -m pip install --upgrade pip >/dev/null
"${py_bin}" -m pip install -r "${posthog_dir}/requirements.txt" >/dev/null

mkdir -p "${outdir}"

echo "[posthog] exporting with after=${after} before=${before:-<none>} outdir=${outdir}" >&2
echo "[posthog] run stamp: ${stamp}" >&2

declare -a common_args
common_args=(--after "${after}" --outdir "${outdir}" --format "${format}")
if [[ "${verbose}" == "1" ]]; then
  common_args+=(--verbose)
fi

declare -a scripts
scripts=("${py_script_survey}" "${py_script_badges}")

for script in "${scripts[@]}"; do
  if [[ ! -f "${script}" ]]; then
    echo "[posthog] skipping missing script: ${script}" >&2
    continue
  fi
  echo "[posthog] running $(basename "${script}")" >&2
  if [[ -n "${before}" ]]; then
    POSTHOG_EXPORT_STAMP="${stamp}" "${py_bin}" "${script}" "${common_args[@]}" --before "${before}"
  else
    POSTHOG_EXPORT_STAMP="${stamp}" "${py_bin}" "${script}" "${common_args[@]}"
  fi
done

echo "[posthog] all exports complete" >&2
echo "[posthog] outputs written under: ${outdir}" >&2

