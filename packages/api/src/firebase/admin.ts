import admin from 'firebase-admin';

import env from '../env';

// ***************************************************************************************************************
//
// Firebase Admin SDK — server-side, for sending FCM push to mobile
// devices (Flutter's `firebase_messaging`). Deliberately separate from
// `./index.ts`, which initializes the *client* (web) Firebase SDK and
// can't send anything — only the Admin SDK, authenticated with a
// service-account credential (not an API key), can call
// `messaging().send(...)`.
//
// Added 2026-09-30 as part of wiring mobile push notifications (see
// controllers/devicePushTokens.ts for token registration and
// controllers/pushNotifications.ts's `notifyUser` for the unified
// web-push + FCM send path). UNVERIFIED in the sense that this has never
// run against a real Firebase project from this environment — there's
// no Node toolchain available here to actually boot the server — but
// the Admin SDK's shape itself (`admin.credential.cert`,
// `admin.messaging().send`) is standard, documented API, not a guess.
//
// Requires env.FIREBASE_SERVICE_ACCOUNT_KEY (a full service-account JSON
// blob, minified to one line) — see INSTRUCTIONS.md at the repo root
// for how to generate one. Guarded rather than thrown on boot when it's
// missing/invalid, so a server without it configured yet still starts;
// every push attempt just fails closed (logged, `null` returned) until
// it's set.
//
// Messages are sent **data-only** (no FCM `notification` block), on
// purpose, to mirror how web push already works here: the server sends
// `{ notificationId, data }` (see Madeirense$Types.pushNotification)
// and lets the client decide what, if anything, to show — the web
// service worker (public/service-worker.js) does the same thing,
// `postMessage`-ing known notificationIds to open tabs for in-app
// live-updates and only falling back to a system notification for
// unrecognized ones. The Flutter client (push_notification_service.dart)
// mirrors that: it maps known notificationIds to a locally-shown
// notification via flutter_local_notifications rather than trusting a
// server-supplied title/body that this codebase's payload type doesn't
// actually carry.
//
// ***************************************************************************************************************

let app: admin.app.App | null = null;

function getApp(): admin.app.App | null {
    if (app) return app;

    const raw = env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!raw) {
        console.error('FCM push unavailable: FIREBASE_SERVICE_ACCOUNT_KEY is not set');

        return null;
    }

    try {
        const serviceAccount = JSON.parse(raw);

        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        }, 'madeirense-fcm');

        return app;
    } catch (error) {
        console.error('FCM push unavailable: could not parse/apply FIREBASE_SERVICE_ACCOUNT_KEY', error);

        return null;
    }
}

export type FCMSendResult = {
    success: boolean,
    /** Set when the send failed in a way that means the token is dead
     *  (unregistered/invalid) and the caller should delete it. */
    tokenInvalid?: boolean
};

/**
 * Sends a single data-only FCM message to one device token. `payload`
 * is JSON-stringified whole into a single `payload` data field, the
 * same way `webPush.sendNotification`'s STRINGIFIED$payload already
 * works in controllers/pushNotifications.ts — keeps both channels
 * carrying an identical envelope. Never throws — callers
 * (`pushToUserDevices` in controllers/pushNotifications.ts) loop over
 * several tokens per user and shouldn't have one dead token kill the
 * batch.
 */
export async function sendToDeviceToken(
    token: string,
    payload: unknown
): Promise<FCMSendResult> {
    const instance = getApp();

    if (!instance) return { success: false };

    try {
        await admin.messaging(instance).send({
            token,
            data: {
                payload: JSON.stringify(payload)
            }
        });

        return { success: true };
    } catch (error) {
        const code = (error as { code?: string })?.code;

        const tokenInvalid = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token'
        ].includes(code ?? '');

        if (!tokenInvalid) {
            console.error('FCM send error:', error);
        }

        return { success: false, tokenInvalid };
    }
}
