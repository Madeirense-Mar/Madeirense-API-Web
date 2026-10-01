import {
    type NextFunction,
    type Response
} from 'express';

import jwt from 'jsonwebtoken';

import {
    $Enums
} from '@Madeirense/database';

import {
    API$Enumerators,
    type API$Types,
    type authenticatedProfileType
} from '@Madeirense/shared';

import env from '../env';

import {
    prisma
} from '../lib/prisma';

import {
    API_MAX_TIME_SESSION_TOKEN
} from '../utilities/constants.js';

import {
    generateToken
} from '../utilities/generators.js';

import {
    parseTokensFromRequest
} from '../utilities/parsers.js';

import {
    Prisma$Utilities
} from '../utilities/ORM.js';

import type {
    IAuthenticatedRequest,
} from '../interfaces.js';

import type {
    JWTPayloadType
} from '../types.js';

// ***************************************************************************************************************

export const onlyAllowUserRoles = (roles: $Enums.Users_user_role[]) => {
    return (
        req: IAuthenticatedRequest,
        res: Response<API$Types.response<undefined, 'Error'>>,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(401).json({
                code: 'UNAUTHORIZED',
                data: undefined,
                httpStatus: 401,
                message: 'Authentication required',
                success: false
            });
        }

        if (!roles.includes(req.user.user_role)) {
            return res.status(403).json({
                code: 'FORBIDDEN',
                data: undefined,
                httpStatus: 403,
                message: 'Insufficient permissions',
                success: false
            });
        }

        next();
    };
};

export const validateJWT = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<undefined, 'Error'>>,
    next: NextFunction
) => {
    const headers = req.headers;

    try {
        const {
            refreshToken,
            sessionToken
        } = parseTokensFromRequest(req);

        if ([refreshToken, sessionToken].every(t => t === '')) {
            return res.status(401).json({
                code: 'UNAUTHORIZED',
                data: undefined,
                httpStatus: 401,
                message: 'Access token required',
                success: false
            });
        }

        let payload: JWTPayloadType;
        let hasSessionExpired: boolean = false;

        try {
            if (!sessionToken) throw new Error('expired');

            payload = jwt.verify(sessionToken as string, env.JWT_SESSION_SECRET!) as JWTPayloadType;
        } catch (error) {
            switch (headers[API$Enumerators.Headers.platform] as keyof typeof API$Enumerators.Platforms) {
                case 'web':
                    switch (true) {
                        case (error as Error).message.includes('expired'):
                            payload = jwt.verify(refreshToken as string, env.JWT_REFRESH_SECRET!) as JWTPayloadType;

                            hasSessionExpired = true;
                            
                            break;
                        
                        default: throw (error as Error).message;
                    }

                    break;

                // Added 2026-09-08. Mobile never sends a refresh token as a
                // header (see parseTokensFromRequest — it's hardcoded to ''
                // for mobile), so unlike web there's nothing in `refreshToken`
                // here to fall back to. It only shows up in the POST body of
                // the dedicated /v1/auth/refresh call, which is exactly the
                // request this expired-session branch needs to let through.
                case 'mobile':
                    switch (true) {
                        case (error as Error).message.includes('expired'): {
                            const mobileRefreshToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;

                            if (!mobileRefreshToken) throw (error as Error).message;

                            payload = jwt.verify(mobileRefreshToken, env.JWT_REFRESH_SECRET!) as JWTPayloadType;

                            hasSessionExpired = true;

                            break;
                        }

                        default: throw (error as Error).message;
                    }

                    break;

                default: throw (error as Error).message;
            }
        }

        const user: (authenticatedProfileType | null) = await prisma.users.findUnique({
            where: {
                user_id: parseInt(payload.userId, 10)
            },
            include: Prisma$Utilities.Inclusions.Users.Profile
        });

        if (!user) {
            return res.status(401).json({
                code: 'UNAUTHORIZED',
                data: undefined,
                httpStatus: 401,
                message: 'Invalid token',
                success: false
            });
        }

        if (hasSessionExpired) {
            res.cookie(
                'sessionToken',
                generateToken(user, 'SESSION'),
                {
                    httpOnly: true,
                    maxAge: API_MAX_TIME_SESSION_TOKEN,
                });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(403).json({
            code: 'FORBIDDEN',
            data: undefined,
            errors: [
                {
                    'jwtAuthentication': (error as Error).message
                }
            ],
            httpStatus: 403,
            message: 'Invalid or expired token',
            success: false,
        });
    }
};