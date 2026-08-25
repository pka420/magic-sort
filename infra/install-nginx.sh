#!/usr/bin/env bash
# Installs magic-sort's nginx site block into the host's single nginx and
# reloads it. Every site on the box ships one of these; each drops an
# independent server block into /etc/nginx/conf.d and they share the one nginx.
#
#   sudo ./infra/install-nginx.sh
#
# Serves the built game from /srv/magic-sort/dist and proxies /api to the
# backend on 127.0.0.1:8000. Idempotent: run it again after changing nginx.conf.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (sudo)." >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install -m 644 "$HERE/nginx.conf" /etc/nginx/conf.d/magic-sort.conf

# Refuse to leave nginx broken: test first, reload only if the config is sound.
nginx -t
systemctl reload nginx

echo "magic-sort nginx block installed to /etc/nginx/conf.d/magic-sort.conf"
