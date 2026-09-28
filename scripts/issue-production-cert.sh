#!/usr/bin/env bash
# Issues + installs the Let's Encrypt cert for ukcobenefitsatlas.net (+www)
# via HTTP-01/webroot. Run this ONLY AFTER the supervisor has pointed DNS
# (A records for @ and www) at this server's IP — HTTP-01 fails otherwise.
# Requires scripts/setup-acme-webroot-service.sh to have been run first.
set -euo pipefail

DOMAIN="ukcobenefitsatlas.net"
WWW_DOMAIN="www.ukcobenefitsatlas.net"
WEBROOT="/home/admin/CoBenefits/acme-challenge"
CERT_DIR="/home/admin/CoBenefits/certs"

echo "--- checking DNS resolves here first ---"
SERVER_IP="$(curl -s https://ifconfig.me || true)"
for d in "$DOMAIN" "$WWW_DOMAIN"; do
  RESOLVED="$(dig +short "$d" | tail -1)"
  echo "$d -> ${RESOLVED:-<no answer>}"
  if [ -z "$RESOLVED" ]; then
    echo "error: $d does not resolve yet — ask your supervisor to add the DNS record first" >&2
    exit 1
  fi
done

mkdir -p "$CERT_DIR"

acme.sh --issue -d "$DOMAIN" -d "$WWW_DOMAIN" --webroot "$WEBROOT"

acme.sh --install-cert -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --key-file       "$CERT_DIR/privkey.pem" \
  --fullchain-file "$CERT_DIR/fullchain.pem"

echo
echo "--- verifying served certificate ---"
sleep 1
curl -skv "https://${DOMAIN}/" 2>&1 | grep -E "subject:|issuer:|HTTP/"
