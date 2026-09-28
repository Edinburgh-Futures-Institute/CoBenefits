#!/usr/bin/env bash
# Sets up a systemd service that serves this repo's built static site
# (adapter-static output in build/) on 127.0.0.1:8089, for Traefik to
# reverse-proxy to. Run this ON THE SERVER, from inside the CoBenefits
# repo directory, after `npm run build` has produced build/.
set -euo pipefail

PORT=8089
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME=cobenefits
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

if [ ! -d "$REPO_DIR/build" ]; then
  echo "error: $REPO_DIR/build does not exist — run 'npm run build' first" >&2
  exit 1
fi

SERVE_PATH="$(command -v serve || true)"
if [ -z "$SERVE_PATH" ]; then
  echo "error: 'serve' not found on PATH — run 'npm install -g serve' first" >&2
  exit 1
fi
echo "Using serve at: $SERVE_PATH"

# Free the port if an old foreground/manual `serve` is still holding it.
EXISTING_PID="$(sudo lsof -t -i TCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$EXISTING_PID" ]; then
  echo "Killing process already listening on :$PORT (pid $EXISTING_PID)"
  kill "$EXISTING_PID" || true
  sleep 1
fi

sudo tee "$UNIT_PATH" > /dev/null <<EOF
[Unit]
Description=cobenefits static site
After=network.target

[Service]
Restart=on-failure
WorkingDirectory=${REPO_DIR}
ExecStart=${SERVE_PATH} -l tcp://127.0.0.1:${PORT} build

[Install]
WantedBy=default.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"

echo
echo "--- systemctl status ---"
sudo systemctl status "$SERVICE_NAME" --no-pager || true

echo
echo "--- local curl check ---"
sleep 1
curl -I "http://127.0.0.1:${PORT}/"
