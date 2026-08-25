"""
Outbound email, behind a switch and an SMTP provider.

With EMAIL_ENABLED=false (the default) a verification or reset link is printed
to the server log instead of mailed, so local play is never blocked. When
enabled, mail goes out through a transactional provider — Resend — which is
what keeps a VPS out of the spam folder.

Resend speaks SMTP at smtp.resend.com: the username is literally "resend" and
the password is a Resend API key. Port 465 is implicit TLS, 587 is STARTTLS.

Every message is multipart/alternative: a plain-text fallback first, then an
HTML part the client renders when it can. The HTML is hand-rolled and inlined,
so it survives clients that strip <style> blocks.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..config import settings

_HTML_TEMPLATE = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background-color:#0a0616;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0616;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="width:100%;max-width:480px;background-color:#170e2c;border:1px solid #3a2b5e;border-radius:16px;padding:40px 32px;">
            <tr>
              <td align="center" style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#f3e9d8;">
                <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#b98bff;">Magic Sort</p>
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;line-height:1.3;color:#f3e9d8;">[[TITLE]]</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#b6a68f;">[[BODY]]</p>
                <a href="[[LINK]]" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#0a0616;background:#ffc86b;border-radius:999px;text-decoration:none;">[[ACTION]]</a>
                <p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#b6a68f;">If the button doesn't work, paste this into your browser:<br><a href="[[LINK]]" style="color:#b98bff;word-break:break-all;">[[LINK]]</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_email(to: str, token: str, purpose: str) -> None:
    """purpose is "verify" (confirm an address) or "reset" (reset a password)."""

    if purpose == "reset":
        link = f"{settings.frontend_url}?reset={token}"
        subject = "Reset your Magic Sort password"
        title = "Reset your password"
        body = "Use the link below to choose a new password."
        action = "Reset my password"
    else:
        link = f"{settings.frontend_url}?verify={token}"
        subject = "Verify your Magic Sort email"
        title = "Verify your email"
        body = "Confirm your address to put your scores on the leaderboard."
        action = "Verify my email"

    if not settings.email_enabled:
        print(f"[email disabled] {purpose} token for {to}: {token}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to
    message.attach(MIMEText(_text_body(link), "plain", "utf-8"))
    message.attach(MIMEText(_html_body(link, title, body, action), "html", "utf-8"))

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


def _text_body(link: str) -> str:
    return (
        "Follow this link to continue setting up your Magic Sort account:\n\n"
        f"{link}\n\n"
        "If you didn't ask for this, you can safely ignore this email.\n"
    )


def _html_body(link: str, title: str, body: str, action: str) -> str:
    return (
        _HTML_TEMPLATE.replace("[[TITLE]]", title)
        .replace("[[BODY]]", body)
        .replace("[[ACTION]]", action)
        .replace("[[LINK]]", link)
    )
