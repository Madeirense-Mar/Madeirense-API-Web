import env from '../env';

// ***************************************************************************************************************
//
// EMIS (Empresa Interbancária de Serviços — Angola's interbank payment
// network) gateway client.
//
// *** UNVERIFIED / SCAFFOLD ONLY — do not treat this as a working
// integration. *** There is no publicly-discoverable EMIS API
// documentation, and no EMIS credentials exist anywhere in this
// codebase or its env files, so nothing below has ever talked to a real
// EMIS endpoint. This file exists so the *shape* of the integration
// (what `createPayment` needs to call, what the callback route needs to
// verify and parse) is in place and everything downstream of it
// (controllers/payment.ts, routes/emis.ts) can be written and reviewed
// now — the body of `initiatePayment` and `verifyCallbackSignature`
// need to be replaced with real calls once real API docs/credentials
// exist. See TODO.md at the repo root — this is flagged as the #1 item.
//
// Robbie's described flow (2026-09-30): our API sends a payment request
// to EMIS → the user gets a push notification prompting them to pay →
// they complete payment on EMIS's side (not in this app) → EMIS calls
// our callback endpoint → we update Payments.status to completed/failed.
//
// ***************************************************************************************************************

export type EmisInitiateResult = {
    /** EMIS's own reference/transaction id for this payment request —
     *  stored on Payments.gateway_reference so the callback (which has
     *  no other way to identify which of our payments it's about) can
     *  be matched back to a row. */
    gatewayReference: string
};

/**
 * Asks EMIS to start collecting payment for an amount already recorded
 * as a `pending` Payments row. Whatever EMIS needs to actually prompt
 * the customer (a phone number? the customer's EMIS/Multicaixa
 * reference? a merchant POS id?) is unknown — `payerPhone` below is a
 * guess at the minimum EMIS would need, not a confirmed field name.
 *
 * UNVERIFIED: currently just fabricates a reference locally instead of
 * calling anything, so `createPayment` (controllers/payment.ts) has
 * something to store and the rest of the flow (push notification, the
 * payment staying `pending` until a callback resolves it) can be
 * exercised end-to-end once this function's body is replaced with a
 * real HTTP call to `env.EMIS_API_BASE_URL`.
 */
export async function initiatePayment(args: {
    paymentId: number,
    amount: number,
    payerPhone?: string
}): Promise<EmisInitiateResult> {
    if (!env.EMIS_API_BASE_URL || !env.EMIS_API_KEY || !env.EMIS_MERCHANT_ID) {
        throw new Error(
            'EMIS is not configured (EMIS_API_BASE_URL/EMIS_API_KEY/EMIS_MERCHANT_ID) — ' +
            'see TODO.md at the repo root.'
        );
    }

    // TODO(real EMIS integration): replace with the actual HTTP call,
    // e.g.
    //   const response = await fetch(`${env.EMIS_API_BASE_URL}/<real path>`, {
    //       method: 'POST',
    //       headers: {
    //           'Content-Type': 'application/json',
    //           'Authorization': `Bearer ${env.EMIS_API_KEY}`
    //       },
    //       body: JSON.stringify({
    //           merchantId: env.EMIS_MERCHANT_ID,
    //           amount: args.amount,
    //           reference: `madeirense-payment-${args.paymentId}`,
    //           phone: args.payerPhone
    //       })
    //   });
    //   if (!response.ok) throw new Error(`EMIS initiate failed: ${response.status}`);
    //   const payload = await response.json();
    //   return { gatewayReference: payload.<whatever EMIS actually calls it> };
    throw new Error(
        'services/emis.ts#initiatePayment is an unimplemented scaffold — ' +
        'see this file\'s header comment and TODO.md at the repo root.'
    );
}

export type EmisCallbackPayload = {
    gatewayReference: string,
    status: 'completed' | 'failed',
};

/**
 * Verifies that an inbound `POST /v1/emis/callback` request genuinely
 * came from EMIS. UNVERIFIED: implemented here as a single shared-secret
 * header check (`x-emis-callback-secret` against env.EMIS_CALLBACK_SECRET)
 * because that's the simplest scheme that could work — EMIS may instead
 * require a signed payload (HMAC), mutual TLS, or an IP allowlist. This
 * MUST be replaced with whatever EMIS's real docs specify before this
 * endpoint is trusted with anything — right now a shared secret is the
 * only thing standing between "EMIS confirmed this payment" and "anyone
 * who knows the URL and the secret confirmed this payment", which is
 * only as safe as that secret's handling.
 */
export function verifyCallbackSecret(providedSecret: string | undefined): boolean {
    if (!env.EMIS_CALLBACK_SECRET) return false;

    return providedSecret === env.EMIS_CALLBACK_SECRET;
}

/**
 * Parses an inbound EMIS callback body into the shape the rest of the
 * app expects. UNVERIFIED: field names (`reference`, `status`) are
 * placeholders — EMIS's real callback payload shape is unknown.
 */
export function parseCallbackPayload(body: any): EmisCallbackPayload | null {
    const gatewayReference = body?.reference;
    const rawStatus = body?.status;

    if (typeof gatewayReference !== 'string' || !gatewayReference) return null;

    const status = (rawStatus === 'completed' || rawStatus === 'success')
        ? 'completed'
        : (rawStatus === 'failed' || rawStatus === 'declined')
            ? 'failed'
            : null;

    if (!status) return null;

    return { gatewayReference, status };
}
