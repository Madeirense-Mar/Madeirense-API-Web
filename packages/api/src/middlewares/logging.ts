import { randomUUID } from 'crypto';

import type {
    NextFunction,
    Request,
    Response
} from 'express';

import type { API$Types } from '@Madeirense/shared';

import {
    logContext,
    logger
} from '../lib/logger';

// ***************************************************************************************************************

const REQUEST_ID_HEADER = 'x-request-id';

/** Query-string keys whose values never reach the logs. */
const REDACTED_QUERY_KEYS = ['token', 'api_key', 'apikey', 'key', 'password', 'code'];

const redactUrl = (url: string) => {
    const index = url.indexOf('?');

    if (index === -1) return url;

    const params = new URLSearchParams(url.slice(index + 1));

    for (const key of [...params.keys()]) {
        if (REDACTED_QUERY_KEYS.includes(key.toLowerCase())) params.set(key, '[redacted]');
    }

    return `${url.slice(0, index)}?${params.toString()}`;
};

/**
 * First middleware in the chain. Gives every request an id (reusing an
 * incoming `x-request-id` from Nginx/the client when it looks sane), echoes
 * it back as a response header, and opens the async log context that every
 * `logger.*` call made while handling the request will inherit.
 */
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = (incoming && /^[\w-]{8,64}$/.test(incoming)) ? incoming : randomUUID();

    res.setHeader(REQUEST_ID_HEADER, requestId);

    (req as Request & { requestId?: string }).requestId = requestId;

    logContext.run({ requestId, method: req.method, path: req.path }, () => next());
};

/**
 * Access log — one `http`-level line per finished request, written to
 * `access-*.log`. 5xx responses are additionally logged at `error` level so
 * they land in `error-*.log` next to the stack trace that caused them.
 * Request/response bodies are deliberately never logged (passwords, tokens).
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const user = (req as Request & { user?: { user_id?: number } }).user;
        const apiKey = (req as Request & { apiKey?: { name: string } }).apiKey;

        const meta = {
            method: req.method,
            url: redactUrl(req.originalUrl),
            status: res.statusCode,
            durationMs: Math.round(durationMs * 10) / 10,
            ip: req.ip,
            userAgent: req.header('user-agent'),
            platform: req.header('x-platform'),
            contentLength: res.getHeader('content-length'),
            ...(user?.user_id && { userId: user.user_id }),
            ...(apiKey && { apiKey: apiKey.name })
        };

        const line = `${req.method} ${meta.url} ${res.statusCode} ${meta.durationMs}ms`;

        // 5xx go to app-*.log as warnings; the stack itself is logged at `error`
        // by handleControllerError/errorHandler, so error-*.log stays one entry per failure.
        if (res.statusCode >= 500) logger.warn(line, { ...meta, scope: 'http' });
        else logger.http(line, meta);
    });

    next();
};

/**
 * Last-resort Express error handler (must be registered after all routes).
 * Catches anything thrown/`next(err)`-ed outside the controllers' own
 * try/catch — malformed JSON bodies, CORS rejections, middleware crashes —
 * logs it with its stack, and answers in the API's usual response shape.
 */
export const errorHandler = (
    error: Error & { status?: number, statusCode?: number, type?: string },
    req: Request,
    res: Response<API$Types.response<undefined, any>>,
    _next: NextFunction
) => {
    const status = error.status ?? error.statusCode ?? (error.message === 'Not allowed by CORS' ? 403 : 500);
    const requestId = (req as Request & { requestId?: string }).requestId;

    if (status >= 500) logger.error(`Unhandled error: ${error.message}`, { scope: 'express', error });
    else logger.warn(`Request rejected: ${error.message}`, { scope: 'express', status });

    if (res.headersSent) return;

    res.status(status).json({
        code: status >= 500 ? 'API_GENERIC_ERROR' : (error.type === 'entity.parse.failed' ? 'BAD_REQUEST' : 'FORBIDDEN'),
        data: undefined,
        httpStatus: status,
        message: status >= 500 ? `Internal server error (request id: ${requestId})` : error.message,
        success: false
    });
};
