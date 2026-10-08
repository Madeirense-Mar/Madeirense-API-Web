import { timingSafeEqual } from 'crypto';

import type {
    CookieOptions,
    NextFunction,
    Request,
    Response
} from 'express';

import jwt from 'jsonwebtoken';

import env from '../env';

import { prisma } from '../lib/prisma';

import {
    scoped,
    setLogContext
} from '../lib/logger';

import { encryptPassword } from '../utilities/functions';

// ***************************************************************************************************************

/**
 * Management console session: a short-lived JWT in an httpOnly,
 * SameSite=Strict cookie scoped to the console's own path. It's signed with
 * a different audience than the app's session tokens, so a regular web
 * session cookie can never be replayed here (and vice-versa). Only users
 * whose role is in {@link MANAGEMENT_ROLES} can sign in, and the role is
 * re-checked against the DB on every request — demoting someone logs them
 * out immediately.
 */

const log = scoped('management');

export const MANAGEMENT_COOKIE = 'mxp_mgmt';

export const MANAGEMENT_ROLES = ['Admin'] as const;

const AUDIENCE = 'madeirense-management';

const secret = () => env.JWT_SECRET || env.SESSION_SECRET;

export type managementUserType = {
    user_id: number;
    name: string;
    email: string;
};

export interface IManagementRequest extends Request {
    manager?: managementUserType;
};

const cookieOptions = (req: Request): CookieOptions => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: req.baseUrl || '/',
    maxAge: env.MANAGEMENT_SESSION_MINUTES * 60 * 1000
});

const readCookie = (req: Request, name: string) => {
    for (const part of (req.headers.cookie ?? '').split(';')) {
        const index = part.indexOf('=');

        if (index > -1 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
    }

    return undefined;
};

export const startSession = (req: Request, res: Response, user_id: number) => {
    const token = jwt.sign({ sub: String(user_id) }, secret(), {
        audience: AUDIENCE,
        expiresIn: `${env.MANAGEMENT_SESSION_MINUTES}m`
    });

    res.cookie(MANAGEMENT_COOKIE, token, cookieOptions(req));
};

export const endSession = (req: Request, res: Response) => {
    const { maxAge: _maxAge, ...options } = cookieOptions(req);

    res.clearCookie(MANAGEMENT_COOKIE, options);
};

/** Verifies e-mail + password against Credentials and the user's role. */
export const authenticateManager = async (email: string, password: string): Promise<managementUserType | null> => {
    const normalized = email.trim().toLowerCase();

    const [credential, user] = await Promise.all([
        prisma.credentials.findUnique({ where: { email: normalized } }),
        prisma.users.findUnique({
            where: { email: normalized },
            select: { user_id: true, name: true, email: true, user_role: true }
        })
    ]);

    // Always hash, even for unknown e-mails, so response time doesn't reveal which accounts exist.
    const presented = Buffer.from(encryptPassword(password));
    const stored = Buffer.from(credential?.hash ?? '0'.repeat(presented.length));

    const passwordOk = stored.length === presented.length && timingSafeEqual(stored, presented) && Boolean(credential);

    if (!passwordOk || !user) {
        log.warn('Management login failed: bad credentials', { email: normalized });

        return null;
    }

    if (!(MANAGEMENT_ROLES as readonly string[]).includes(user.user_role)) {
        log.warn('Management login refused: insufficient role', { email: normalized, role: user.user_role });

        return null;
    }

    log.info('Management login', { userId: user.user_id, email: normalized });

    return { user_id: user.user_id, name: user.name, email: user.email };
};

/**
 * Resolves the session cookie into `req.manager` (sliding expiry). Doesn't
 * reject — routes decide whether to show the login page or redirect.
 */
export const loadManager = async (req: IManagementRequest, res: Response, next: NextFunction) => {
    const token = readCookie(req, MANAGEMENT_COOKIE);

    if (!token) return next();

    try {
        const payload = jwt.verify(token, secret(), { audience: AUDIENCE }) as { sub: string };

        const user = await prisma.users.findUnique({
            where: { user_id: parseInt(payload.sub, 10) },
            select: { user_id: true, name: true, email: true, user_role: true }
        });

        if (!user || !(MANAGEMENT_ROLES as readonly string[]).includes(user.user_role)) {
            endSession(req, res);

            return next();
        }

        req.manager = { user_id: user.user_id, name: user.name, email: user.email };

        setLogContext({ userId: user.user_id });

        startSession(req, res, user.user_id);
    } catch {
        endSession(req, res);
    }

    next();
};

export const requireManager = (req: IManagementRequest, res: Response, next: NextFunction) => {
    if (req.manager) return next();

    if (req.method === 'GET') return res.redirect(303, `${req.baseUrl}/?next=${encodeURIComponent(req.originalUrl)}`);

    return res.redirect(303, `${req.baseUrl}/`);
};
