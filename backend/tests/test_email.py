from app.api import email_utils
from app.config import settings


class FakeSMTP:
    def __init__(self, *args, **kwargs):
        self.sent = []
        self.did_starttls = False
        self.logged_in = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def starttls(self):
        self.did_starttls = True

    def login(self, user, password):
        self.logged_in = (user, password)

    def sendmail(self, from_addr, to_addrs, message):
        self.sent.append((from_addr, to_addrs, message))


def test_email_disabled_prints_the_token_instead_of_sending(
    monkeypatch, capsys
):
    monkeypatch.setattr(settings, "email_enabled", False)

    email_utils.send_email("alice@example.com", "tok", "verify")

    assert "verify token for alice@example.com: tok" in capsys.readouterr().out


def test_email_sends_over_implicit_tls_on_port_465(monkeypatch):
    monkeypatch.setattr(settings, "email_enabled", True)
    monkeypatch.setattr(settings, "smtp_server", "smtp.resend.com")
    monkeypatch.setattr(settings, "smtp_port", 465)
    monkeypatch.setattr(settings, "smtp_user", "resend")
    monkeypatch.setattr(settings, "smtp_password", "key")
    monkeypatch.setattr(settings, "smtp_from", "noreply@magic-sort.from-delhi.net")

    fake = FakeSMTP()
    monkeypatch.setattr(email_utils.smtplib, "SMTP_SSL", lambda *a, **k: fake)

    email_utils.send_email("alice@example.com", "tok", "verify")

    assert fake.did_starttls is False
    assert fake.logged_in == ("resend", "key")
    assert fake.sent[0][1] == ["alice@example.com"]


def test_email_sends_over_starttls_on_port_587(monkeypatch):
    monkeypatch.setattr(settings, "email_enabled", True)
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_from", "noreply@magic-sort.from-delhi.net")

    fake = FakeSMTP()
    monkeypatch.setattr(email_utils.smtplib, "SMTP", lambda *a, **k: fake)

    email_utils.send_email("alice@example.com", "tok", "verify")

    assert fake.did_starttls is True
    assert fake.logged_in is None
    assert len(fake.sent) == 1


def test_email_failure_is_logged_not_raised(monkeypatch, capsys):
    monkeypatch.setattr(settings, "email_enabled", True)
    monkeypatch.setattr(settings, "smtp_port", 465)

    def broken(*args, **kwargs):
        raise OSError("mailbox down")

    monkeypatch.setattr(email_utils.smtplib, "SMTP_SSL", broken)

    email_utils.send_email("alice@example.com", "tok", "verify")

    assert "verify to alice@example.com failed" in capsys.readouterr().out
