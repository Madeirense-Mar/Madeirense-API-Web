import {
    type Response
} from 'express';

import {
    type Device_Push_Tokens
} from '@Madeirense/database';

import {
    type API$Types
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import { prisma } from '../lib/prisma';

import type { IAuthenticatedRequest } from '../interfaces';

// ***************************************************************************************************************
//
// FCM device-token registration — added 2026-09-30 alongside the mobile
// push rollout. Deliberately separate from controllers/pushNotifications.ts
// (which is Web Push/VAPID-only): see the Device_Push_Tokens model's
// schema comment for why these can't share a table.
//
// ***************************************************************************************************************

export async function registerToken(
    req: IAuthenticatedRequest<any, { token: string, platform?: string }>,
    res: Response<API$Types.response<Device_Push_Tokens | undefined>>
) {
    try {
        const { token, platform } = req.body;
        const user_id = req.user!.user_id;

        // A device reinstalling the app, switching accounts, or Firebase
        // rotating the token all land here as "this token already
        // exists" — upsert onto the unique `fcm_token` column rather
        // than erroring, re-pointing it at whichever user is currently
        // authenticated.
        const subscription = await prisma.device_Push_Tokens.upsert({
            where: { fcm_token: token },
            update: { user_id, platform },
            create: { user_id, fcm_token: token, platform }
        });

        return res.status(201).json({
            data: subscription,
            message: 'Device registered for push notifications',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

export async function unregisterToken(
    req: IAuthenticatedRequest<{ token: string }>,
    res: Response<API$Types.response<undefined>>
) {
    try {
        const { token } = req.params;

        // Scoped to the caller's own tokens — deleteMany rather than
        // delete so an already-removed/unknown token 204s instead of
        // 404ing (matches unsubscribe's general tolerance for
        // already-gone push registrations in controllers/pushNotifications.ts).
        await prisma.device_Push_Tokens.deleteMany({
            where: {
                fcm_token: token,
                user_id: req.user!.user_id
            }
        });

        return res.status(204).json({
            data: undefined,
            message: 'Device unregistered',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}
