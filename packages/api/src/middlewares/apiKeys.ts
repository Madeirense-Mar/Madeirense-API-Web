import type {
    NextFunction,
    Request,
    Response
} from 'express';

import { 
    API$Enumerators,
    type API$Types
} from '@Madeirense/shared';

import env from '../env';

import {
    scoped,
    setLogContext
} from '../lib/logger';

import {
    verifyApiKey,
    type apiKeyFailureType,
    type resolvedApiKeyType
} from '../services/apiKeys';

// ***************************************************************************************************************

const log = scoped('api-keys');

export interface IApiKeyRequest extends Request {
    apiKey?: resolvedApiKeyType;
};

/**
 * Paths that can't carry an `x-api-key` header, matched against
 * `req.path` as seen at the app level (i.e. including the `/api` prefix):
 *
 * - `/api`, `/api/health` — uptime checks.
 * - `/api/docs` — Swagger UI (use its "Authorize" button for Try-it-out calls).
 * - `/api/management` — has its own login.
 * - OAuth `/google` & `/facebook` (+ callbacks) — full-page browser redirects.
 * - `/api/v1/emis/callback` — called by EMIS's servers; has its own shared secret.
 * - `/api/v1/emails/unsubscribe` — clicked from inside an e-mail.
 */
const EXEMPT: (string | RegExp)[] = [
    '/api',
    '/api/',
    '/api/health',
    /^\/api\/docs(\/|$)/,
    /^\/api\/management(\/|$)/,
    /^\/api\/v1\/auth\/(google|facebook)(\/callback)?\/?$/,
    '/api/v1/emis/callback',
    '/api/v1/emails/unsubscribe'
];

const isExempt = (path: string) => EXEMPT.some(rule => (typeof rule === 'string' ? rule === path : rule.test(path)));

const MESSAGES: Record<apiKeyFailureType, string> = {
    MISSING: `An API key is required (send it in the "${API$Enumerators.Headers['api-key']}" header)`,
    MALFORMED: 'The API key is malformed',
    UNKNOWN: 'The API key is not valid',
    REVOKED: 'The API key has been revoked',
    EXPIRED: 'The API key has expired'
};

/**
 * Base protection layer — runs before any route, independent of user roles.
 * Every request must present a valid, unrevoked, unexpired key in
 * `x-api-key`. Behaviour is controlled by `API_KEY_MODE` (enforce | report | off).
 */
export const requireApiKey = async (
    req: IApiKeyRequest,
    res: Response<API$Types.response<undefined, any>>,
    next: NextFunction
) => {
    if (env.API_KEY_MODE === 'off' || req.method === 'OPTIONS' || isExempt(req.path)) return next();

    try {
        const result = await verifyApiKey(req.header(API$Enumerators.Headers['api-key']), req.ip);

        if (result.ok) {
            req.apiKey = result.key;

            setLogContext({ apiKey: result.key.name });

            return next();
        }

        if (env.API_KEY_MODE === 'report') {
            log.warn(`Request without a valid API key let through (report mode): ${result.reason}`, {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                reason: result.reason
            });

            return next();
        }

        log.warn(`Rejected request: ${result.reason} API key`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            reason: result.reason
        });

        return res.status(401).json({
            code: 'INVALID_API_KEY',
            data: undefined,
            httpStatus: 401,
            message: MESSAGES[result.reason],
            success: false
        });
    } catch (error) {
        // Fail closed — a DB outage shouldn't turn into an open API.
        log.error('API key verification failed', { error });

        return res.status(503).json({
            code: 'API_GENERIC_ERROR',
            data: undefined,
            httpStatus: 503,
            message: 'Unable to verify API key right now, please retry',
            success: false
        });
    }
};
