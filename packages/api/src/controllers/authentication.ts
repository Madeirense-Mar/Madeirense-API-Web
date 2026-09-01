import {
    type CookieOptions,
    type Request,
    type Response
} from 'express';

import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

import {
    type Users
} from '@Madeirense/database';

import {
    isEmpty,
    API$Enumerators,
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

import type {
    IAuthenticatedRequest
} from '../interfaces';


import type { JWTPayloadType } from '../types';

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
            ...tokens,
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
    req: IAuthenticatedRequest<tokenObjectType>,
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

export const setCredentials = async (
    req: IAuthenticatedRequest<authenticationCredentialsType>,
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

const renewTokens = ({
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
                refreshToken: generateToken(payload, 'REFRESH'),
                sessionToken: generateToken(payload, 'SESSION')
            };

        default:
            return {
                refreshToken,
                sessionToken
            };
    }
};