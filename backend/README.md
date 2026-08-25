# Magic Sort API

The backend behind the game: FastAPI + SQLite, served under `/api`. It keeps
the accounts (email/password and Google sign-in), the leaderboard, and sends
email through [Resend](https://resend.com). The game itself is a static build;
this is the only process with a database.

## Requirements

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
cd backend
uv venv .venv
uv pip install -r requirements.txt
cp .env.example .env
```

Then edit `.env`. The bare minimum for local play is a `SECRET_KEY`; without
one the server still runs, but on a well-known fallback that must not reach
production. Google sign-in and real email are optional — leave
`GOOGLE_CLIENT_ID` blank and `EMAIL_ENABLED=false` and both stay turned off
(the tokens are printed to the log instead of mailed).

`DATABASE_URL` defaults to `sqlite:///./magic_sort.db`, a file created in this
directory relative to where uvicorn is started, so run it from here.

## Run

```bash
uv run uvicorn app.main:app --reload
```

- API: <http://127.0.0.1:8000>
- Health check: `GET /api/health`
- Interactive docs: <http://127.0.0.1:8000/docs>

Tables are created on startup, so there is no migration step for a fresh
database.

The game's dev server proxies `/api` to this port (`vite.config.ts`), so
running `npm run dev` from the repository root alongside this backend is all
that is needed to play against it locally.

## Configuration

| Variable                 | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`           | SQLAlchemy URL, defaults to the local SQLite file     |
| `SECRET_KEY`             | Signs the access tokens — set a long random value    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long a login lasts (default 10080)          |
| `GOOGLE_CLIENT_ID`       | Google OAuth (leave blank to disable)                |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth secret                                  |
| `GOOGLE_REDIRECT_URI`    | Must match the Google console exactly                |
| `FRONTEND_URL`           | Where a Google sign-in is sent back to               |
| `EMAIL_ENABLED`          | `true` to mail via SMTP, `false` to log tokens       |
| `SMTP_*`                 | Resend SMTP settings (see `.env.example`)            |

## Tests

```bash
uv run pytest
```
