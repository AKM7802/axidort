# Payments — Dodo Payments integration

Leadwire is gated behind a **$199/mo subscription**, billed through
[Dodo Payments](https://docs.dodopayments.com). This doc covers setup,
local testing (test mode, no real card), and recovery when something in the
webhook pipeline breaks. For everything else, see [`DOCUMENTATION.md`](./DOCUMENTATION.md).

---

## Table of contents

1. [How the flow works](#how-the-flow-works)
2. [One-time dashboard setup](#one-time-dashboard-setup)
3. [Environment variables](#environment-variables)
4. [Local webhook delivery](#local-webhook-delivery)
5. [Test cards](#test-cards)
6. [Manual end-to-end test](#manual-end-to-end-test)
7. [Webhook events handled](#webhook-events-handled)
8. [Client status states](#client-status-states)
9. [Troubleshooting](#troubleshooting)
10. [Recovery script: `reconcile_subscription.py`](#recovery-script-reconcile_subscriptionpy)
11. [Where the code lives](#where-the-code-lives)

---

## How the flow works

```
signup ──▶ Client saved, status=unpaid (no leads matched/emailed, /me/leads
           /me/stats /me/digests* all 402) ──▶ redirected to /payment
                                                        │
                                          "Subscribe — $199/mo" clicked
                                                        │
                                     POST /billing/checkout-session (auth'd)
                                                        │
                              Dodo hosted Checkout Session (test_mode) URL
                                                        │
                                        customer pays with a test card
                                                        │
                              Dodo redirects browser to /payment/return
                              (return_url — NOT trusted for entitlement,
                               only polls GET /me until status flips)
                                                        │
                    ════════════ in parallel ═══════════════════════════
                    Dodo sends a signed subscription.active webhook to
                    POST /billing/webhook. Signature is verified, then
                    Client.status is set to active — this is the ONLY
                    thing that ever grants access.
                    ════════════════════════════════════════════════════
                                                        │
                              /payment/return sees status=active, redirects
                                              to /dashboard
```

Monthly renewals are entirely Dodo's doing — no cron job on our side.
`subscription.renewed` / `.on_hold` / `.cancelled` / `.expired` webhooks keep
`Client.status` and the `subscriptions` / `payments` tables in sync
automatically. See [`app/services/billing_service.py`](./app/services/billing_service.py).

---

## One-time dashboard setup

1. Sign up / log in at the Dodo dashboard and switch to **Test Mode**
   (toggle near the top of the dashboard — separate from Live Mode, with its
   own keys, products, and data).
2. **Settings → API Keys** → copy the bearer key for `DODO_PAYMENTS_API_KEY`.
   It's the one used for API calls — don't confuse it with a webhook secret
   or a customer/product id.
3. **Products → New → Subscription** → price **$199.00**, billing interval
   **Monthly**. Name it whatever you like (the price is what's enforced;
   the app's own copy always says "$199/mo" regardless of the product's
   display name). Copy its `pdt_...` id for `DODO_PAYMENTS_PRODUCT_ID`.
4. Set up a webhook so `POST /billing/webhook` gets called — see
   [Local webhook delivery](#local-webhook-delivery) below for the easiest
   way to do this without a public URL.

---

## Environment variables

All in `.env` (backend only — nothing Dodo-related is needed in
`apps/web/.env.local`, since checkout sessions and webhooks are both
handled server-side by FastAPI).

| Variable | Where to find it | Notes |
|---|---|---|
| `DODO_PAYMENTS_API_KEY` | Settings → API Keys (Test Mode) | Bearer token for all API calls. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Developer → Webhooks → your endpoint → signing secret | Starts with `whsec_...`. **Not** the CLI's WebSocket relay URL (`https://wsserver.dodopayments.tech/...`) — easy to mix up if you're skimming the `dodo wh listen` terminal output. Required; the endpoint rejects unsigned/invalid requests with `401`. |
| `DODO_PAYMENTS_ENVIRONMENT` | — | `test_mode` or `live_mode`. Defaults to `test_mode` so a blank/misconfigured value can never accidentally hit live. |
| `DODO_PAYMENTS_PRODUCT_ID` | Products → your $199/mo product | `pdt_...` id. |
| `FRONTEND_URL` | — | Already used for password-reset emails; also becomes the Checkout Session's `return_url` (`{FRONTEND_URL}/payment/return`). |

**After editing `.env`, restart `uvicorn`.** Settings are read once at
process startup (`pydantic_settings.BaseSettings`, cached via `lru_cache`);
`--reload` only watches `.py` files, so a bare `.env` edit does **not** get
picked up by a running server.

---

## Local webhook delivery

Dodo's dashboard webhook form requires a public HTTPS URL — `localhost`
isn't reachable from Dodo's servers. Two options:

### Option A — Dodo CLI tunnel (recommended for local dev)

No public URL, no ngrok, no manual dashboard entry — the CLI creates the
webhook endpoint for you and relays real test-mode events over a WebSocket.

```bash
# Install
curl -fsSL https://dodopayments.com/install.sh | sh

# Log in with your TEST MODE API key
dodo login <your-test-api-key> test

# Start the tunnel — leave this running in its own terminal while testing
dodo wh listen http://localhost:8000/billing/webhook
```

Then get the signing secret: the CLI's auto-created endpoint appears under
**Developer → Webhooks** in the dashboard — open it and reveal the secret,
copy it into `DODO_PAYMENTS_WEBHOOK_KEY`. (The CLI's own terminal output
shows the relay URL, not the secret — don't paste that into `.env`.)

### Option B — ngrok + dashboard webhook

```bash
ngrok http 8000
```

Register `https://xxxx.ngrok.io/billing/webhook` as the endpoint URL under
**Developer → Webhooks → Create Webhook**, then copy its signing secret into
`DODO_PAYMENTS_WEBHOOK_KEY`. More setup than option A, but gives you a
persistent dashboard-visible endpoint with delivery logs.

---

## Test cards

Test mode never touches a real card or bank rail — use these regardless of
which card number you type.

| Scenario | Card number | Expiry | CVV |
|---|---|---|---|
| Success (Visa) | `4242424242424242` | 06/32 | 123 |
| Success (Mastercard) | `5555555555554444` | 06/32 | 123 |
| Success, India-region checkout | `4576238912771450` | 06/32 | 123 |
| Generic decline | `4000000000000002` | 06/32 | 123 |
| Insufficient funds | `4000000000009995` | 06/32 | 123 |
| Renewal-failure testing (simulates `subscription.on_hold` on a later charge) | `4000000000000341` | 12/34 | 123 |

Notes:
- If Dodo's adaptive pricing localizes checkout to your detected region
  (e.g. showing ₹ instead of $), that's normal — the underlying product
  price is still $199 USD, just converted for display/charging. Use the
  matching regional test card if the US one behaves oddly for you.
- Test mode can occasionally simulate a transient decline even on a
  "success" card (Dodo's own failure message says "please try again in a
  few moments") — if a checkout fails once, just retry before assuming
  something's misconfigured.

---

## Manual end-to-end test

1. Confirm all four `DODO_PAYMENTS_*` vars are set and `uvicorn` has been
   restarted since.
2. Confirm `dodo wh listen http://localhost:8000/billing/webhook` (or your
   ngrok tunnel) is running.
3. Sign up on the landing page (or log in as an existing `unpaid` client) →
   you land on `/payment`.
4. Click **Subscribe — $199/mo** → redirected to Dodo's hosted checkout.
5. Pay with a success test card (above).
6. Watch:
   - the `dodo wh listen` terminal for the forwarded event,
   - your `uvicorn` log for `POST /billing/webhook` → should return `204`,
   - the browser lands on `/payment/return`, polls `GET /me`, and redirects
     to `/dashboard` once `status` flips to `active`.
7. Verify in the database if you want to be sure:
   ```bash
   PYTHONPATH=. python3 -c "
   from app.db.session import SessionLocal
   from sqlalchemy import text
   s = SessionLocal()
   print(s.execute(text(\"SELECT email, status FROM clients WHERE email = :e\"), {'e': 'you@example.com'}).fetchone())
   s.close()
   "
   ```

---

## Webhook events handled

All in [`app/services/billing_service.py`](./app/services/billing_service.py) — `handle_webhook` verifies the
signature (`dodo.webhooks.unwrap`) and dispatches:

| Event | Handler | Effect |
|---|---|---|
| `subscription.active` | `_apply_subscription_event` | Upserts the `Subscription` row, sets `Client.status = active`. The only event that unlocks the dashboard/leads. |
| `subscription.renewed` | same | Refreshes `current_period_start/end` on successful monthly renewal. |
| `subscription.on_hold` | same | `Client.status = past_due` — renewal charge failed but is recoverable (Dodo's own retry/dunning handles the retry attempts). |
| `subscription.cancelled` | same | `Client.status = canceled` immediately, **unless** `cancel_at_next_billing_date` is true, in which case access is kept until the matching `subscription.expired` fires at period end. |
| `subscription.expired` | same | `Client.status = canceled`. |
| `subscription.failed` | same | Initial mandate/payment never succeeded — `Client.status = unpaid` (not `canceled`; there's nothing to cancel, they can just retry checkout). |
| `subscription.updated` | same | Fires on *any* field change (quantity, plan, payment method, etc.), not just the status transitions above — routed through the same idempotent handler as a catch-all resync, never authoritative on its own. |
| `payment.succeeded` / `payment.failed` | `_apply_payment_event` | Upserts a `Payment` row (idempotent on `provider_payment_id`). |
| `refund.succeeded` | `_apply_refund_event` | Marks the matching `Payment` row `refunded`. |

All handlers are idempotent (upsert by `provider_subscription_id` /
`provider_payment_id`) — Dodo's automatic retries (immediately, then
5s/5m/30m/2h/5h/10h/10h) are safe to receive more than once.

---

## Client status states

`ClientStatus` (`app/models/enums.py`) — this is what actually gates access,
not `Subscription.status`:

| Status | Meaning | Gets leads/dashboard? |
|---|---|---|
| `unpaid` | Default on signup. No successful checkout yet, or the initial mandate failed (`subscription.failed`). | No |
| `active` | Verified `subscription.active`/`.renewed`. | Yes |
| `past_due` | A renewal charge failed (`subscription.on_hold`); recoverable. | No |
| `canceled` | Subscription ended (`.cancelled` without a scheduled end, or `.expired`). | No |
| `trial` | Unused today — kept in the enum for a possible future free-trial flow. | No |

Enforced both client-side (`/payment` redirect in `apps/web/app/dashboard/page.tsx`)
and server-side (`require_active_subscription` in `app/api/deps.py`, applied
to `/me/leads`, `/me/stats`, `/me/digests*` — returns `402` if not `active`).

---

## Welcome email

`_apply_subscription_event` sends a one-time "you're subscribed" email
(`build_subscription_welcome_email` in `app/services/email_templates.py`) the
moment a client's status transitions **into** `active` — first activation or
reactivation after a lapse, but never again on plain renewals (`became_active`
in `billing_service.py` is only true when the client wasn't already
`active`). Copy: welcome + thanks-for-subscribing + "you'll get your first
leads starting `<next Monday's date>`", matching Service 2's weekly digest
cadence.

Sent via `get_email_sender()` (`app/services/email_sender.py`), which respects
`EMAIL_PROVIDER` — same as the password-reset email and Service 2's digests.
Defaults to `flask_mail` (SMTP) precisely so this works in local/test setups
without hitting Resend's sandbox restriction (free tier only delivers to the
account owner's own address until a domain is verified at
resend.com/domains — see `RESEND_EMAIL` in
[`DOCUMENTATION.md`](./DOCUMENTATION.md#environment-variables)). Switch
`EMAIL_PROVIDER=resend` once that's done for production. Send failures are
caught and logged, not raised — they never fail the webhook response or roll
back the status update.

---

## Troubleshooting

**`POST /billing/checkout-session` or `/billing/webhook` returns `503`**
`DODO_PAYMENTS_API_KEY` or `DODO_PAYMENTS_PRODUCT_ID` is missing — check
`.env` and restart `uvicorn`.

**`POST /billing/webhook` returns `401` on every delivery**
`DODO_PAYMENTS_WEBHOOK_KEY` is wrong, missing, or you restarted `uvicorn`
before the `.env` edit actually landed. Double-check it's the `whsec_...`
signing secret from **Developer → Webhooks**, not the CLI relay URL —
that exact mix-up is what caused this the first time it came up during this
integration's setup. Restart `uvicorn` after fixing it.

**Dodo's hosted checkout shows "Payment Failed"**
Usually just test-mode flakiness — Dodo's own message says to retry. Confirm
you're using a documented success card and a *fresh* checkout session (URLs
are single-use / expire); if both check out, just try again.

**Webhook returns `200`/`204` now, but nothing changed in the database**
You're probably watching Dodo's *retry backlog* for an earlier failed
delivery get redelivered — since handlers are idempotent, replaying an old
`subscription.failed`/`payment.failed` event just re-confirms data that was
already there. Check `subscriptions`/`payments` timestamps against when you
actually completed a new checkout to tell backlog noise apart from a fresh
event.

**Client is stuck `unpaid` even though Dodo's dashboard shows the
subscription as `Active`**
This means the payment succeeded on Dodo's side but its webhook never
applied here (most commonly: the webhook key was still wrong at the time,
and no retry has landed since). Use the recovery script below — no need to
pay again.

---

## Recovery script: `reconcile_subscription.py`

For the "Dodo shows Active, we show unpaid" situation above. Fetches the
real subscription state from the Dodo API and applies it through
`billing_service.reconcile_subscription()` — the exact same logic a
verified webhook uses — so the result is identical to what a successful
webhook delivery would have produced. It does **not** create a payment or
charge anything; it only reads Dodo's existing state.

```bash
# Find the subscription id (sub_...) on the Dodo dashboard's Subscribers tab.

# Preview first — no database writes:
PYTHONPATH=. python3 scripts/reconcile_subscription.py sub_xxxxxxxxxxxx --dry-run

# Apply it:
PYTHONPATH=. python3 scripts/reconcile_subscription.py sub_xxxxxxxxxxxx
```

Example output:

```
Fetching sub_xxxxxxxxxxxx from Dodo (test_mode)...
  status:             active
  metadata.client_id: '0004b593-00ef-488a-9688-feb518675233'
  customer:           you@example.com (cus_xxxxxxxxxxxx)
  recurring amount:   19900 USD
  current period:     2026-08-04 16:45:01+00:00 -> 2026-09-04 16:47:04+00:00
  cancel at period end: False

Applied. Client 0004b593-00ef-488a-9688-feb518675233 is now in sync with Dodo's subscription status (active).
```

This is a **recovery tool**, not a normal part of the payment flow — if
you're reaching for it often, the actual fix is your webhook configuration
(`DODO_PAYMENTS_WEBHOOK_KEY`, the endpoint URL, or keeping `dodo wh listen`
running), not repeated manual reconciliation. Outside of this script, a
client's status should only ever change via a verified `POST /billing/webhook`
delivery.

---

## Where the code lives

| Concern | File |
|---|---|
| Settings | `app/core/config.py` |
| Checkout session creation, webhook handling, event dispatch | `app/services/billing_service.py` |
| Routes (`/billing/checkout-session`, `/billing/webhook`) | `app/api/routes/billing.py` |
| Server-side paywall enforcement | `require_active_subscription` in `app/api/deps.py` |
| `Subscription` / `Payment` models | `app/models/billing.py` |
| Repositories | `app/repositories/{interfaces,sqlalchemy_repo,factory}.py` |
| `ClientStatus` enum + migration adding `unpaid` | `app/models/enums.py`, `alembic/versions/a9f09480d01b_*.py` |
| Recovery script | `scripts/reconcile_subscription.py` |
| Frontend paywall pages | `apps/web/app/payment/page.tsx`, `apps/web/app/payment/return/page.tsx` |
| Frontend routing gates | `apps/web/app/dashboard/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/signup/page.tsx` |
