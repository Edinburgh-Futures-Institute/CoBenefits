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
THIS_SERVER_IP="89.58.55.170"

# acme.sh's installer wires it up as a shell alias in ~/.bashrc (interactive
# shells only) — a non-interactive script never sees it, so call the real
# binary directly.
ACME_BIN="$HOME/.acme.sh/acme.sh"
if [ ! -x "$ACME_BIN" ]; then
  echo "error: $ACME_BIN not found — is acme.sh actually installed under this user?" >&2
  exit 1
fi

echo "--- checking DNS resolves to this server ($THIS_SERVER_IP) first ---"
for d in "$DOMAIN" "$WWW_DOMAIN"; do
  RESOLVED="$(getent ahostsv4 "$d" 2>/dev/null | awk '{print $1; exit}')"
  if [ -z "$RESOLVED" ]; then
    RESOLVED="$(python3 -c "import socket,sys
try:
    print(socket.gethostbyname(sys.argv[1]))
except Exception:
    pass" "$d")"
  fi
  echo "$d -> ${RESOLVED:-<no answer>}"
  if [ "$RESOLVED" != "$THIS_SERVER_IP" ]; then
    echo "error: $d resolves to '${RESOLVED:-<nothing>}', not $THIS_SERVER_IP — DNS hasn't been updated/propagated yet" >&2
    exit 1
  fi
done

mkdir -p "$CERT_DIR"

"$ACME_BIN" --issue -d "$DOMAIN" -d "$WWW_DOMAIN" --webroot "$WEBROOT"

"$ACME_BIN" --install-cert -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --key-file       "$CERT_DIR/privkey.pem" \
  --fullchain-file "$CERT_DIR/fullchain.pem"

echo
echo "--- verifying served certificate ---"
sleep 1
curl -skv "https://${DOMAIN}/" 2>&1 | grep -E "subject:|issuer:|HTTP/"
