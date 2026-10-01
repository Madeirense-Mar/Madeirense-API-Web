import {
    Router,
    type CookieOptions,
    type Response
} from 'express';

import {
    body
} from 'express-validator';

import {
    Madeirense$Enumerators,
    RANGES,
} from '@Madeirense/shared';

import {
    API_MAX_TIME_REFRESH_TOKEN,
    API_MAX_TIME_SESSION_TOKEN
} from '../utilities/constants.js';

import { generateToken } from '../utilities/generators.js';

import env from '../env.js';

import * as controller from '../controllers/authentication.js';

import { validateJWT } from '../middlewares/authorization.js';

import passport from '../middlewares/passport.js';

import {
    Validate
} from '../middlewares/validation.js';

import {
    DEFAULT_COOKIES_OPTIONS
} from 'controllers/utilities/constants.js';

import type {
    IAuthenticatedRequest
} from '../interfaces.js';

// ***************************************************************************************************************

const frontendUrl = env.FRONTEND_URL;

const failureRedirect = `${frontendUrl}${Madeirense$Enumerators.Pages.App.Welcome}?type=login`;

function thirdPartyAuthenticationCallback(req: IAuthenticatedRequest, res: Response) {
    res.cookie('sessionToken', generateToken(req.user, "SESSION"), DEFAULT_COOKIES_OPTIONS);
    res.cookie('refreshToken', generateToken(req.user, "REFRESH"), {
        ...DEFAULT_COOKIES_OPTIONS,
        maxAge: API_MAX_TIME_REFRESH_TOKEN
    });

    res.redirect(`${frontendUrl}/auth/success`);
};

const v1 = Router();

v1.get(
    '/google',
    passport.authenticate('google', {
        scope: [
            'email',
            'profile',
        ]
    })
);

v1.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect }),
    thirdPartyAuthenticationCallback as any
);

v1.get(
    '/facebook',
    passport.authenticate('facebook', {
        scope: [
            'email'
        ]
    })
);

v1.get(
    '/facebook/callback',
    passport.authenticate('facebook', { failureRedirect }),
    thirdPartyAuthenticationCallback as any
);

v1.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage(`We can't log you in without a password, please be serious.`),
        Validate.Handle.error
    ],
    controller.login
);

v1.post(
    '/logout',
    controller.logout as any
);

v1.get(
    '/me',
    passport.authenticate('jwt', { session: false }),
    controller.me as any
);

v1.use(validateJWT as any);

v1.get(
    '/has-credentials',
    controller.hasCredentials as any
);

v1.post(
    '/set-credentials',
    [
        body('password').notEmpty().isStrongPassword({
            minLength: RANGES["password-length"].min,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage(`Password length must be at least ${RANGES["password-length"].min}, must contain at least: 1 number and 1 special character`),
        Validate.Handle.error
    ],
    controller.setCredentials as any
);

v1.post(
    '/who-am-i',
    controller.who as any
);

v1.post(
    '/refresh',
    [
        // Was `token` here but the controller reads `req.body.refreshToken`
        // — mismatched field name meant this could never pass validation
        // with the field the controller actually needed. Fixed 2026-09-08.
        body('refreshToken').isJWT().withMessage('Valid refresh token is required'),
        Validate.Handle.error
    ],
    controller.refresh as any
);

const authenticationRoutes = {
    v1
};

export default authenticationRoutes;