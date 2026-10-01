import { 
    type Request, 
    type Response

} from 'express';

import webPush from 'web-push';

import env from '../env';

import { sendToDeviceToken } from '../firebase/admin';

import { 
    type Push_Notification_Subscriptions
} from '@Madeirense/database';

import { 
    RESTAURANT_USER_ROLES,
    type API$Types, 
    type Madeirense$Types
} from '@Madeirense/shared';

import { 
    handleControllerError
} from './utilities/handlers';

import { prisma } from '../lib/prisma';

import type { 
    PushSubscription, 
    WebPushError
} from 'web-push';

import type { IAuthenticatedRequest } from '../interfaces';

// ***************************************************************************************************************

async function $delete(subscription_id: number) {
    try {
        const subscription = await prisma.push_Notification_Subscriptions.delete({
            where: { subscription_id }
        });

        return subscription !== null;
    } catch (error) {
        console.error('Unable to delete subscription: ', error);

        return false;
    }
};

export async function push<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(user_id: number, payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    let subscription = await prisma.push_Notification_Subscriptions.findFirst({
        where: {
            user_id
        }
    });

    if (!subscription) {
        console.error('User doesn\'t have a subscription');

        return null;
    };

    webPush.setVapidDetails(
        `mailto:${env.SERVER_PUSH_SUBJECT as string}`,
        env.CLIENT_VAPID_PUBLIC_KEY as string,
        env.CLIENT_VAPID_PRIVATE_KEY as string
    );

    const {
        target_endpoint: endpoint,
        expiration_time: expirationTime,
        auth = '',
        p256dh = ''
    } = subscription;

    try {
        const STRINGIFIED$payload = JSON.stringify({
            ...payload,
            data: {
                ...payload.data,
                user_id
            }
        });

        const result = await webPush.sendNotification(
            {
                endpoint,
                expirationTime,
                keys: {
                    auth: auth || '',
                    p256dh: p256dh || ''
                }
            },
            STRINGIFIED$payload
        );

        return result;
    } catch (error) {
        await $delete(subscription.subscription_id);

        return null;
    }
};

/**
 * FCM counterpart to `push` above — fans a notification out to every
 * device (not just one) a user has registered via
 * controllers/devicePushTokens.ts, since (unlike a browser, which this
 * codebase only ever keeps one subscription for at a time — see
 * `subscribe`'s create call below) a user can have several phones/app
 * installs live at once. Added 2026-09-30 for mobile push.
 */
export async function pushToUserDevices<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(user_id: number, payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    const tokens = await prisma.device_Push_Tokens.findMany({
        where: { user_id }
    });

    if (tokens.length === 0) return [];

    const STRINGIFIED$payload = {
        ...payload,
        data: {
            ...payload.data,
            user_id
        }
    };

    return Promise.all(tokens.map(async ({ token_id, fcm_token }) => {
        const result = await sendToDeviceToken(fcm_token, STRINGIFIED$payload);

        if (result.tokenInvalid) {
            await prisma.device_Push_Tokens.delete({ where: { token_id } }).catch(() => {});
        }

        return result;
    }));
};

/**
 * Unified send: fans a notification out across every channel a user
 * has — web push subscription and/or FCM device tokens — swallowing
 * per-channel failures rather than letting one dead channel block the
 * other. This is what the rest of the app (e.g. the EMIS payment flow
 * in controllers/payment.ts) should call instead of reaching for `push`
 * or `pushToUserDevices` directly. Added 2026-09-30.
 */
export async function notifyUser<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(user_id: number, payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    const [webResult, deviceResults] = await Promise.all([
        push(user_id, payload).catch(() => null),
        pushToUserDevices(user_id, payload).catch(() => [])
    ]);

    return { webResult, deviceResults };
};

export async function subscribe(
    req: IAuthenticatedRequest<any, PushSubscription>, 
    res: Response<API$Types.response<Push_Notification_Subscriptions | undefined>>
) {
    const subscriptionPayload = req.body;

    try {
        const subscription = await prisma.push_Notification_Subscriptions.create({
            data: {
                user_id: req.user!.user_id,
                expiration_time: subscriptionPayload.expirationTime ?? 0,
                target_endpoint: subscriptionPayload.endpoint,
                auth: subscriptionPayload.keys.auth,
                p256dh: subscriptionPayload.keys.p256dh,
            }
        });

        return res.status(201).json({
            data: subscription,
            message: 'Target subscribed successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function unsubscribe(
    req: IAuthenticatedRequest, 
    res: Response<API$Types.response<{ unsubscribeFromBrowser: boolean } | undefined>>
) {
    const subscription_id = parseInt(req.params.id as string) as number;

    try {
        const usersSubscription = await prisma.push_Notification_Subscriptions.findFirst({
            where: { subscription_id }
        });

        await prisma.push_Notification_Subscriptions.delete({
            where: { subscription_id }
        });

        const remainingSubscriptions = await prisma.push_Notification_Subscriptions.count({
            where: {
                target_endpoint: usersSubscription?.target_endpoint
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Target unsubscribed successfully',
            data: {
                unsubscribeFromBrowser: (remainingSubscriptions > 0)
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function unsubscribeAll(
    req: Request<{ id: string }>, 
    res: Response<API$Types.response<undefined>>
) {
    const user_id = parseInt(req.params.id) as number;

    try {
        await prisma.push_Notification_Subscriptions.deleteMany({
            where: { user_id }
        });

        return res.status(200).json({
            data: undefined,
            message: 'Target subscriptions removed successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function API$push(
    req: IAuthenticatedRequest, 
    res: Response<API$Types.response<undefined>>
) {
    const {
        user_id,
        payload
    } = req.body;

    try {
        await push(
            user_id,
            payload as Madeirense$Types.pushNotification<any>
        );

        return res.status(204).json({
            data: undefined,
            message: 'Notification pushed successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

export async function API$BATCH$push(
    req: IAuthenticatedRequest<any, {
        user_ids: number[],
        payload: Madeirense$Types.pushNotification<any>
    }>, 
    res: Response<API$Types.response<undefined>>
) {
    const {
        user_ids,
        payload
    } = req.body;

    try {
        await BATCH$push(
            user_ids,
            payload
        );

        return res.status(204).json({
            data: undefined,
            message: 'Notification push successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

export async function BATCH$push<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(user_ids: number[], payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    let subscriptions = await prisma.push_Notification_Subscriptions.findMany({
        where: {
            user_id: { in: user_ids }
        }
    });

    if (!subscriptions) {
        console.error('Users doesn\'t have a subscription');

        return [];
    };

    webPush.setVapidDetails(
        `mailto:${env.SERVER_PUSH_SUBJECT as string}`,
        env.CLIENT_VAPID_PUBLIC_KEY as string,
        env.CLIENT_VAPID_PRIVATE_KEY as string
    );

    const results = await Promise.all(subscriptions.map(async subscription => {
        const {
            target_endpoint: endpoint,
            expiration_time: expirationTime,
            auth = '',
            p256dh = '',
            subscription_id,
            user_id
        } = subscription;

        try {
            const STRINGIFIED$payload = JSON.stringify({
                ...payload,
                data: {
                    ...payload.data,
                    user_id
                }
            });

            const result = await webPush.sendNotification(
                {
                    endpoint,
                    expirationTime,
                    keys: {
                        auth: auth || '',
                        p256dh: p256dh || ''
                    }
                },
                STRINGIFIED$payload
            );

            return result;
        } catch (error) {
            switch ((error as WebPushError).statusCode) {
                case 404:
                case 410:
                    console.log(`Subscription expired/invalid, removing ${subscription_id} from database`);

                    await $delete(subscription_id);

                    break;

                default:
                    console.error('Push notification error:', error);

                    break;
            }

            return error;
        }
    }));

    return results;
};

export async function BATCH$pushAll<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    let subscriptions = await prisma.push_Notification_Subscriptions.findMany();

    if (!subscriptions) {
        console.error('Users doesn\'t have a subscription');

        return [];
    };

    return BATCH$push(
        subscriptions
            .filter(({ user_id }, idx) => idx === subscriptions.findIndex(s => s.user_id === user_id))
            .map(({ user_id }) => user_id),
        payload
    );
};

export async function BATCH$pushToStaff<Payload, ExtendedTypes extends (string) = 'HELLO_WORLD'>(payload: Madeirense$Types.pushNotification<Payload, ExtendedTypes>) {
    const roles = [...RESTAURANT_USER_ROLES];

    let subscriptions = await prisma.push_Notification_Subscriptions.findMany({
        where: {
            Users: {
                user_role: {
                    in: roles
                }
            }
        }
    });

    if (!subscriptions) {
        console.error('Staff users don\'t have a subscriptions');

        return [];
    };

    return BATCH$push(
        subscriptions
            .filter(({ user_id }, idx) => idx === subscriptions.findIndex(s => s.user_id === user_id))
            .map(({ user_id }) => user_id),
        payload
    );
};