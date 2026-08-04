# Leadwire — Architecture, Design Decisions & Runbook

A B2B lead-generation SaaS that turns public-record signals (currently: Chicago
health-inspection violations) into sales leads for service businesses (pest
control, cleaning, repair). V1 is Chicago-only; the architecture is deliberately
built to expand to more cities/data sources later without rewrites.

Backend: FastAPI + SQLAlchemy + Alembic + Postgres (hosted on Supabase).
Frontend: Next.js 16 (App Router, Turbopack) + shadcn/ui (on Base UI, not Radix)
+ Tailwind v4 + Recharts.

Billing (the $199/mo Dodo Payments subscription paywall) has its own doc —
see [`PAYMENTS.md`](./PAYMENTS.md) for setup, testing, and troubleshooting.
This file covers everything else.

---

## Table of contents

1. [System overview](#system-overview)
2. [Quick start](#quick-start)
3. [Environment variables](#environment-variables)
4. [Running each service](#running-each-service)
5. [Scripts reference](#scripts-reference)
6. [API reference](#api-reference)
7. [Data model](#data-model)
8. [Design decisions — backend](#design-decisions--backend)
9. [Design decisions — frontend](#design-decisions--frontend)
10. [Known rough edges / things worth revisiting](#known-rough-edges--things-worth-revisiting)

---

## System overview

Three pipelines, one API, one frontend:

- **Service 1 (ingestion)** — `app/services/ingest_service.py`. Fetches raw
  inspection records from a city's public data API, maps them into a
  generalized schema, classifies each cited violation with an LLM, flags
  low-confidence classifications for human review, and flags zip codes it
  can't map to a known city/territory.
- **Service 2 (digest)** — `app/services/digest_service.py`. Matches recent
  violations to clients by territory + category subscription, then emails
  each due client a weekly digest of their new leads (HTML email + CSV
  attachment).
- **API service** — FastAPI app (`app/main.py`). Client signup/signin,
  password reset, the client dashboard's own data (`/me/*`), the admin
  console (`/admin/*`), and small reference endpoints (`/geo/*`,
  `/territories/*`).
- **Frontend** — Next.js app in `apps/web/`. Public marketing site, client
  signup/login/dashboard, and an admin console — all served from one app,
  routed by path (`/admin/*` vs everything else), not a separate deployment.

---

## Quick start

```bash
# --- Backend ---
cd /home/aswanth/Documents/lead_generator_custom
python3 -m venv venv          # if venv/ doesn't exist yet
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in real values, see below
PYTHONPATH=. python3 -m alembic upgrade head
uvicorn app.main:app --reload --port 8000

# --- Frontend (separate terminal) ---
cd apps/web
npm install
cp .env.local.example .env.local 2>/dev/null || true   # if present; otherwise create .env.local, see below
npm run dev                   # http://localhost:3000
```

Frontend needs its own `.env.local` (not the backend's `.env`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Note: every script in `scripts/` needs `PYTHONPATH=.` (there's no installed
package — the repo isn't `pip install -e`'d) and the venv activated.

---

## Environment variables

All backend config lives in one place: `app/core/config.py` (a
`pydantic_settings.BaseSettings`, reading `.env`). Copy `.env.example` to
`.env` and fill in real values — **never commit `.env` itself.**

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Postgres connection string. Supabase's pooler string works as-is (`postgresql+psycopg://...`); swapping providers only means changing this one value. |
| `SOCRATA_APP_TOKEN` | Service 1 | Optional but recommended — avoids rate limiting on Chicago's Socrata API. Register at dev.socrata.com. |
| `GEMINI_API_KEY` | Service 1 | Required — the violation classifier and lead-narration LLM calls both use this. |
| `GEMINI_MODEL` | Service 1 | Default `gemini-2.5-flash`. |
| `EMAIL_PROVIDER` | All app email | `flask_mail` (default) or `resend` — which provider `get_email_sender()` (`app/services/email_sender.py`) returns. Governs password-reset, subscription-welcome, **and** Service 2 digest emails alike. Default `flask_mail` since it needs no domain verification; switch to `resend` in production once one's verified. |
| `RESEND_API_KEY` | Email (if `EMAIL_PROVIDER=resend`) | Required for the Resend delivery path. |
| `RESEND_EMAIL` | Email (if `EMAIL_PROVIDER=resend`) | The `from` address. **Resend's free/sandbox tier only delivers to the account owner's own address** until a domain is verified at resend.com/domains — see `scripts/resend_digest.py` below for the SMTP workaround, or just set `EMAIL_PROVIDER=flask_mail`. |
| `CLASSIFIER_VERSION` | Service 1 | Stored on each violation row; bump this when the classification prompt changes materially. |
| `CLASSIFIER_CONFIDENCE_THRESHOLD` | Service 1 | Default `0.8`. Violations below this confidence also land in the review queue (they're still real violations/leads — this only adds a human-review flag). |
| `DIGEST_SEND_MODE` | Service 2 | `instant` (every active client, every run) or `scheduled` (only clients whose `next_run_at` has arrived). |
| `LEAD_LOOKBACK_DAYS` | Service 2 | How many days of leads count as "recent" for matching, and how far `next_run_at` advances on a successful send. Default `7`. |
| `JWT_SECRET_KEY` | API | Signs the app's own client/admin JWTs (HS256). Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | API | Default 10080 (1 week). |
| `FRONTEND_URL` | API | Used to build the password-reset email link **and** the Dodo Checkout `return_url` (`{FRONTEND_URL}/payment/return`). |
| `MAIL_SERVER` / `MAIL_PORT` / `MAIL_USE_TLS` / `MAIL_USE_SSL` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_DEFAULT_SENDER` | Email (default, `EMAIL_PROVIDER=flask_mail`) | SMTP via Flask-Mail — the default provider for all app email (see `EMAIL_PROVIDER` above). `scripts/resend_digest.py` always uses this directly regardless of `EMAIL_PROVIDER`, to retry a client's digest through the other provider. |
| `DODO_PAYMENTS_API_KEY` | Billing | Bearer token for the Dodo Payments API. From the dashboard, Settings -> API Keys. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Billing | Signing secret for `POST /billing/webhook`, from Developer -> Webhooks. Required — the endpoint rejects unsigned/invalid requests. |
| `DODO_PAYMENTS_ENVIRONMENT` | Billing | `test_mode` or `live_mode`. Defaults to `test_mode` so an unset value can never accidentally hit live. |
| `DODO_PAYMENTS_PRODUCT_ID` | Billing | The `pdt_...` id of the $199/mo Subscription product, created in the Dodo dashboard. |

### Gmail SMTP specifics (if using Gmail for `MAIL_*`)

- `MAIL_SERVER=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USE_TLS=true`, `MAIL_USE_SSL=false`.
- `MAIL_PASSWORD` must be a Gmail **App Password** (https://myaccount.google.com/apppasswords), not your normal login password — Gmail requires 2FA + an app password for SMTP.
- `MAIL_DEFAULT_SENDER` must be a real email address, and for Gmail specifically it **must be the same address as `MAIL_USERNAME`** — Gmail rejects/rewrites a `From` that doesn't match the authenticated account unless you've configured a verified "Send As" alias. Easiest: leave `MAIL_DEFAULT_SENDER` blank — it falls back to `MAIL_USERNAME` automatically.
- If you want a display name, use the literal format `Name <email@domain>`, e.g. `MAIL_DEFAULT_SENDER="Leadwire <you@gmail.com>"` — **quote it** in `.env` (the `<`/`>` characters break a plain `bash source .env`, even though the app's own parser handles it fine unquoted; quoting keeps both working).

### Frontend (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend (`http://localhost:8000` in dev). |

(Supabase env vars were used earlier in this project's history for admin
auth — they were fully removed once admin auth moved to the Client table's
`role` field. If you see `NEXT_PUBLIC_SUPABASE_*` anywhere, it's stale.)

---

## Running each service

Every command below assumes:
```bash
cd /home/aswanth/Documents/lead_generator_custom
source venv/bin/activate
```

### API server
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive API docs at `http://localhost:8000/docs`.

### Service 1 — ingestion
```bash
PYTHONPATH=. python3 scripts/run_service1.py [--city chicago] [--since-days N] [--limit N]
```
- `--since-days` (default 1): fetch inspections updated N days ago onward.
- `--limit`: cap how many *fetched* records actually get processed this run (fetching is cheap/unbounded; classification is the expensive per-record step this bounds — useful for a controlled test run). Anything past the cap is logged as `pending`, not lost — it's picked up on the next run.

Logs per run: `fetched=... to_process=... pending=...` at the start, per-record
timing as it goes, and a final `processed=... failed=... pending=...
total_time=... avg_time_per_record=...` summary.

### Service 2 — digest emails
```bash
PYTHONPATH=. python3 scripts/run_service2.py
```
No arguments — behavior is entirely controlled by `.env` (`DIGEST_SEND_MODE`,
`LEAD_LOOKBACK_DAYS`). Logs `candidates=...` at the start, per-client
`sent`/`skipped: ...`/failure lines, and a final `candidates=... sent=...
skipped=... failed=... pending_next_run=... total_time=...` summary.

### Frontend
```bash
cd apps/web
npm run dev       # http://localhost:3000
npm run build     # production build / type-check
```

---

## Scripts reference

All in `scripts/`, all need `PYTHONPATH=.` + the venv active.

| Script | Purpose |
|---|---|
| `run_service1.py` | Runs Service 1 (ingestion) once. See above. |
| `run_service2.py` | Runs Service 2 (matching + digest sends) once. See above. |
| `seed_territory_options.py` | Pulls the real distinct zip codes from Chicago's Food Inspections dataset (scoped to the 606xx range — the raw `city` free-text field is unreliable, full of typos/suburbs) and seeds them into `territory_options` as the signup zip picklist. Run once per new city, or re-run to pick up any newly-appeared zips. |
| `purge_inspection_data.py` | **Destructive.** Deletes every `inspection_events` and `client_leads` row (cascades to `violations`, `review_queue`, `zip_mapping_flags`, `email_digest_leads`; `email_digests` themselves survive as a historical record, just with no linked leads). Dry-run by default — prints current row counts and exits. Pass `--yes` to actually delete. |
| `resend_digest.py` | Sends/retries a client's pending-leads digest via SMTP (Flask-Mail), **without re-running lead matching** — works purely off whatever's already sitting in `client_leads` unsent. See below. |
| `reconcile_subscription.py` | Recovery tool for the Dodo Payments integration — syncs a client's local status/subscription row from Dodo's authoritative API state when a payment succeeded but the webhook never landed. See [`PAYMENTS.md`](./PAYMENTS.md). |

### `resend_digest.py` in detail

Why it exists: `run_service2.py` sends via Resend, whose free/sandbox tier
only delivers to the account owner's own address. If a client's send fails
for that reason (or any transient reason), their leads stay correctly
`pending` (never marked delivered) — this script retries the send through a
different provider (Gmail SMTP, or whatever `MAIL_*` points at) without
burning another full matching pass.

```bash
# Interactive: lists every client with undelivered (pending) leads, their
# most recent attempt's status, and lets you pick one or "all".
PYTHONPATH=. python3 scripts/resend_digest.py

# Non-interactive, one client:
PYTHONPATH=. python3 scripts/resend_digest.py --email someone@example.com

# Non-interactive, everyone with pending leads (e.g. cron/automation):
PYTHONPATH=. python3 scripts/resend_digest.py --all
```

Sample interactive output:
```
2 client(s) with undelivered leads:
  [1] someone@example.com — 3 pending — last attempt: failed — You can only send testing...
  [2] other@example.com — 1 pending — last attempt: never attempted
  [a] All of the above

Resend which? (number or 'a'):
```

"Undelivered" = has at least one `client_leads` row where
`included_in_email = false` — that's the only thing this script can act on,
regardless of *why* it's still pending. After a real send, the script
re-reads and prints the resulting `email_digests` row (`status`, `sent_at`,
`error_message`) so you can confirm exactly what got recorded.

---

## API reference

Full interactive docs at `/docs` (Swagger UI) once the server is running.
Summary:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | none | Client registration — account + territory + category subscriptions in one call. |
| POST | `/auth/signin` | none | Returns a bearer token + the client's profile. |
| POST | `/auth/forgot-password` | none | Always 204 (no email enumeration). Emails a reset link if the address is registered. |
| POST | `/auth/reset-password` | none | Consumes a one-time reset token, sets a new password. |
| GET | `/me` | client | Own profile, including `status` — the frontend routes non-`active` clients to `/payment` off this. |
| GET | `/me/leads` | client + active subscription | Own leads, paginated. 402 if `status != active` (see `require_active_subscription`). |
| GET | `/me/stats` | client + active subscription | Own dashboard stats (totals, by-week, by-category). 402 if not active. |
| GET | `/me/digests`, `/me/digests/{id}` | client + active subscription | Own report (digest) history + detail (which leads were in it). 402 if not active. |
| POST | `/billing/checkout-session` | client | Starts a Dodo Payments hosted Checkout Session for the $199/mo plan; returns `{checkout_url}` to redirect the browser to. 400 if already `active`. |
| POST | `/billing/webhook` | none (signature) | Dodo's webhook endpoint. Verifies the Standard Webhooks signature, then applies `subscription.*`/`payment.*`/`refund.succeeded` events — this is the only thing that ever flips a client to `status=active`. See `app/services/billing_service.py`. |
| GET | `/geo/states` | none | State → city picker (Illinois → Chicago today). |
| GET | `/territories/options` | none | Zip/borough/etc. picklist for signup, scoped by `city_id` + `kind`. |
| GET/POST/PUT | `/admin/clients*` | admin | List/create/view/update clients. |
| GET | `/admin/clients/{id}/leads` | admin | A client's leads, optional `category` filter. |
| GET | `/admin/clients/{id}/digests*` | admin | A client's report history + detail. |
| GET | `/admin/review-queue` | admin | Low-confidence classifications awaiting human review. |
| GET | `/admin/zip-flags` | admin | Ingested events whose zip couldn't be mapped (missing or unrecognized). |
| GET | `/admin/stats` | admin | System-wide stats + time series for the admin dashboard charts. |

**Auth model**: one login for everyone. A bearer token from `/auth/signin`
works for `/me/*` always, and for `/admin/*` too if that `Client` row has
`role="admin"`. There is no separate admin authentication system.

---

## Data model

All models in `app/models/`, one file each, wired into `app/models/__init__.py`
for Alembic. Migrations in `alembic/versions/` (chronological, see filenames).

| Model | Table | Purpose |
|---|---|---|
| `Client` | `clients` | The account **and** the organization — signup/signin, dashboard, billing all key off this one row. Includes `role` (client/admin), `status` (unpaid/trial/active/past_due/canceled — new signups default to `unpaid`), `is_active`, `is_exclusive`. |
| `State`, `City` | `states`, `cities` | Real relational reference data for "which market" — seeded with Illinois → Chicago. `City.code` is the same stable string (`"chicago"`) already used as `source_city`/`city_code` everywhere else in the ingestion pipeline. |
| `Territory` | `territories` | A client's chosen match rule: `kind` (`zip`/`borough`/`local_authority`/`radius`/`city`) + `value`. A `city`-kind row's `value` is a city's UUID — it matches every event in that city regardless of zip. |
| `TerritoryOption` | `territory_options` | The seeded picklist clients choose zip/borough/etc. values from at signup — never free text. |
| `CategorySubscription` | `category_subscriptions` | Which violation categories (pest/sanitation/equipment/plumbing/temperature) a client wants leads for. |
| `InspectionEvent` | `inspection_events` | One generalized inspection record from Service 1, city-agnostic, with the untouched raw payload preserved. Carries both `source_city` (ingestion/dedup key) and `city_id` (real FK). |
| `Violation` | `violations` | One classified violation cited on an event — category, severity, species, AI confidence. |
| `ReviewQueue` | `review_queue` | Violations below the confidence threshold, queued for human review. |
| `ClientLead` | `client_leads` | Many-to-many join: one event matched to one client. Carries `rank_score` (copied from the event) and `included_in_email` (per-client-lead delivery tracking). |
| `EmailDigest`, `EmailDigestLead` | `email_digests`, `email_digest_leads` | One row per sent (or attempted) digest email, plus the join table recording exactly which leads were in it. |
| `NotificationPreference` | `notification_preferences` | Drives "who's due for a digest today" — `is_active`, `next_run_at`. |
| `DoNotContact` | `do_not_contact` | Restaurants a specific client should never be matched to (keyed by `source_city` + `license_number`, no normalized restaurants table). |
| `ZipMappingFlag` | `zip_mapping_flags` | Raised by Service 1 when an event's zip is missing or not a recognized/seeded zip for its city — a data-quality flag, not a hard failure. |
| `PasswordResetToken` | `password_reset_tokens` | Only the SHA-256 hash of the reset token is stored (same reasoning as password hashing — a leaked row shouldn't hand out a usable link). |
| `AdminUser` | `admin_users` | Vestigial — scaffolded early for a possible separate internal-staff login, never wired to any route. Admin auth today is entirely `Client.role`. |
| `Subscription`, `Payment` | `subscriptions`, `payments` | Backs the $199/mo Dodo Payments subscription. `Subscription` is one row per client (`provider="dodo"`, `provider_subscription_id`, `current_period_start/end`); `Payment` is an append-only transaction log. Both are written only from verified webhooks in `app/services/billing_service.py` — never from the checkout `return_url`. `Client.status` (not `Subscription.status`) is what actually gates lead matching/digests/`/me/*` — see `require_active_subscription` in `app/api/deps.py`. |

---

## Design decisions — backend

### Repository pattern everywhere
`app/repositories/interfaces.py` defines abstract repository classes;
`sqlalchemy_repo.py` implements them; `factory.py` is the single wiring point.
Services depend only on the interfaces. Reasoning: swapping the storage
backend (e.g. off SQLAlchemy/Postgres entirely) means changing `factory.py`
only — nothing in `app/services/` changes.

### City-adapter pattern for ingestion
`app/adapters/city/base.py` defines `CityAdapter` (three methods: fetch raw
data, map to the generalized schema, extract violation text entries).
`ChicagoAdapter` is the only implementation today. Adding a new city is
"write an adapter," not "touch the ingestion pipeline" — `ingest_service.py`
never branches on which city it's running.

### What counts as a "violation"
The only real gate is whether the raw record's `violations` field has any
text at all — a clean "Pass" inspection with nothing cited produces zero
violation rows and `is_lead=False`. If there *is* text, it's split into
individual entries and **every entry becomes a violation row unconditionally**
— there's no LLM "reject, not a real violation" path; the classification
schema requires a category/severity for every fragment. Confidence only
gates a *separate* concern (review-queue flagging), never whether something
counts as a violation/lead.

### Rank score (v1, deterministic)
Computed once per event (not per client) in
`lead_matching.compute_rank_score`: `pest` category baseline (+15,
independent of species, since many real pest citations name no species at
all) + a species bonus (rodent/rat highest, then mouse, roach, fly — highest
one only, not stacked) + repeat-offender bonus (+15, restaurant had 2+
pest-flagged inspections in the trailing 365 days) + critical-severity bonus
(+10) + mean AI confidence, all capped at 99 so no non-closure can ever
outrank a real closure, which then adds a flat +100. Explicitly labeled "v1 —
replace with a learned model later," not intended as a permanent design.

### Lead matching: territory + category + exclusivity
`run_lead_matching` builds, per event, the set of clients whose territory
matches (`territory_matching.py`) **and** whose category subscriptions
overlap **and** aren't blocked by `do_not_contact` or the 90-day
same-restaurant cooldown. If any matching client has `is_exclusive=True`,
the candidate set narrows to exactly one (the earliest-created exclusive
client) — otherwise every matching client gets their own `client_leads` row
for that same event. A given `(client_id, event_id)` pair can never be
created twice, regardless of send/email status.

### Auth: one login, role-based — not always the design
This went through a real pivot mid-project. Originally: clients used the
app's own JWT, but admin used **Supabase Auth** as a fully separate system
(first attempted with a shared HS256 secret, then corrected to JWKS-based
verification once it was discovered the Supabase project uses asymmetric
signing keys, not a static secret). This was later replaced entirely: admin
access is now just a `role` column on the same `Client` row, checked via the
exact same bearer token every other endpoint uses
(`get_current_admin` = `get_current_client` + a role check). Reasoning:
running two separate auth systems was unnecessary complexity for a
single-tenant-style app; one login, one token type, one dependency chain.

Passwords are **hashed** (bcrypt, per-user salt), never encrypted — there is
no "decrypt and compare," only "re-hash the login attempt and compare
hashes." JWTs are a signed, tamper-evident claim (`sub` = client id, `exp`),
verified by recomputing the HMAC with a server-only secret; every request
still re-fetches the `Client` row fresh from the DB, so a deactivation or
role change takes effect on the very next request, not just after token
expiry.

### Password reset
One-time token, 1-hour TTL. Only the **SHA-256 hash** of the raw token is
stored — same principle as password hashing, a leaked DB row shouldn't hand
out a usable link. `/auth/forgot-password` always returns 204 regardless of
whether the email is registered (prevents email-enumeration), and a failure
to actually *send* the reset email is caught and logged rather than
propagated as a 500 — that would otherwise leak "this email exists but
delivery broke" as a distinguishable signal. A successful reset invalidates
every other outstanding reset token for that client.

### State → City → Territory split
Originally "chicago" existed only as a bare string
(`source_city`/`city_code`) scattered across `InspectionEvent`,
`TerritoryOption`, and the adapter. This was formalized into real `State`
and `City` tables with actual foreign keys (`InspectionEvent.city_id`,
`TerritoryOption.city_id`), while **keeping** the original string columns
alongside them — they're still the key Service 1's ingestion/dedup logic
depends on, so nothing there had to change. This enabled the signup flow to
become State → City → **optional** zip codes: leaving zip empty creates a
`city`-kind territory that matches the whole city, rather than requiring at
least one zip like every other territory kind.

### Data-quality flags for ingestion
`ZipMappingFlag` is raised (once per event, not once per ingest run — a
guard prevents re-flagging an already-flagged event) when an ingested
event's zip is either missing from the source data or present but not a
real, seeded zip for its city. This doesn't block ingestion — the event is
still stored and classified — it's purely a visibility flag
(`GET /admin/zip-flags`) since a lead with an unmapped zip would otherwise
silently never match any client.

### Purge script safety
`purge_inspection_data.py` is dry-run by default (prints counts, changes
nothing) and requires an explicit `--yes` to actually delete — deliberately
modeled after the same caution used throughout this project for any
irreversible action against the real database.

### Structured logging for both services
Both `run_ingest` and `run_digest` log a start line (what's about to be
attempted), a line per unit of work with elapsed time, and an end-of-run
summary with explicit `processed`/`failed`/`pending` counts and total/average
timing — added specifically so operational questions ("how many processed,
how many still pending, how long did each take") are answerable from the
logs alone, without querying the database.

### Two email-sending paths, deliberately kept separate
`EmailSender` (Resend) is the production path Service 2 always uses.
`FlaskMailSender` (SMTP via Flask-Mail) exists only for
`scripts/resend_digest.py`, as a way to retry delivery through a different
account when Resend's sandbox restrictions are specifically what blocked the
original send. Both implement the same structural interface
(`EmailSenderProtocol` in `app/services/email_sender.py`), so
`digest_service.send_pending_digest` (the shared per-client send logic both
`run_digest` and `resend_digest.py` call) doesn't care which one it's given.

---

## Design decisions — frontend

### Base UI, not Radix
This project's shadcn/ui setup sits on **Base UI** (`@base-ui/react`), which
has real API differences from the more commonly-documented Radix-based
shadcn:
- Composition uses `render={<Link .../>}` instead of `asChild`.
- `Button` defaults `nativeButton={true}`; composing it with a non-`<button>`
  render target (e.g. a `Link`) needs `nativeButton={false}` explicitly, or
  it throws a runtime accessibility warning.
- `Select.Value` does **not** auto-derive its displayed label from the
  matching `SelectItem`'s children the way Radix's does — it shows the raw
  `value` unless you pass a `children` render function
  (`<SelectValue>{(v) => label(v)}</SelectValue>`). This caused two real,
  found-by-screenshot bugs in this project (the Territory-type dropdown
  showing `zip` instead of "Zip code"; the new State/City dropdowns showing
  raw UUIDs instead of names) before being understood and fixed.

### Branding decoupled from the data source
`lib/brand.ts` is the single source of truth for product name/tagline
(`Leadwire`) specifically so the product isn't conceptually married to
health-inspection data — V1 ships only that one data source, but the
architecture (and the marketing copy) treats it as "today's example," not
"the product." The landing page's copy was deliberately restructured this
way: generic framing at the top ("public-record signals → leads"), with
health-inspection/Chicago specifics introduced further down as the current
illustration.

### Theme
Modern indigo OKLCH palette (`app/globals.css`), replacing an original
neutral/grayscale theme. `--chart-1`..`--chart-5` tokens drive every chart's
palette consistently.

### The `w-full` flex-sizing bug (worth remembering)
Every admin page's top-level container combined `mx-auto` + `max-w-Nxl` +
`flex` **without** `w-full`. Because the root `<body>` is itself a flex
column, a child that's simultaneously a flex item *and* its own flex
container — with auto margins but no explicit width — doesn't reliably
expand to fill its `max-width` allowance; it shrinks to fit its own content
instead, and everything nested inside shrinks with it. This silently made
every admin page render far narrower than intended. The client dashboard
never had this bug because its container already included `w-full`. Fix:
every such container needs `w-full` alongside `mx-auto`/`max-w-*`.

### Charts
`components/ui/chart.tsx` (shadcn's Recharts wrapper) is the only supported
way to build a chart here — it wires up theming/tooltips/legends
consistently. All chart components across both dashboards were standardized
to the same fixed-height (`h-64`, `aspect-auto`) treatment after an earlier
mismatch (one dashboard used responsive `aspect-video` sizing, the other a
fixed height) caused visibly uneven chart rows.

### Territory display: resolving a city id to a name
Because a `city`-kind territory's `value` is a raw UUID (not human-readable
like every other kind), `lib/geo.ts` (`buildCityNameMap` +
`territoryLabel`) resolves it against `GET /geo/states` wherever territories
are displayed (client dashboard profile card, admin clients table) — chosen
over having the backend embed a resolved name directly in `TerritoryOut`,
since it reuses an endpoint that already existed and keeps that schema
usable identically for both signup-picker and display purposes.

---

## Known rough edges / things worth revisiting

- **`Client.status`** now drives real gating: only `active` (set exclusively
  by a verified `subscription.active`/`.renewed` Dodo webhook) is matched
  for leads, digests, or allowed to hit `/me/leads`, `/me/stats`,
  `/me/digests*` (see `require_active_subscription`). New signups start
  `unpaid`; `past_due`/`canceled` come from `subscription.on_hold`/
  `.cancelled`/`.expired`/`.failed` — see `app/services/billing_service.py`.
  `trial` is currently unused (no trial-period UX exists) but kept in the
  enum for a possible future free-trial flow.
- **No dunning/recovery UI yet.** Dodo's own retry schedule and dunning
  emails handle a failed renewal (`subscription.on_hold`), but there's no
  in-app "update your payment method" flow — a `past_due` client just sees
  the `/payment` paywall again and has to start a fresh checkout.
- **`AdminUser`** model exists but is fully unused — no route touches it.
  Vestigial scaffolding from before admin auth was unified onto `Client.role`.
- **Non-zip territory kinds** (`borough`, `local_authority`, `radius`) have
  zero real seeded data or real usage in this Chicago-only deployment — they
  exist for future city adapters (NYC boroughs, UK local authorities) but
  aren't exercised by anything today.
- **Resend's sandbox restriction** (only delivers to the account owner's own
  address until a domain is verified) is an external limitation, not a bug —
  `scripts/resend_digest.py` + `MAIL_*`/Flask-Mail is the current workaround,
  not a permanent replacement for verifying a domain in Resend.
