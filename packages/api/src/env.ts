import path from 'path';

import { config } from 'dotenv';

import {
    which,
    type environmentType
} from '@Madeirense/shared';

import { 
    API_PASSWORD_ENCRYPTION_ITERATOR
} from './utilities/constants';

//-----------------------------

const environment = which(
    process.env.NODE_ENV,
    'development'
) as environmentType;

config({
    path: path.resolve(process.cwd(), ['.env', '.', environment].join(''))
});

/**
 * Environment Helper
 * 
 * Contains accurately type data provided by the environment file, it also composes variables base on other values described in the files.
 * 
 * - Unless you're adding empty string or undefined values, _edit your default values in the primary environment files_.
 * - Add documentation via JSDocs to some of the configured environment variables.
 * - Create derived values based on environment values.
 * - Use the `which` function to cycle through stored env values and default values.
 */
const env = {
    // Server Configurations
    // --------------------------: General
    APP_NAME: which(process.env.APP_NAME, 'Madeirense-API') as string,
    API_URL: which(process.env.API_URL, 'http://localhost:3001') as string,
    PORT: parseInt(which(process.env.PORT, '3001') as string),
    NODE_ENV: environment,
    ENABLE_VERBOSITY: which(process.env.ENABLE_VERBOSITY, 'false') === 'true',

    // --------------------------: Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(which(process.env.RATE_LIMIT_WINDOW_MS, '900000') as string),
    RATE_LIMIT_MAX_REQUESTS: parseInt(which(process.env.RATE_LIMIT_MAX_REQUESTS, '100') as string),

    // ---------------------------------------------------------------------------------------- #

    // Application Configurations
    // --------------------------: Database
    DATABASE_URL: process.env.DATABASE_URL as string,

    // --------------------------: Web Push
    SERVER_PUSH_SUBJECT: process.env.SERVER_PUSH_SUBJECT as string,
    CLIENT_VAPID_PRIVATE_KEY: process.env.CLIENT_VAPID_PRIVATE_KEY as string,
    CLIENT_VAPID_PUBLIC_KEY: process.env.CLIENT_VAPID_PUBLIC_KEY as string,

    // --------------------------: Encryption
    PASSWORD_ENCRYPTION_SALT: process.env.PASSWORD_ENCRYPTION_SALT as string,
    PASSWORD_ENCRYPTION_ITERATOR: parseInt(which(process.env.PASSWORD_ENCRYPTION_ITERATOR, API_PASSWORD_ENCRYPTION_ITERATOR.toString()) as string),

    // --------------------------: Firebase
    // These seven are the *client* (web) SDK config used by
    // firebase/index.ts — unrelated to the Admin SDK credential below,
    // which is what actually lets this server send FCM pushes.
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY as string,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID as string,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN as string,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID as string,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET as string,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID as string,
    FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID as string,

    // --------------------------: Firebase Admin (mobile push / FCM)
    // Added 2026-09-30 — see firebase/admin.ts. A full service-account
    // JSON (downloaded from Firebase Console → Project Settings →
    // Service Accounts → Generate new private key), minified to one
    // line and set as a single env var. NOT the same credential as the
    // FIREBASE_* block above — see INSTRUCTIONS.md at the repo root for
    // how to obtain it.
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string,

    // --------------------------: EMIS payment gateway
    // Added 2026-09-30 — see services/emis.ts. Placeholder names: swap
    // for whatever EMIS's actual onboarding paperwork calls these once
    // that's in hand (see TODO.md at the repo root — this is the single
    // biggest unknown in the whole integration).
    EMIS_API_BASE_URL: process.env.EMIS_API_BASE_URL as string,
    EMIS_API_KEY: process.env.EMIS_API_KEY as string,
    EMIS_MERCHANT_ID: process.env.EMIS_MERCHANT_ID as string,
    // Shared secret this server uses to confirm an inbound
    // `/v1/emis/callback` request genuinely came from EMIS and not from
    // anyone who found the URL — see routes/emis.ts. Whether EMIS
    // actually supports a scheme this simple (vs. requiring a signed
    // payload, mutual TLS, or an IP allowlist instead) is unconfirmed.
    EMIS_CALLBACK_SECRET: process.env.EMIS_CALLBACK_SECRET as string,

    // --------------------------: JWT
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_SESSION_SECRET: process.env.JWT_SESSION_SECRET as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
    JWT_EXPIRE: process.env.JWT_EXPIRE as string,

    // --------------------------: Session Management
    SESSION_SECRET: process.env.SESSION_SECRET as string,

    // --------------------------: Authentication passport
    // Google OAuth
    GOOGLE_CLIENT_NAME: process.env.GOOGLE_CLIENT_NAME as string,
    GOOGLE_CLIENT_ID: which(process.env.GOOGLE_CLIENT_ID, 'some-id') as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL as string,

    // Facebook OAuth
    FACEBOOK_APP_NAME: process.env.FACEBOOK_APP_NAME as string,
    FACEBOOK_APP_ID: which(process.env.FACEBOOK_APP_ID, 'some-id') as string,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET as string,
    FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL as string,

    // --------------------------: CORS
    /** When enabled, will only work on development environment. Otherwise, will only render a warning */
    CORS_ALLOW_ALL: (which(process.env.CORS_ALLOW_ALL, 'false') as string) === 'true',
    CORS_ORIGIN_WHITE_LIST: (which(process.env.CORS_ORIGIN_WHITE_LIST, 'http://localhost:3000') as string).split(','),
    FRONTEND_URL: which(process.env.FRONTEND_URL, 'http://localhost:3000') as string,

    // --------------------------: UploadCare
    UPLOAD_CARE_UP_API_URL: process.env.UPLOAD_CARE_UP_API_URL as string,
    UPLOAD_CARE_PUBLIC_KEY: process.env.UPLOAD_CARE_PUBLIC_KEY as string,
    UPLOAD_CARE_SECRET_KEY: process.env.UPLOAD_CARE_SECRET_KEY as string,

    UPLOAD_CARE_PASSWORD_RECOVERY: process.env.UPLOAD_CARE_PASSWORD_RECOVERY as string,

    // --------------------------: Routing (self-hosted OSRM)
    // Bound to 127.0.0.1 only on the VPS — never exposed publicly. See
    // infra/osrm/README.md for the full setup writeup.
    OSRM_BASE_URL: which(process.env.OSRM_BASE_URL, 'http://127.0.0.1:5000') as string,

    // --------------------------: Logging
    // Added 2026-10-08 — see lib/logger.ts.
    /** Minimum level recorded overall: error | warn | info | http | verbose | debug. `http` = one line per request. */
    LOG_LEVEL: which(process.env.LOG_LEVEL, 'http') as string,
    /** Minimum level echoed to stdout (what `pm2 logs` shows). */
    LOG_CONSOLE_LEVEL: which(process.env.LOG_CONSOLE_LEVEL, environment === 'development' ? 'debug' : 'info') as string,
    /** Relative to the process cwd (packages/api when started by PM2/nodemon). */
    LOG_DIR: which(process.env.LOG_DIR, 'logs') as string,
    LOG_TO_FILES: which(process.env.LOG_TO_FILES, 'true') === 'true',
    LOG_RETENTION_DAYS: parseInt(which(process.env.LOG_RETENTION_DAYS, '30') as string),
    LOG_MAX_FILE_SIZE: which(process.env.LOG_MAX_FILE_SIZE, '20m') as string,

    // --------------------------: Proxy
    /**
     * Express `trust proxy` setting. `loopback` trusts X-Forwarded-For only
     * when the request comes from 127.0.0.1/::1 — i.e. Nginx on the same VPS —
     * which is what makes `req.ip` (rate limiting, logs, API key usage) the
     * real client IP instead of Nginx's.
     */
    TRUST_PROXY: which(process.env.TRUST_PROXY, 'loopback') as string,

    // --------------------------: API keys
    // Added 2026-10-08 — see middlewares/apiKeys.ts and management/.
    /**
     * `enforce` → requests without a valid `x-api-key` get 401.
     * `report`  → let them through but log a warning (use while rolling keys out to the apps).
     * `off`     → middleware disabled.
     */
    API_KEY_MODE: which(process.env.API_KEY_MODE, 'enforce') as ('enforce' | 'report' | 'off'),
    /** How long a validated key is cached in memory before re-checking the DB (revocations from /management are instant regardless). */
    API_KEY_CACHE_TTL_MS: parseInt(which(process.env.API_KEY_CACHE_TTL_MS, '60000') as string),

    // --------------------------: Management console
    /** Minutes a /api/management login stays valid. */
    MANAGEMENT_SESSION_MINUTES: parseInt(which(process.env.MANAGEMENT_SESSION_MINUTES, '60') as string),

    // --------------------------: E-mail (SMTP)
    // Added 2026-10-08 — see services/mailer.ts. Any SMTP provider works
    // (Hostinger mailbox, Brevo, Resend, Gmail Workspace…). When SMTP_HOST is
    // empty, e-mails aren't sent: they're rendered and saved as .html files
    // under LOG_DIR/mail-previews/ instead, so templates can still be checked.
    SMTP_HOST: (process.env.SMTP_HOST ?? ''),
    SMTP_PORT: parseInt(which(process.env.SMTP_PORT, '465') as string),
    /** true for port 465 (implicit TLS), false for 587 (STARTTLS). */
    SMTP_SECURE: which(process.env.SMTP_SECURE, 'true') === 'true',
    SMTP_USER: (process.env.SMTP_USER ?? ''),
    SMTP_PASSWORD: (process.env.SMTP_PASSWORD ?? ''),
    /** e.g. `Madeirense <no-reply@madeirense.co.ao>` — the domain must match the SMTP account / SPF / DKIM. */
    MAIL_FROM: which(process.env.MAIL_FROM, 'Madeirense <no-reply@localhost>') as string,
    MAIL_REPLY_TO: (process.env.MAIL_REPLY_TO ?? ''),
    /** Outside production, every e-mail is redirected to this address (leave empty to keep real recipients). */
    MAIL_DEV_REDIRECT_TO: (process.env.MAIL_DEV_REDIRECT_TO ?? ''),
    /** Absolute URL of the logo used in e-mail headers (e-mail clients can't load relative/inline SVG logos reliably — use a PNG). */
    MAIL_LOGO_URL: (process.env.MAIL_LOGO_URL ?? ''),
    MAIL_SUPPORT_EMAIL: (process.env.MAIL_SUPPORT_EMAIL ?? ''),
    /** Parallel SMTP sends. Keep low — most providers throttle bursts. */
    MAIL_CONCURRENCY: parseInt(which(process.env.MAIL_CONCURRENCY, '2') as string),

    // Scripts configurations
    // --------------------------: Authorization
    SCRIPT_BEARER_TOKEN: which(process.env.SCRIPT_BEARER_TOKEN, "") as string,
    /** An API key (usage "service") generated at /api/management, sent by scripts in `x-api-key`. */
    SCRIPT_API_KEY: (process.env.SCRIPT_API_KEY ?? ''),
};

export default env;