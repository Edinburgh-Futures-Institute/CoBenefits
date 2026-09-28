#!/usr/bin/env bash
# Sets up a persistent systemd service serving the acme-challenge webroot
# on 127.0.0.1:8090, which Traefik's "cobenefits-acme" router already
# forwards /.well-known/acme-challenge/ requests to (see mlg-traefik's
# config.yaml). Needed once now to issue the ukcobenefitsatlas.net cert,
# and kept running for renewals every ~90 days. Safe to run before DNS
# is pointed at this server — no DNS dependency here.
set -euo pipefail

WEBROOT="/home/admin/CoBenefits/acme-challenge"
SERVICE_NAME=cobenefits-acme
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

mkdir -p "$WEBROOT"

sudo tee "$UNIT_PATH" > /dev/null <<EOF
[Unit]
Description=cobenefits acme-challenge webroot
After=network.target

[Service]
Restart=on-failure
WorkingDirectory=${WEBROOT}
ExecStart=/usr/bin/python3 -m http.server 8090 --bind 127.0.0.1

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
curl -I "http://127.0.0.1:8090/"
