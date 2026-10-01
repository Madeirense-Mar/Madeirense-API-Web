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
    CORS_ORIGIN_WHITE_LIST: (which(process.env.CORS_ORIGIN_WHITE_LIST, 'http://localhost:3000') as string).split(','),
    FRONTEND_URL: which(process.env.FRONTEND_URL, 'http://localhost:3000') as string,

    // --------------------------: UploadCare
    UPLOAD_CARE_PUBLIC_KEY: process.env.UPLOAD_CARE_PUBLIC_KEY as string,
    UPLOAD_CARE_SECRET_KEY: process.env.UPLOAD_CARE_SECRET_KEY as string,

    UPLOAD_CARE_PASSWORD_RECOVERY: process.env.UPLOAD_CARE_PASSWORD_RECOVERY as string,

    // --------------------------: Routing (self-hosted OSRM)
    // Bound to 127.0.0.1 only on the VPS — never exposed publicly. See
    // infra/osrm/README.md for the full setup writeup.
    OSRM_BASE_URL: which(process.env.OSRM_BASE_URL, 'http://127.0.0.1:5000') as string
};

export default env;