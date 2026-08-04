# Axidort

Landing page, client login, and client dashboard for Axidort — a lead
"weekly leads" service. This branch is intentionally scoped to just that:
the public marketing site, sign-in, and the dashboard clients see once
logged in. There's no self-serve signup, payment, or admin console here —
accounts are provisioned directly against the database.

- **Backend** (`backend/`) — FastAPI + SQLAlchemy + Alembic, talking to
  Postgres (hosted on Supabase in this project).
- **Frontend** (`frontend/`) — Next.js 16 (App Router, Turbopack) +
  shadcn/ui (on Base UI) + Tailwind v4.

---

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- A Postgres database (e.g. a free Supabase project)

---

## Backend — setup & run

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in real values, see below

# Apply the DB schema
python -m alembic upgrade head

# Run the API
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at
`http://localhost:8000/docs`).

Every command above (`alembic`, `uvicorn`) is run from inside `backend/`
with the venv active — there's no installed package, so running from the
repo root or without the venv will fail to resolve the `app` module.

---

## Frontend — setup & run

```bash
cd frontend
npm install

cp .env.local.example .env.local 2>/dev/null || true   # or create it, see below

npm run dev                     # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm run start` (serve
a build), `npm run lint`.

---

## Environment variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in real values —
**never commit `.env` itself** (it's gitignored). All of these are read in
one place: `backend/app/core/config.py`.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string. Supabase's connection-pooler string works as-is; swapping providers only means changing this one value. |
| `JWT_SECRET_KEY` | Signs client auth JWTs (HS256). Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default `10080` (1 week). |
| `FRONTEND_URL` | Used to build the password-reset email link, e.g. `{FRONTEND_URL}/reset-password?token=...`. |
| `CONTACT_RECIPIENT_EMAIL` | Where landing-page "contact us" submissions (pricing cards + login page) get emailed. |
| `EMAIL_PROVIDER` | `flask_mail` (default) or `resend` — which provider sends password-reset and contact-form emails. `flask_mail` needs no domain verification, so it's the easiest default; switch to `resend` in production once a sending domain is verified. |
| `RESEND_API_KEY` / `RESEND_EMAIL` | Required only if `EMAIL_PROVIDER=resend`. Resend's free tier only delivers to the account owner's own address until a domain is verified at resend.com/domains. |
| `MAIL_SERVER` / `MAIL_PORT` / `MAIL_USE_TLS` / `MAIL_USE_SSL` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_DEFAULT_SENDER` | SMTP via Flask-Mail — used when `EMAIL_PROVIDER=flask_mail` (the default). See Gmail notes below if using a Gmail account. |

**Gmail SMTP specifics** (if using Gmail for `MAIL_*`):
- `MAIL_SERVER=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USE_TLS=true`, `MAIL_USE_SSL=false`.
- `MAIL_PASSWORD` must be a Gmail **App Password** (https://myaccount.google.com/apppasswords), not your normal login password.
- `MAIL_DEFAULT_SENDER` should match `MAIL_USERNAME` for Gmail (leave it blank and it falls back to `MAIL_USERNAME` automatically). For a display name, use `Name <email@domain>` — quote it in `.env`, e.g. `MAIL_DEFAULT_SENDER="Axidort <you@gmail.com>"`.

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend, e.g. `http://localhost:8000` in dev. |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL of this site — used to build absolute URLs in metadata (Open Graph, canonical links, sitemap.xml, robots.txt). |

---

## Database schema

The schema is managed with Alembic (`backend/alembic/`). It covers more
tables than this branch's application code reads or writes (e.g. lead
ingestion, billing) — those tables are populated by processes outside this
branch, but the migrations are kept in full since the database is shared.
Run `python -m alembic upgrade head` from `backend/` (with the venv active)
to bring a fresh database up to date.
