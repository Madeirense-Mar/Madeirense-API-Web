# API operations: keys, e-mail, logs

Added 2026-10-08. Covers the API key layer, the `/api/management` console, e-mail notifications and logging.

## 1. One-time setup

1. **Database.** Run `packages/db/scripts/2026-10-08_api_keys_and_email_preferences.sql` on each database (dev, then staging, then prod). It creates `Api_Keys` and adds `Users.email_marketing`, and it's safe to re-run. Then refresh Prisma: `cd packages/db && yarn prisma:dev` (or `prisma:staging` / `prisma`).
2. **Dependencies.** Run `yarn install` at the monorepo root. New API dependencies: `winston`, `winston-daily-rotate-file`, `nodemailer`, `handlebars`, `juice`.
3. **Env.** Copy the new blocks from `packages/api/.env.development` (Logging, Proxy, API keys, Management, E-mail) into the staging/production env files. The defaults are sensible. In production, set `API_KEY_MODE`, the `SMTP_*` / `MAIL_*` values and `MAIL_LOGO_URL`.
4. **Keys.** Open `<API_URL>/api/management` and sign in with an **Admin** account (e-mail and password). Generate one key per consumer (web, mobile, each developer or shareholder, and scripts), then put each key where its consumer reads it:
   - Web: `VITE_APP_API_KEY` in `packages/web/.env`, and in the GitHub Actions env/secrets for the build.
   - Mobile: send the header `x-api-key` on every request (see §2).
   - Scripts: `SCRIPT_API_KEY` in `packages/api/.env.*`.
5. **Roll out.** Deploy with `API_KEY_MODE=report`. Requests without a key still go through, but each one is logged as `"scope":"api-keys"` (Logs → app). When those warnings stop, switch to `API_KEY_MODE=enforce` and restart.

## 2. API keys

- Header: `x-api-key: mdr_live_…`. Only the SHA-256 of a key is stored, and the full key is shown **once** when it's created.
- Revoking from the console takes effect immediately on that instance. Other PM2 instances, if you ever run several, pick it up within `API_KEY_CACHE_TTL_MS` (default 60 s).
- Usage counts, last-used time and last-used IP are buffered and written every 30 s.
- Paths that don't need a key: `/api`, `/api/health`, `/api/docs`, `/api/management`, the Google/Facebook OAuth redirects, `/api/v1/emis/callback` and `/api/v1/emails/unsubscribe`. The list is in `src/middlewares/apiKeys.ts`.
- A key that ships inside the web bundle or a mobile binary is **not a secret**. It identifies the client so you can monitor it, throttle it and revoke it. User data is still protected by the JWT and role checks.
- Swagger (`/api/docs`): click **Authorize** and paste a key to use Try-it-out.

Mobile (Flutter, Dio):

```dart
// --dart-define=API_KEY=mdr_live_...
dio.options.headers['x-api-key'] = const String.fromEnvironment('API_KEY');
```

## 3. E-mail

**What is sent automatically** (`src/controllers/emails.ts`, triggered from the event emitters and controllers):

| Trigger | Template |
| --- | --- |
| Customer signs up (`user.created`) | `welcome` |
| Order becomes confirmed, assigned (on its way), delivered or cancelled | `order-status` |
| Payment completed or failed (EMIS callback or manual `PATCH /payments/:id/status`) | `payment-completed` / `payment-failed` |
| Ticket bought | `ticket-purchased` |
| Event cancelled (all ticket holders) | `event-cancelled` |

**Admin endpoints** (JWT and Admin role, plus the API key):
- `GET /api/v1/emails/templates`
- `POST /api/v1/emails/send` with body `{ user_ids, template, variables? }`
- `POST /api/v1/emails/broadcast` with body `{ audience: customers|staff|drivers|everyone, subject, heading, body, cta_label?, cta_url?, image_url? }`. This sends the `announcement` template, skips users who unsubscribed, and adds a one-click unsubscribe link and header.

**Without SMTP** (`SMTP_HOST` empty), nothing is sent. Each e-mail is saved as an `.html` file in `logs/mail-previews/` instead.

**Deliverability.** The domain in `MAIL_FROM` needs SPF, DKIM and DMARC DNS records for the SMTP provider you use. Without them, Gmail will put these e-mails in spam.

### Designing templates

Templates are plain HTML files in `packages/api/content/emails/`. They are read from disk, so a change only needs a page refresh, not a rebuild. To create or restyle one:

1. Design it visually in a free editor that exports HTML, such as **Beefree** (the free plan exports HTML, with a monthly export cap) or **MJML** (mjml.io/try-it-live, free and unlimited, uses responsive email markup). Export the HTML.
2. Save it as `content/emails/<name>.html` and add front matter at the top:
   ```
   ---
   subject: "Encomenda #{{order.order_id}} confirmada"
   preheader: Optional grey preview text
   category: transactional      # or marketing (respects opt-out, adds unsubscribe link)
   sample:                      # fake data for the preview page
     order: { order_id: 1042 }
   ---
   ```
3. Replace the editor's placeholder text with `{{variables}}`. See the existing templates for what each trigger provides. Every template also gets `user.first_name`, `user.name`, `app_name`, `frontend_url`, `logo_url`, `support_email`, `year` and `colors.*`. Helpers: `{{money x}}`, `{{date x}}`, `{{time x}}`, `{{#each}}`, `{{#if}}`, `{{paragraphs text}}`.
4. Open **Management → E-mails** and use **Preview** to check it, then **Send test to me**.

Hand-written templates can instead wrap themselves in the shared brand layout with `{{#> layout}} … {{/layout}}` (`_layout.html`). `<style>` blocks are inlined automatically when the e-mail is sent.

## 4. Logs

Logs are written as rotating JSON files in `packages/api/logs/` (`LOG_DIR`). Each day's files are gzipped and kept for `LOG_RETENTION_DAYS` days.

| File | Contents |
| --- | --- |
| `error-YYYY-MM-DD.log` | Every error with its stack trace: controller failures (via `handleControllerError`), unhandled exceptions/rejections, failed e-mails. **Check this file first.** |
| `app-YYYY-MM-DD.log` | `info` and above: logins, key created/revoked, e-mails sent, rejected keys, existing `console.*` output |
| `access-YYYY-MM-DD.log` | One line per request: method, URL (tokens redacted), status, duration, IP, user, API key |

- Every line written during a request carries its `requestId`. The same id is returned in the `x-request-id` response header, and 500 responses quote it. Searching for it in **Management → Logs** shows everything that request did.
- On the VPS: `tail -f logs/error-$(date +%F).log | jq .`, or `pm2 logs` for the console stream.
- New code should use `import { logger, scoped } from 'lib/logger'`, with `const log = scoped('orders'); log.info('…', { order_id })`.
