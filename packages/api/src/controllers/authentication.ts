import {
    type Request,
    type Response
} from 'express';

import jwt from 'jsonwebtoken';

import {
    type Users
} from '@Madeirense/database';

import {
    isEmpty,
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type authenticatedProfileType,
    type authenticationCredentialsType,
    type platformType,
    type tokenObjectType
} from '@Madeirense/shared';

import env from '../env';

import {
    API_MAX_TIME_REFRESH_TOKEN
} from '../utilities/constants';

import {
    convertDecimals
} from '../utilities/converters';

import {
    encryptPassword
} from '../utilities/functions';

import {
    generateToken
} from '../utilities/generators';

import {
    clearCart$Dry
} from './cart';

import {
    Prisma$Utilities
} from '../utilities/ORM';

import {
    parseJWTTokensFromHeaderCookies
} from '../utilities/parsers';

import {
    DEFAULT_COOKIES_OPTIONS
} from './utilities/constants';

import {
    Messages
} from './utilities/enumerators';

import {
    handleControllerError
} from './utilities/handlers';

import { prisma } from '../lib/prisma';
import { sendMailNow } from '../services/mailer';
import { renderEmail } from '../services/emailTemplates';

import type {
    IAuthenticatedRequest
} from '../interfaces';

import type { JWTPayloadType } from '../types';
import type { IApplicationRequest } from 'middlewares/settingsPropagation';

// ***************************************************************************************************************

export const hasCredentials = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const credential = await prisma.credentials.findUnique({
            where: { email: req.user?.email }
        });

        if (!credential) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            httpStatus: 404,
            message: 'Unable to fetch user\'s credentials',
            success: false
        });

        else return res.status(200).json({
            data: undefined,
            httpStatus: 200,
            message: 'Validated',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const login = async (
    req: Request<any, any, authenticationCredentialsType>,
    res: Response<API$Types.response<
        authenticatedProfileType | undefined,
        'Error'
    >>
) => {
    try {
        const {
            email,
            password
        } = req.body;

        const credential = await prisma.credentials.findUnique({
            where: {
                email
            }
        });

        switch (true) {
            case (!credential):
            case (encryptPassword(password) !== credential?.hash):
                throw new Error(`Invalid credentials`);

            default:
                break;
        }

        const profile = await prisma.users.findUnique({
            where: {
                email
            },
            include: {
                ...Prisma$Utilities.Inclusions.Users.Profile
            }
        });

        if (!profile) return res.status(404).json({
            data: undefined,
            code: "API_GENERIC_NOT_FOUND_ERROR",
            httpStatus: 404,
            message: 'User not found',
            success: false
        });

        const platform: platformType = req.headers[API$Enumerators.Headers.platform] as platformType ?? 'web';

        let tokens: Partial<tokenObjectType> = {};

        const [
            sessionToken,
            refreshToken
        ] = [
                generateToken(profile, 'SESSION'),
                generateToken(profile, 'REFRESH')
            ];

        switch (platform) {
            case 'mobile':
                tokens = {
                    sessionToken,
                    refreshToken
                };

                break;

            default:
                res.cookie('sessionToken', sessionToken, DEFAULT_COOKIES_OPTIONS);
                res.cookie('refreshToken', refreshToken, { ...DEFAULT_COOKIES_OPTIONS, maxAge: API_MAX_TIME_REFRESH_TOKEN });

                break;
        };

        return res.status(200).json({
            data: convertDecimals(profile),
            httpStatus: 200,
            message: 'Welcome!',
            tokens: tokens as tokenObjectType,
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const login$Dry = async (
    req: Request<any, any, authenticationCredentialsType>
): Promise<boolean> => {
    const {
        email,
        password
    } = req.body;

    const credential = await prisma.credentials.findUnique({
        where: {
            email
        }
    });

    switch (true) {
        case (!credential):
        case (encryptPassword(password) !== credential?.hash):
            throw new Error(`Invalid credentials`);

        default:
            return true;
    }
};

export const logout = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        clearCart$Dry(req.user.user_id as number, 'all');
    } catch (error) {
        console.error(
            `LOGOUT | An error occurred while clearing the user's cart during log-out: `, (error as Error).message
        );
    }

    req.logout((err) => {
        if (err) return res.status(500).json({
            data: undefined,
            errors: [
                {
                    "Message": (err as Error).message
                }
            ],
            httpStatus: 500,
            message: 'Error logging out',
            success: false,
        });

        [
            'sessionToken',
            'refreshToken'
        ].forEach(key => res.cookie(key, '', { httpOnly: true, maxAge: 1 }));

        return res.status(200).json({
            data: undefined,
            httpStatus: 200,
            success: true,
            message: `We'll see you again soon`
        });
    });
};

export const me = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<Users>>
) => {
    if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

    const {
        refreshToken = '',
        sessionToken = ''
    } = renewTokens(parseJWTTokensFromHeaderCookies((req.headers.cookie ?? '')));

    res.cookie('sessionToken', sessionToken, DEFAULT_COOKIES_OPTIONS);

    res.cookie('refreshToken', refreshToken, {
        ...DEFAULT_COOKIES_OPTIONS,
        maxAge: API_MAX_TIME_REFRESH_TOKEN
    });

    return res.json({
        data: convertDecimals(req.user),
        message: 'User retrieved successfully',
        success: true
    });
};

export const who = async (
    req: IAuthenticatedRequest<any, tokenObjectType>,
    res: Response<API$Types.response<Users>>
) => {
    if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

    return res.json({
        success: true,
        message: 'User retrieved successfully',
        data: convertDecimals(req.user),
        tokens: renewTokens(req.body)
    });
};

export const reset = async (
    req: IApplicationRequest<any, { email: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const user = await prisma.users.findFirst({
            where: { email: req.body.email }
        });

        if (!user) throw new Error("Couldn't find user");

        const authenticationToken = generateToken(user, "PASSWORD-RESET", env.APP_PASSWORD_RESET_EXPIRY_TIME);

        //This may take time, let's not wait for it. Just fire and forget for now
        sendMailNow(
            {
                to: req.body.email,
                ...renderEmail("password-reset", {
                    user_name: user.name,
                    expiry_time: env.APP_PASSWORD_RESET_EXPIRY_TIME,
                    redirect_url: `${env.FRONTEND_PASSWORD_RESET_URL}?${Madeirense$Enumerators.SearchQueries.token}=${authenticationToken}`
                })
            },
            `password-reset-request-user:${user.user_id}-${user.email}`
        );
    } catch (error) {
        console.error("Unable to send e-mail: ", error);
    }

    return res.json({
        success: true,
        message: 'Sent a reset e-mail to the specified address if it exists',
        data: undefined
    });
}

export const refresh = async (
    req: IAuthenticatedRequest<any, { refreshToken: string }>,
    res: Response<API$Types.response<Users>>
) => {
    if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

    // Deliberately NOT spreading parseTokensFromRequest(req) here — that
    // would carry the (expired) sessionToken through, and renewTokens()
    // only actually mints fresh tokens when sessionToken is exactly '';
    // otherwise it just echoes the same dead token back. sessionToken: ''
    // forces the "mint fresh from refreshToken" branch. Fixed 2026-09-08.
    const newTokens = renewTokens({
        recoveryToken: '',
        sessionToken: '',
        refreshToken: req.body.refreshToken
    });

    return res.json({
        success: true,
        message: 'User retrieved successfully',
        data: convertDecimals(req.user),
        tokens: newTokens
    });
};

export const setCredentials = async (
    req: IAuthenticatedRequest<any, authenticationCredentialsType>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        await prisma.credentials.create({
            data: {
                email: req.user.email,
                hash: encryptPassword(req.body.password)
            },
            select: {
                email: true,
                hash: true
            }
        });

        return res.status(200).json({
            data: undefined,
            message: 'Successfully set credentials',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const validateResetToken = async (
    req: IApplicationRequest<any, { token: string }>,
    res: Response<API$Types.response<Users>>
) => {
    try {
        const { userId, email } = jwt.verify(req.body.token, env.JWT_PASSWORD_RESET_SECRET!) as JWTPayloadType;

        return res.status(200).json({
            data: await prisma.users.findUnique({
                where: {
                    user_id: parseInt(userId),
                    email
                }
            }),
            message: 'Token is valid',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

const renewTokens = ({
    recoveryToken,
    refreshToken,
    sessionToken
}: tokenObjectType): tokenObjectType => {
    switch (true) {
        case (
            [
                refreshToken,
                sessionToken
            ].every(isEmpty)
        ):
            return {
                recoveryToken: '',
                refreshToken: '',
                sessionToken: ''
            };

        case (refreshToken !== '' && sessionToken === ''):
            const {
                email,
                role: user_role,
                userId: user_id
            } = jwt.verify(
                refreshToken as string,
                env.JWT_REFRESH_SECRET
            ) as JWTPayloadType;

            const payload = {
                email,
                user_id,
                user_role
            };

            return {
                recoveryToken: '',
                refreshToken: generateToken(payload, 'REFRESH'),
                sessionToken: generateToken(payload, 'SESSION')
            };

        default:
            return {
                recoveryToken,
                refreshToken,
                sessionToken
            };
    }
};