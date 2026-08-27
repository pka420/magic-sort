#!/usr/bin/env bash
# Installs magic-sort's host nginx site into sites-available/sites-enabled.
#
# Each site on the VPS owns one file in /etc/nginx/sites-available, enabled
# via a symlink in sites-enabled (Debian layout). All sites share the host's
# single nginx — see /etc/nginx/nginx.conf (`include sites-enabled/*`).
#
#   sudo ./infra/install-nginx.sh
#
# Host nginx is a plain reverse proxy to Docker: / -> 127.0.0.1:3000 (frontend
# container) and /api/ -> 127.0.0.1:8000 (backend container). No files are
# served from the host; `docker compose up -d` must be running.
# Idempotent: run again after changing infra/nginx.conf.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (sudo)." >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/nginx.conf"
DEST_AVAILABLE="/etc/nginx/sites-available/magic-sort"
DEST_ENABLED="/etc/nginx/sites-enabled/magic-sort"
OLD_CONF_D="/etc/nginx/conf.d/magic-sort.conf"

# Install to sites-available and enable via symlink (Debian convention).
install -m 644 "$SRC" "$DEST_AVAILABLE"
ln -sf "$DEST_AVAILABLE" "$DEST_ENABLED"

# Clean up legacy location from before the sites-enabled migration.
if [ -f "$OLD_CONF_D" ]; then
  rm -f "$OLD_CONF_D"
  echo "Removed legacy $OLD_CONF_D"
fi

# Refuse to leave nginx broken: test first, reload only if the config is sound.
nginx -t
systemctl reload nginx

echo "magic-sort nginx site installed to $DEST_AVAILABLE (enabled via $DEST_ENABLED)"
