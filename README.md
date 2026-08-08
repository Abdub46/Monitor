# Monitoring Platform — Phase 1 + Phase 2 + Phase 3 + Phase 4

Phase 1: auth, application registration, basic health checks, dashboard.
Phase 2: AI root cause analysis + Email/Telegram/Push notifications.
Phase 3: security monitoring, logs, analytics/MTTR.
Phase 4: AI assistant chat.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values described below
npm run dev
```

Generate secrets with: `openssl rand -base64 32`

## What's included (Phase 1)

- Email/password auth via NextAuth (credentials provider, bcrypt hashing)
- Application CRUD, scoped per user
- `/api/monitor/check` — runs a health check against every active application
- Dashboard with live status cards (polls every 30s)
- Incidents auto-open on failure and auto-resolve on recovery (no duplicate alerts)

## What's included (Phase 2)

- **AI root cause analysis**: when an incident opens, recent check history and
  the error are sent to OpenAI, which returns a structured diagnosis (root
  cause, confidence %, severity, fix, repair steps, prevention tips) stored
  against the incident.
- **Notifications**: Email (Nodemailer/SMTP), Telegram (Bot API), and Push
  (Firebase Cloud Messaging) — each user chooses which channels to enable in
  Settings. A failure on one channel never blocks the others.
- **Incidents page** (`/incidents`): full history with the AI diagnosis
  expandable per incident.
- **Settings page** (`/settings`): toggle channels, set your Telegram chat ID,
  register a browser for push.

### Configuring AI diagnosis

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, defaults to
`gpt-4o-mini`). Without this, health checks still run and incidents still
open — they just won't get a diagnosis or trigger notifications, since
notifications currently fire after diagnosis completes.

### Configuring Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Any
SMTP provider works (Gmail app password, SendGrid, Mailgun, Postmark, etc).

### Configuring Telegram

1. Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`,
   copy the token into `TELEGRAM_BOT_TOKEN`.
2. Each user gets their own numeric chat ID by messaging
   [@userinfobot](https://t.me/userinfobot) and pasting it into Settings.
3. **Important:** the user must message their own bot at least once (e.g.
   send `/start`) before the bot is allowed to message them back — this is a
   Telegram platform requirement, not something the app can work around.

### Configuring Push (optional — skip if you don't need it yet)

Push requires more setup than the other two channels. Email and Telegram work
fully independently if you skip this.

1. Create a Firebase project (console.firebase.google.com), add a Web App.
2. Copy the web config values into the `NEXT_PUBLIC_FIREBASE_*` vars.
3. Project settings → Cloud Messaging → Web configuration → generate a VAPID
   key pair, copy it into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
4. Project settings → Service accounts → Generate new private key, downloads
   a JSON file — paste its full contents as a single-line string into
   `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Open `public/firebase-messaging-sw.js` and replace the placeholder values
   with the same `NEXT_PUBLIC_FIREBASE_*` values (service workers can't read
   env vars, so they're duplicated there — see the comment in that file).
6. In Settings, click "Register this device" to grant browser permission and
   link an FCM token to your account.

## What's included (Phase 3)

- **Security monitoring** (`/security`): every failed login attempt against
  your account is recorded with its IP address. If the same email gets 5+
  failed attempts within 10 minutes, that account is temporarily locked out
  (even a correct password won't succeed until the window passes) and a
  `brute_force_detected` event is logged. If one IP racks up 10+ failed
  attempts across any accounts in that window, a `suspicious_ip` event is
  logged. Registration is separately rate-limited (5 per 15 min per IP).
- **Logs** (`/logs`): searchable, filterable table of health check history
  across all your applications (filter by status, search error text), with
  CSV export.
- **Analytics** (`/analytics`): per-application uptime % (24h/7d/30d),
  average response time, incident count, MTTR (mean time to recovery), MTBF
  (mean time between failures), and top recurring errors — plus a simple
  uptime bar chart.

### An honest note on "security monitoring" scope

The original spec mentions detecting SQL injection, XSS, and DDoS against
*monitored* applications. That's not something this platform can do yet:
those attacks happen in traffic hitting your other apps, and this platform
is intentionally decoupled from them — it only has an outside view via
health checks. What's built now is real brute-force/suspicious-IP detection
on *this platform's own* login endpoint, plus the logging and analytics
infrastructure. Detecting attacks on monitored apps would need those apps to
forward their own traffic logs or sit behind a shared proxy/WAF — worth
scoping as its own phase once you're ready, since it's a meaningfully
different integration (an agent or webhook on each monitored app) rather
than an extension of the current health-check model.

### A note on the rate limiter

`lib/security/rateLimiter.ts` (used for registration) is in-memory, so it
resets on serverless cold starts and isn't shared across instances — fine
against casual abuse, not a hard guarantee under sustained attack. The login
brute-force guard (`lib/security/loginGuard.ts`) is the one that matters
more and is Mongo-backed, so it's durable and correct regardless of
instance. For production-grade rate limiting under real traffic, swap in
Redis (e.g. Upstash) — flagged as a Phase 4+ upgrade.

## What's included (Phase 4)

- **AI Assistant** (`/assistant`): a chat interface grounded in your actual
  account data — current status, recent incidents with their AI diagnoses,
  and reliability metrics (uptime, MTTR, MTBF, common errors) for every
  application you own. It answers from that context rather than guessing,
  and says so when something isn't in the data. Conversation history
  persists per user across sessions.
- Uses the same `OPENAI_API_KEY` as root cause analysis — no extra config
  needed if Phase 2's AI diagnosis is already set up.
- Chat is rate-limited (20 messages / 5 min per user) since each message
  makes an OpenAI call — this is cost protection, not just abuse
  prevention.
- **What it can't do**: it's read-only. It can't restart services, change
  settings, or acknowledge incidents on your behalf — it'll tell you which
  page to use instead if you ask it to *do* something. Actioning things is
  a Phase 5+ concern (auto-remediation).

## Wiring up the cron job on Vercel

`vercel.json` schedules `/api/monitor/check` to run every minute. Vercel Cron
automatically sends an `Authorization: Bearer <CRON_SECRET>` header **only**
if you set `CRON_SECRET` as an environment variable in your Vercel project —
this route checks for that header, so make sure `CRON_SECRET` is set in both
`.env.local` (for manual testing) and your Vercel project settings.

For local testing without waiting on Vercel's scheduler, hit the route
directly:

```bash
curl -H "Authorization: Bearer <your CRON_SECRET>" http://localhost:3000/api/monitor/check
```

## Not built yet

Auto-remediation, Docker/Kubernetes/server monitoring, multi-user
organizations, billing, and public status pages are deferred to later
phases per the project roadmap.
