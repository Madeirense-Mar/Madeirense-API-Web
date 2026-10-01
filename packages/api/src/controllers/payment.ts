import { 
    type Request, 
    type Response
} from 'express';

import { 
    $Enums
} from '@Madeirense/database';

import { 
    DEFAULT_API_LIST_LIMIT, 
    APIError,
    API$Enumerators,
    type API$Types, 
    type orderPaymentType,
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import { prisma } from '../lib/prisma';

import * as emis from '../services/emis';

import { notifyUser } from './pushNotifications';

import type { IAuthenticatedRequest } from '../interfaces';

// ***************************************************************************************************************

export const createPayment$Dry = async ({
    order_id,
    amount,
    payment_method,
    user_id,
    status="pending"
}: {
    order_id: number,
    amount: number | string,
    payment_method: $Enums.Payments_payment_method,
    user_id: number,
    status?: $Enums.Payments_status
}) => {
    const order = await prisma.orders.findUnique({
        where: { order_id }
    });

    if (!order) throw new APIError({
        code: 'API_GENERIC_NOT_FOUND_ERROR',
        message: 'Order not found',
        status: 404
    });

    if (order.user_id !== user_id) throw new APIError({
        code: 'FORBIDDEN',
        message: 'Access denied',
        status: 403
    });

    const payment = await prisma.payments.create({
        data: {
            order_id,
            user_id,
            amount: parseFloat(`${amount}`),
            payment_method,
            status
        }
    });

    return payment;
};

export const createPayment = async (
    req: IAuthenticatedRequest, 
    res: Response<API$Types.response<orderPaymentType | undefined>>
) => {
    try {
        const { order_id, amount, payment_method } = req.body;
        const user_id = req.user!.user_id;

        const order = await prisma.orders.findUnique({
            where: { order_id }
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        if (order.user_id !== user_id) {
            return res.status(403).json({
                data: undefined,
                code: 'FORBIDDEN',
                message: 'Access denied',
                success: false
            });
        }

        const payment = await prisma.payments.create({
            data: {
                order_id,
                user_id,
                amount: parseFloat(amount),
                payment_method,
                status: 'pending'
            },
            include: {
                Orders: {
                    select: {
                        order_id: true,
                        total_amount: true,
                        status: true
                    }
                }
            }
        });

        // EMIS gateway kickoff (2026-09-30, Robbie's described flow: we
        // send EMIS a payment request, the user gets a push notification
        // prompting them to complete it on EMIS's side, and EMIS calls
        // our /v1/emis/callback once it's resolved — see services/emis.ts
        // and emisPaymentCallback below).
        //
        // Deliberately best-effort: EMIS isn't configured yet anywhere
        // (services/emis.ts#initiatePayment currently always throws —
        // see TODO.md), and even once it is, a gateway hiccup here
        // shouldn't fail payment creation — the Payments row already
        // exists as `pending` and can be retried/confirmed manually
        // (PATCH /v1/payments/:id/status) either way.
        try {
            const { gatewayReference } = await emis.initiatePayment({
                paymentId: payment.payment_id,
                amount: parseFloat(amount)
            });

            await prisma.payments.update({
                where: { payment_id: payment.payment_id },
                data: { gateway_reference: gatewayReference }
            });

            await notifyUser<{ payment_id: number, order_id: number }, 'PAYMENT_REQUESTED'>(user_id, {
                notificationId: 'MXP$PAYMENT_REQUESTED',
                data: {
                    payment_id: payment.payment_id,
                    order_id
                }
            });
        } catch (gatewayError) {
            console.error('EMIS payment initiation failed (payment stays pending):', gatewayError);
        }

        return res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: payment
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getUserPayments = async (
    req: IAuthenticatedRequest, 
    res: Response<API$Types.response<orderPaymentType[] | undefined>>
) => {
    try {
        const user_id = req.user!.user_id;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.payments.findMany({
                where: { user_id },
                skip,
                take: limit,
                include: {
                    Orders: {
                        select: {
                            order_id: true,
                            total_amount: true,
                            status: true,
                            Restaurants: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            prisma.payments.count({
                where: { user_id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: payments,
            message: 'User payments retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getAllPayments = async (req: Request, res: Response<API$Types.response<orderPaymentType[] | undefined>>) => {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.payments.findMany({
                skip,
                take: limit,
                include: {
                    Users: {
                        select: {
                            user_id: true,
                            name: true,
                            email: true
                        }
                    },
                    Orders: {
                        select: {
                            order_id: true,
                            total_amount: true,
                            status: true,
                            Restaurants: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            prisma.payments.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: payments,
            message: 'Payments retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getPaymentById = async (
    req: IAuthenticatedRequest<{ id: string }>, 
    res: Response<API$Types.response<orderPaymentType | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const user_id = req.user!.user_id;
        const user_role = req.user!.user_role;

        const id = parseInt(_id as string, 10);

        const payment = await prisma.payments.findUnique({
            where: { payment_id: id },
            include: {
                Users: {
                    select: {
                        user_id: true,
                        name: true,
                        email: true
                    }
                },
                Orders: {
                    select: {
                        order_id: true,
                        total_amount: true,
                        status: true,
                        Restaurants: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                success: false,
                message: 'Payment not found'
            });
        }

        if (user_role === 'Customer' && payment.user_id !== user_id) {
            return res.status(403).json({
                data: undefined,
                code: 'FORBIDDEN',
                success: false,
                message: 'Access denied'
            });
        }

        return res.json({
            success: true,
            message: 'Payment retrieved successfully',
            data: payment
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const updatePaymentStatus = async (
    req: Request<
        { id: string },
        {
            status: $Enums.Payments_status
        }
    >, 
    res: Response<API$Types.response<orderPaymentType | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const { status } = req.body;

        const id = parseInt(_id as string, 10);

        const payment = await prisma.payments.findUnique({
            where: { payment_id: id }
        });

        if (!payment) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Payment not found',
                success: false
            });
        }

        const updatedPayment = await prisma.payments.update({
            where: { payment_id: id },
            data: { status },
            include: {
                Users: {
                    select: {
                        user_id: true,
                        name: true,
                        email: true
                    }
                },
                Orders: {
                    select: {
                        order_id: true,
                        total_amount: true,
                        status: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: updatedPayment
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const deletePayment = async (
    req: Request<{ id: string }>, 
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const payment = await prisma.payments.findUnique({
            where: { payment_id: id }
        });

        if (!payment) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Payment not found',
                success: false
            });
        }

        await prisma.payments.delete({
            where: { payment_id: id }
        });

        return res.status(204).json({
            data: undefined,
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

/**
 * `POST /v1/emis/callback` (routes/emis.ts) — the far end of the flow
 * `createPayment` above kicks off. EMIS calls this once a payment it's
 * processing resolves; no user JWT is (or can be) presented, since this
 * is a server-to-server call from EMIS itself — routes/emis.ts guards it
 * with `emis.verifyCallbackSecret` instead of `validateJWT`.
 *
 * UNVERIFIED end-to-end: `emis.parseCallbackPayload`'s field names and
 * `verifyCallbackSecret`'s whole verification scheme are placeholders
 * (see services/emis.ts's header comment) — this function is otherwise
 * complete and real (payment lookup by gateway_reference, status
 * update, user notification), so only the parsing/verification at the
 * boundary needs to change once real EMIS docs are in hand, not this
 * function's shape. Added 2026-09-30.
 */
export const emisPaymentCallback = async (
    req: Request,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const parsed = emis.parseCallbackPayload(req.body);

        if (!parsed) {
            return res.status(400).json({
                data: undefined,
                code: 'API_GENERIC_VALIDATION_ERROR',
                message: 'Unrecognized EMIS callback payload',
                success: false
            });
        }

        const payment = await prisma.payments.findFirst({
            where: { gateway_reference: parsed.gatewayReference }
        });

        if (!payment) {
            // Acknowledge with 200 regardless — returning an error here
            // would likely make EMIS retry a callback we can never
            // resolve (there's no Payments row with this reference,
            // retrying changes nothing), which is worse than just
            // logging it once.
            console.error('EMIS callback for unknown gateway_reference:', parsed.gatewayReference);

            return res.status(200).json({
                data: undefined,
                message: 'Acknowledged (no matching payment)',
                success: true
            });
        }

        const updatedPayment = await prisma.payments.update({
            where: { payment_id: payment.payment_id },
            data: { status: parsed.status }
        });

        await notifyUser<{ payment_id: number, order_id: number }, 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED'>(
            updatedPayment.user_id,
            {
                notificationId: (parsed.status === 'completed') ? 'MXP$PAYMENT_COMPLETED' : 'MXP$PAYMENT_FAILED',
                data: {
                    payment_id: updatedPayment.payment_id,
                    order_id: updatedPayment.order_id
                }
            }
        ).catch(notifyError => console.error('Post-EMIS-callback notification failed:', notifyError));

        return res.status(200).json({
            data: undefined,
            message: 'Payment status updated from EMIS callback',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};
