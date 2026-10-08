import path from 'path';

import {
    Router,
    type Response
} from 'express';

import rateLimit from 'express-rate-limit';

import env from '../env';

import {
    listLogFiles,
    scoped,
    tailLogFile,
    type logFileType
} from '../lib/logger';

import {
    API_KEY_USAGE_TYPES,
    createApiKey,
    listApiKeys,
    revokeApiKey,
    type apiKeyUsageType
} from '../services/apiKeys';

import {
    EMAIL_TEMPLATES_DIR,
    listEmailTemplates,
    renderEmailSample
} from '../services/emailTemplates';

import {
    isSmtpConfigured,
    mailQueueStats,
    sendMailNow
} from '../services/mailer';

import { MANAGEMENT_APP_JS } from './assets';

import {
    authenticateManager,
    endSession,
    loadManager,
    requireManager,
    startSession,
    type IManagementRequest
} from './session';

import {
    emailsView,
    keysView,
    loginView,
    logsView,
    type flashType,
    type parsedLogLine
} from './views';

// ***************************************************************************************************************

/**
 * # /api/management
 *
 * Small server-rendered console for whoever runs the API:
 *
 * - **API keys** — generate (shown once), list with usage, revoke.
 * - **Logs** — browse/filter the rotating log files without SSH-ing in.
 * - **E-mails** — list templates, preview them with sample data, send a test.
 *
 * Exempt from the API-key middleware; protected by its own Admin-only login
 * (see ./session.ts). Every page sends `Cache-Control: no-store`.
 */

const log = scoped('management');

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        log.warn('Management login rate limit hit', { ip: req.ip });

        res.status(429).type('html').send(loginView({ base: req.baseUrl, error: 'Too many attempts. Try again in 15 minutes.' }));
    }
});

const NOTICES: Record<string, flashType> = {
    revoked: { kind: 'ok', message: 'Key revoked. Requests using it are now rejected.' },
    'not-found': { kind: 'error', message: 'That key no longer exists.' }
};

const noStore = (res: Response) => res.setHeader('Cache-Control', 'no-store');

router.use((_req, res, next) => {
    noStore(res);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
});

router.get('/assets/app.js', (_req, res) => {
    res.type('application/javascript').setHeader('Cache-Control', 'public, max-age=300');
    res.send(MANAGEMENT_APP_JS);
});

router.use(loadManager as any);

// --------------------------------------------------------------------------------------------- Auth

router.post('/login', loginLimiter as any, async (req: IManagementRequest, res) => {
    const { email = '', password = '', next = '' } = (req.body ?? {}) as Record<string, string>;

    try {
        const manager = email && password ? await authenticateManager(String(email), String(password)) : null;

        if (!manager) {
            return res.status(401).type('html').send(loginView({ base: req.baseUrl, error: 'Invalid credentials, or this account is not allowed here.', next }));
        }

        startSession(req, res, manager.user_id);

        const safeNext = typeof next === 'string' && next.startsWith(`${req.baseUrl}/`) && !next.startsWith('//') ? next : `${req.baseUrl}/`;

        return res.redirect(303, safeNext);
    } catch (error) {
        log.error('Management login error', { error });

        return res.status(500).type('html').send(loginView({ base: req.baseUrl, error: 'Something went wrong. Check the error log.' }));
    }
});

router.post('/logout', (req: IManagementRequest, res) => {
    if (req.manager) log.info('Management logout', { userId: req.manager.user_id });

    endSession(req, res);

    res.redirect(303, `${req.baseUrl}/`);
});

// --------------------------------------------------------------------------------------------- Keys

const renderKeys = async (req: IManagementRequest, res: Response, extras: { created?: { name: string, plain: string }, flash?: flashType | null } = {}) => {
    const showAll = req.query['all'] === '1';

    const keys = await listApiKeys({ includeInactive: showAll });

    const notice = typeof req.query['notice'] === 'string' ? NOTICES[req.query['notice']] : undefined;

    res.type('html').send(keysView({
        base: req.baseUrl,
        manager: req.manager!,
        keys,
        showAll,
        created: extras.created,
        flash: extras.flash ?? notice ?? null,
        mode: env.API_KEY_MODE
    }));
};

router.get('/', async (req: IManagementRequest, res) => {
    if (!req.manager) {
        const next = typeof req.query['next'] === 'string' ? req.query['next'] : '';

        return res.type('html').send(loginView({ base: req.baseUrl, next }));
    }

    try {
        await renderKeys(req, res);
    } catch (error) {
        log.error('Failed to render API keys page', { error });

        res.status(500).type('html').send('Failed to load keys — check the error log (did you run the 2026-10-08 SQL script and regenerate Prisma?).');
    }
});

router.post('/keys', requireManager as any, async (req: IManagementRequest, res) => {
    const { name = '', usage_type = 'other', description = '', expires_in = '365' } = (req.body ?? {}) as Record<string, string>;

    try {
        if (!String(name).trim()) {
            return renderKeys(req, res, { flash: { kind: 'error', message: 'A name is required.' } });
        }

        const type = (API_KEY_USAGE_TYPES as string[]).includes(usage_type) ? usage_type as apiKeyUsageType : 'other';

        const days = expires_in === 'never' ? null : Math.min(Math.max(parseInt(expires_in, 10) || 365, 1), 3650);

        const { plain, record } = await createApiKey({
            name: String(name),
            usage_type: type,
            description: String(description),
            expires_at: days === null ? null : new Date(Date.now() + days * 86_400_000),
            created_by: req.manager!.user_id
        });

        return renderKeys(req, res, { created: { name: record.name, plain } });
    } catch (error) {
        log.error('Failed to create API key', { error });

        return renderKeys(req, res, { flash: { kind: 'error', message: `Could not create key: ${(error as Error).message}` } });
    }
});

router.post('/keys/:id/revoke', requireManager as any, async (req: IManagementRequest, res) => {
    const key_id = parseInt(String(req.params['id']), 10);

    try {
        await revokeApiKey(key_id, req.manager!.user_id);

        return res.redirect(303, `${req.baseUrl}/?notice=revoked`);
    } catch (error) {
        log.warn('Failed to revoke API key', { key_id, error });

        return res.redirect(303, `${req.baseUrl}/?notice=not-found`);
    }
});

// --------------------------------------------------------------------------------------------- Logs

const parseLine = (raw: string): parsedLogLine => {
    try {
        const { timestamp, level, message, requestId, scope, service: _service, ...rest } = JSON.parse(raw) as Record<string, unknown>;

        return {
            timestamp: timestamp as string,
            level: level as string,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            requestId: requestId as string | undefined,
            scope: scope as string | undefined,
            raw,
            data: Object.keys(rest).length ? rest : null
        };
    } catch {
        return { raw, data: null };
    }
};

router.get('/logs', requireManager as any, (req: IManagementRequest, res) => {
    const logName = (['error', 'app', 'access'].includes(String(req.query['log'])) ? String(req.query['log']) : 'error') as logFileType;
    const files = listLogFiles(logName);
    const requested = typeof req.query['file'] === 'string' ? path.basename(req.query['file']) : '';
    const file = files.includes(requested) ? requested : (files[0] ?? '');
    const level = typeof req.query['level'] === 'string' ? req.query['level'] : '';
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim().slice(0, 200) : '';
    const limit = [100, 300, 1000].includes(Number(req.query['limit'])) ? Number(req.query['limit']) : 300;

    // Read more than we show when filtering so a filter still finds matches further back.
    const lines = (file ? tailLogFile(file, (q || level) ? 20_000 : limit) : [])
        .filter(line => !q || line.toLowerCase().includes(q.toLowerCase()))
        .map(parseLine)
        .filter(line => !level || line.level === level)
        .slice(-limit)
        .reverse();

    res.type('html').send(logsView({
        base: req.baseUrl,
        manager: req.manager!,
        log: logName,
        files,
        file,
        level,
        q,
        limit,
        lines
    }));
});

// --------------------------------------------------------------------------------------------- E-mails

const renderEmails = (req: IManagementRequest, res: Response, flash?: flashType | null) => {
    res.type('html').send(emailsView({
        base: req.baseUrl,
        manager: req.manager!,
        templates: listEmailTemplates(),
        smtp: isSmtpConfigured()
            ? `SMTP ${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.MAIL_FROM}`
            : 'No SMTP configured — e-mails are saved as files in LOG_DIR/mail-previews/',
        stats: mailQueueStats(),
        flash,
        templatesDir: path.relative(process.cwd(), EMAIL_TEMPLATES_DIR) || EMAIL_TEMPLATES_DIR
    }));
};

router.get('/emails', requireManager as any, (req: IManagementRequest, res) => renderEmails(req, res));

router.get('/emails/preview/:name', requireManager as any, (req: IManagementRequest, res) => {
    try {
        const rendered = renderEmailSample(String(req.params['name']), { unsubscribe_url: '#' });

        // The rendered e-mail references remote images (logo, event thumbnails) that
        // the API's default CSP would block; nothing in it is allowed to run scripts.
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; font-src * data:");

        res.type('html').send(`<!-- Subject: ${rendered.subject.replace(/--/g, '—')} -->\n${rendered.html}`);
    } catch (error) {
        res.status(404).type('text').send((error as Error).message);
    }
});

router.post('/emails/test', requireManager as any, async (req: IManagementRequest, res) => {
    const name = String((req.body ?? {})['template'] ?? '');

    try {
        const rendered = renderEmailSample(name, { unsubscribe_url: '#' });

        const result = await sendMailNow({
            to: req.manager!.email,
            subject: `[TEST] ${rendered.subject}`,
            html: rendered.html,
            text: rendered.text,
            tag: `test:${name}`
        });

        return renderEmails(req, res, {
            kind: 'ok',
            message: result.preview
                ? `No SMTP configured — saved to ${result.preview}`
                : `Sent "${name}" to ${req.manager!.email} (message id ${result.messageId ?? 'n/a'}).`
        });
    } catch (error) {
        log.error(`Test e-mail "${name}" failed`, { error });

        return renderEmails(req, res, { kind: 'error', message: `Sending failed: ${(error as Error).message}` });
    }
});

export default router;
