"""
Outbound email, behind a switch and an SMTP provider.

With EMAIL_ENABLED=false (the default) a verification or reset link is printed
to the server log instead of mailed, so local play is never blocked. When
enabled, mail goes out through a transactional provider — Resend — which is
what keeps a VPS out of the spam folder.

Resend speaks SMTP at smtp.resend.com: the username is literally "resend" and
the password is a Resend API key. Port 465 is implicit TLS, 587 is STARTTLS.
"""

import smtplib
from email.mime.text import MIMEText

from ..config import settings


def send_email(to: str, token: str, purpose: str) -> None:
    """purpose is "verify" (confirm an address) or "reset" (reset a password)."""

    if purpose == "reset":
        link = f"{settings.frontend_url}?reset={token}"
        subject = "Reset your Magic Sort password"
    else:
        link = f"{settings.frontend_url}?verify={token}"
        subject = "Verify your Magic Sort email"

    body = f"Click this link to continue:\n\n{link}\n"

    if not settings.email_enabled:
        print(f"[email disabled] {purpose} token for {to}: {token}")
        return

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to

    # Email is best-effort: an account is still an account if the mailbox is
    # down, so a failed send is logged rather than raised into the caller.
    try:
        with _client() as server:
            if settings.smtp_port != 465:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to], message.as_string())
    except Exception as error:
        print(f"[email] {purpose} to {to} failed: {error}")


def _client() -> smtplib.SMTP:
    """An SMTP connection: implicit TLS for port 465, STARTTLS everywhere else."""
    if settings.smtp_port == 465:
        return smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port)
    return smtplib.SMTP(settings.smtp_server, settings.smtp_port)
