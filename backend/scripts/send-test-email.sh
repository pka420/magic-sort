#!/usr/bin/env bash
#
# Sends one test email through Magic Sort's real mailer (Resend over SMTP),
# so the HTML template and the delivery path are exactly what production uses.
#
# The verify/reset link points at FRONTEND_URL, which defaults to the local
# frontend dev server. Pass your Resend API key (re_...) as RESEND_API_KEY.
#
# Usage:
#   RESEND_API_KEY=re_xxx ./scripts/send-test-email.sh you@example.com
#   RESEND_API_KEY=re_xxx ./scripts/send-test-email.sh you@example.com reset
#   RESEND_API_KEY=re_xxx ./scripts/send-test-email.sh you@example.com verify <real-token>
#
# A full round trip: register an account (the verify token is printed to the
# server log while EMAIL_ENABLED=false), then pass that token here and click
# the emailed link to watch the frontend confirm it.
#
set -euo pipefail

cd "$(dirname "$0")/.." # into backend/

TO="${1:?usage: $0 <to-address> [verify|reset] [token]}"
PURPOSE="${2:-verify}"
TOKEN="${3:-test-token-123}"

# The running server uses ./env/bin/python; set PYTHON to point elsewhere if
# your venv lives somewhere else (e.g. PYTHON=./.venv/bin/python).
PYTHON="${PYTHON:-./env/bin/python}"

export EMAIL_ENABLED=true
export SMTP_SERVER="${SMTP_SERVER:-smtp.resend.com}"
export SMTP_PORT="${SMTP_PORT:-465}"
export SMTP_USER="${SMTP_USER:-resend}"
export SMTP_PASSWORD="${RESEND_API_KEY}"
export SMTP_FROM="${SMTP_FROM:-noreply@magic-sort.from-delhi.net}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

"$PYTHON" - "$TO" "$TOKEN" "$PURPOSE" <<'PY'
import sys

from app.api.email_utils import send_email
from app.config import settings

to, token, purpose = sys.argv[1], sys.argv[2], sys.argv[3]
send_email(to, token, purpose)

kind = "reset" if purpose == "reset" else "verify"
print(f"sent a {purpose} email to {to}")
print(f"link: {settings.frontend_url}?{kind}={token}")
PY
