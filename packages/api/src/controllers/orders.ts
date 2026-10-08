import {
    type Response
} from 'express';

import { prisma } from '../lib/prisma';

import {
    $Enums,
    Prisma,
    type Courier_Positions,
    type Users
} from '@Madeirense/database';

import {
    DEFAULT_APP_SETTINGS,
    DEFAULT_API_LIST_LIMIT,
    calculateTravel,
    getLabel,
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type cartType,
    type chatEntryType,
    type restaurantOrderType,
    type restaurantOrderHistoryType,
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import {
    Prisma$Utilities
} from '../utilities/ORM';

import {
    clearCart$Dry,
    getCartSummary$Dry,
    getUserCart$Dry
} from './cart';

import type {
    IAuthenticatedRequest
} from '../interfaces';
import { convertDecimals } from 'utilities/converters';

// ***************************************************************************************************************

export const assignOrderToDriver = async (
    req: IAuthenticatedRequest<
        { id: string },
        {
            courier_id: number,
            notes: string,
            restaurant_id: number,
        }
    >,
    res: Response<API$Types.response<restaurantOrderType | undefined>>
) => {
    const executing_user_id = req.user!.user_id;

    const {
        courier_id,
        notes,
        restaurant_id
    } = req.body;

    const { id: _id } = req.params;

    const order_id = parseInt(_id as string, 10);

    let courier: Users | null = null;
    let updatedOrder: restaurantOrderType | null = null;
    let courier_Positions: Courier_Positions | null = null;

    try {
        courier = await prisma.users.findUnique({
            where: { user_id: courier_id, user_role: 'Driver' }
        });

        if (!courier) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Driver not found',
                success: false
            });
        }

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id }
        });

        if (!restaurant) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Restaurant not found',
                success: false
            });
        }

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

        if ((['cancelled', 'delivered'] as $Enums.Orders_status[]).includes(order.status as $Enums.Orders_status)) {
            return res.status(400).json({
                data: undefined,
                code: 'BAD_REQUEST',
                success: false,
                message: 'Order was finalized, cannot be assigned'
            });
        }

        [
            updatedOrder,
            courier_Positions
        ] = await prisma.$transaction(
            async $trx => {
                const _notes = `${(!notes || notes === '') ? '' : ` Notes: ${notes}`}`;

                await $trx.order_History.createMany({
                    data: [
                        {
                            order_id,
                            user_id: executing_user_id,
                            status: order.status as $Enums.Orders_status,
                            notes: `Pedido saiu de '${getLabel('ready')}' -> '${getLabel('assigned')}'.${_notes}`,
                        },
                        {
                            order_id,
                            user_id: executing_user_id,
                            status: order.status as $Enums.Orders_status,
                            notes: `A entrega do pedido foi associada à: ${courier?.name}`,
                        },
                    ]
                });

                const _updatedOrder = await $trx.orders.update({
                    where: { order_id },
                    data: {
                        courier_id,
                        updated_at: new Date(),
                        status: 'assigned'
                    },
                    include: Prisma$Utilities.Inclusions.Orders.Data,
                });

                const _courier_Positions = await $trx.courier_Positions.create({
                    data: {
                        courier_id,
                        latitude: _updatedOrder.Restaurants.Delivery_Locations?.latitude as Prisma.Decimal,
                        longitude: _updatedOrder.Restaurants.Delivery_Locations?.longitude as Prisma.Decimal,
                        recorded_at: new Date(),
                        speed_kph: calculateTravel(
                            {
                                latitude: parseFloat(`${_updatedOrder.Restaurants.Delivery_Locations?.latitude}`),
                                longitude: parseFloat(`${_updatedOrder.Restaurants.Delivery_Locations?.longitude}`),
                            },
                            {
                                latitude: parseFloat(`${_updatedOrder.Delivery_Locations?.latitude}`),
                                longitude: parseFloat(`${_updatedOrder.Delivery_Locations?.longitude}`),
                            }
                        ).speed
                    }
                })

                return [
                    _updatedOrder,
                    _courier_Positions
                ];
            },
            {
                timeout: 30000,
                isolationLevel: 'ReadCommitted'
            }
        );

        return res.status(200).json({
            data: updatedOrder,
            message: `${courier?.name} was successfully assigned to deliver order`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if ([
            updatedOrder,
            courier_Positions,
            courier
        ].includes(null)) return;

        req.events?.orders.emit(`order.courier_id.updated`, {
            ...(updatedOrder as restaurantOrderType),
            status: 'assigned',
            user_id: executing_user_id,
            Users_Orders_courier_idToUsers: {
                Courier_Positions: !courier_Positions ? null : [courier_Positions],
                ...(courier as Users),
            },
        });
    }
};

export const cancelOrder = async (
    req: IAuthenticatedRequest<
        { id: string },
        { notes: string }
    >,
    res: Response<API$Types.response<restaurantOrderType | undefined>>
) => {
    const { notes } = req.body;

    const { id: _id } = req.params;

    const user_id = req.user!.user_id;
    const user_role = req.user!.user_role;

    const id = parseInt(_id as string, 10);
    const who = user_role === 'Customer' ? 'cliente' : 'restaurante';

    let updatedOrder: restaurantOrderType | null = null;

    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id }
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        // BUG FIX (2026-09-30): was `'deliver'`, not `'delivered'` — the
        // Orders_status enum (schema.dev.prisma) has no `'deliver'` value,
        // so this guard against cancelling an already-delivered order was
        // dead code; `order.status` would never match it, and a delivered
        // order stayed cancellable regardless. Flagged from
        // client-mobile's order_detail_screen.dart while building it.
        if (['delivered', 'cancelled'].includes(order.status as $Enums.Orders_status)) {
            return res.status(400).json({
                data: undefined,
                code: 'BAD_REQUEST',
                message: 'Order cannot be cancelled',
                success: false
            });
        }

        const payment = await prisma.payments.findFirst({
            where: { order_id: id }
        });

        const payment_id = !payment ? undefined : payment.payment_id;

        updatedOrder = await prisma.$transaction(
            async $trx => {
                try {
                    await $trx.courier_Positions.deleteMany({
                        where: { courier_id: order.courier_id as number }
                    });

                    const _uo = $trx.orders.update({
                        where: { order_id: id },
                        data: {
                            status: 'cancelled',
                            courier_id: null,
                            updated_at: new Date(),
                            ...(payment_id && {
                                Payments: {
                                    update: {
                                        where: {
                                            payment_id,
                                            order_id: id
                                        },
                                        data: {
                                            status: 'refunded'
                                        }
                                    }
                                }
                            })
                        },
                        include: Prisma$Utilities.Inclusions.Orders.Data
                    });

                    // Create order history entry
                    await $trx.order_History.createMany({
                        data: [
                            {
                                order_id: id,
                                user_id,
                                status: order.status as $Enums.Order_History_status,
                                notes: `Pedido saiu de '${getLabel(order.status)}' -> '${getLabel($Enums.Orders_status.cancelled)}'.`
                            },
                            {
                                order_id: id,
                                user_id,
                                status: 'cancelled',
                                notes: `Pedido foi cancelado pelo ${who}, motivo: '${notes}'.`
                            },
                        ]
                    });

                    return _uo;
                } catch (error) {
                    console.error('Encountered an error while cancelling order:', error);

                    return null;
                }
            },
            {
                timeout: 30000,
                isolationLevel: 'ReadCommitted'
            }
        );

        return res.status(200).json({
            data: updatedOrder,
            message: 'Order cancelled successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!updatedOrder) return;

        req.events?.orders.emit(`order.status.updated`, { ...updatedOrder, status: 'cancelled' });
    }
};

export const createOrder = async (
    req: IAuthenticatedRequest<any, {
        restaurant_id: number,
        event_id?: number,
        delivery_address: number,
        contact_phone: string,
        payment_method: $Enums.Payments_payment_method,
        special_instructions: string,
        coupon_id?: number,
        cartType: cartType
    }>,
    res: Response<API$Types.response<restaurantOrderType | undefined>>
) => {
    const {
        restaurant_id,
        event_id,
        delivery_address,
        contact_phone,
        payment_method,
        special_instructions,
        coupon_id,
        cartType
    } = req.body;

    const user_id = req.user!.user_id;

    try {
        const restaurant = await prisma.restaurants.findUnique({ where: { restaurant_id } });

        if (!restaurant) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Restaurant not found',
            success: false
        });

        const restaurant_hours = await prisma.restaurant_Hours.findMany({ where: { restaurant_id } });

        if (restaurant_hours.length === 0) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Restaurant doesn\'t have a working schedule',
            success: false
        });

        const DAY_NAMES: ReadonlyArray<$Enums.Restaurant_Hours_day_of_week> = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        const currentSchedule = restaurant_hours.find(h => h.day_of_week === DAY_NAMES[now.getDay()]);

        const isOpen = (() => {
            if (!currentSchedule || currentSchedule.is_closed) return false;

            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const open = new Date(currentSchedule.opening_time);
            const close = new Date(currentSchedule.closing_time);
            const openMinutes = open.getHours() * 60 + open.getMinutes();
            const closeMinutes = close.getHours() * 60 + close.getMinutes();

            return closeMinutes > openMinutes
                ? nowMinutes >= openMinutes && nowMinutes < closeMinutes
                : nowMinutes >= openMinutes || nowMinutes < closeMinutes; // overnight window
        })();

        if (!isOpen) return res.status(500).json({
            data: undefined,
            code: 'API_GENERIC_ERROR',
            message: 'Restaurant is currently closed',
            success: false
        });

        const restaurant_event = !event_id ? null : await prisma.restaurant_Events.findUnique({ where: { event_id } });

        if (event_id && !restaurant_event) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Restaurant event not found',
            success: false
        });

        const coupon_code = !coupon_id ? undefined : (await prisma.coupons.findUnique({ where: { coupon_id } }))?.code ?? 'INVALID';

        if (coupon_code === 'INVALID') return res.status(400).json({
            data: undefined,
            code: 'BAD_REQUEST',
            success: false,
            message: 'The coupon code that was provided is invalid'
        });

        const cart_items = await getUserCart$Dry(user_id, cartType);

        const { totalPrice: total_amount } = await getCartSummary$Dry(user_id, cartType, coupon_code);

        // PRODUCT DECISION (2026-09-30): this used to also auto-create
        // Tickets_Purchased rows here for free events (total_amount === 0)
        // — see client-mobile/CLAUDE.md and controllers/restaurantEvent.ts's
        // purchaseTicket for the full reasoning. That bundled ticket
        // issuance into the general product cart/Orders flow, and only
        // worked for free events: a paid "ticket" bought through checkout
        // charged the customer but never became a verifiable entity
        // (Tickets_Purchased existed only as a side effect of an Order,
        // not as its own first-class purchase). Tickets are now bought
        // through their own endpoint (`POST /restaurant-events/:id/purchase`)
        // entirely independent of this one. `event_id` stays on Orders
        // itself — the cart/Orders flow is still the intended path for
        // (eventually) event merchandise, just never tickets.
        const order = await prisma.$transaction(
            async $trx => {
                try {
                    const { order_id } = await $trx.orders.create({
                        data: {
                            user_id,
                            restaurant_id,
                            event_id,
                            delivery_address,
                            contact_phone,
                            special_instructions,
                            total_amount,
                            status: 'pending',
                            ...(coupon_id && { coupon_id }),
                            Order_Items: {
                                create: cart_items.map(({ product_id, quantity }) => ({
                                    product_id, quantity
                                }))
                            },
                        }
                    });

                    await $trx.order_History.create({
                        data: {
                            order_id,
                            status: 'pending',
                            notes: 'Pedido foi criado',
                            user_id,
                        }
                    });

                    await $trx.payments.create({
                        data: {
                            order_id,
                            amount: parseFloat(`${total_amount}`),
                            status: total_amount === 0 ? 'completed' : 'pending',
                            user_id,
                            payment_method
                        }
                    });

                    return $trx.orders.findUnique({
                        where: { order_id },
                        include: Prisma$Utilities.Inclusions.Orders.Data
                    });
                } catch (error) {
                    throw new Error(`Unable to create order: ${(error as Error).message}`);
                }
            },
            {
                timeout: 50000,
                isolationLevel: 'ReadCommitted'
            }
        );

        await clearCart$Dry(user_id, cartType);

        if (coupon_code && order) req.events?.orders.emit('order.coupon_id.created', order);

        req.events?.orders.SILENT$emit('order.created');

        return res.status(201).json({
            data: convertDecimals(order),
            message: `Order created successfully`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const deleteOrder = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const order = await prisma.orders.findUnique({
            where: { order_id: id }
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        await prisma.orders.delete({
            where: { order_id: id }
        });

        req.events?.orders.SILENT$emit('order.deleted');

        return res.status(204).json({
            data: undefined,
            message: 'Order deleted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const reallocateDriver = async (
    req: IAuthenticatedRequest<
        { id: string },
        {
            courier_id: number,
            notes: string,
            restaurant_id: number,
        }
    >,
    res: Response<API$Types.response<restaurantOrderType | undefined>>
) => {
    const executing_user_id = req.user!.user_id;

    const { restaurant_id, courier_id, notes } = req.body;

    const { id: _id } = req.params;

    const order_id = parseInt(_id as string, 10);

    let courier: Users | null = null;
    let courier_Positions: Courier_Positions | null = null;
    let prev_courier_id = 0;
    let updatedOrder: restaurantOrderType | null = null;

    try {
        courier = await prisma.users.findUnique({
            where: { user_id: courier_id, user_role: 'Driver' }
        });

        if (!courier) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Driver not found',
                success: false
            });
        }

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id }
        });

        if (!restaurant) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Restaurant not found',
                success: false
            });
        }

        const order = await prisma.orders.findUnique({
            where: { order_id },
            include: {
                Users_Orders_courier_idToUsers: true
            }
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'assigned') {
            return res.status(400).json({
                data: undefined,
                code: 'BAD_REQUEST',
                message: 'If you want to assign an order use the correct method, the order must be assigned to a driver to be reallocated',
                success: false
            });
        }

        prev_courier_id = order.courier_id as number;

        [
            updatedOrder,
            courier_Positions
        ] = await prisma.$transaction(
            async $trx => {
                await $trx.order_History.createMany({
                    data: [
                        `Estafeta ${order.Users_Orders_courier_idToUsers?.name} removido da entrega do pedido`,
                        `A entrega do pedido foi associada à: ${courier?.name}`,
                        notes
                    ].map(note => ({
                        order_id,
                        user_id: executing_user_id,
                        status: order.status as $Enums.Orders_status,
                        notes: note
                    }))
                });

                const _updatedOrder = await $trx.orders.update({
                    where: { order_id },
                    data: { courier_id, updated_at: new Date() },
                    include: Prisma$Utilities.Inclusions.Orders.Data,
                });

                const cPositions = await $trx.courier_Positions.findFirst({ where: { courier_id: order.courier_id as number } });

                await $trx.courier_Positions.delete({ where: { position_id: cPositions?.position_id } });

                const _courier_Positions = await $trx.courier_Positions.create({
                    data: {
                        courier_id,
                        latitude: _updatedOrder.Restaurants.Delivery_Locations?.latitude as Prisma.Decimal,
                        longitude: _updatedOrder.Restaurants.Delivery_Locations?.longitude as Prisma.Decimal,
                        recorded_at: new Date(),
                        speed_kph: calculateTravel(
                            {
                                latitude: parseFloat(`${_updatedOrder.Restaurants.Delivery_Locations?.latitude}`),
                                longitude: parseFloat(`${_updatedOrder.Restaurants.Delivery_Locations?.longitude}`),
                            },
                            {
                                latitude: parseFloat(`${_updatedOrder.Delivery_Locations?.latitude}`),
                                longitude: parseFloat(`${_updatedOrder.Delivery_Locations?.longitude}`),
                            }
                        ).speed
                    }
                });

                return [
                    _updatedOrder,
                    _courier_Positions
                ];
            },
            {
                timeout: 30000,
                isolationLevel: 'ReadCommitted'
            }
        );

        return res.status(201).json({
            success: true,
            message: `Courier ${order.Users_Orders_courier_idToUsers?.name} was removed from order delivery, ${courier?.name} was successfully assigned instead.`,
            data: updatedOrder
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if ([updatedOrder, courier_Positions, courier].includes(null)) return;

        req.events?.orders.emit(`order.courier_id.updated`, {
            ...(updatedOrder as restaurantOrderType),
            courier_id,
            order_id,
            prev_courier_id,
            user_id: executing_user_id,
            status: 'assigned',
            Users_Orders_courier_idToUsers: {
                Courier_Positions: !courier_Positions ? null : [courier_Positions],
                ...(courier as Users),
            },
        });
    }
};

export const getMyOrders = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<restaurantOrderType[] | undefined>>
) => {
    try {
        const user_id = req.user!.user_id;

        const type = req.query[Madeirense$Enumerators.SearchQueries.type] as ('delivery' | 'ticket') ?? undefined;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where: Prisma.OrdersWhereInput = {
            status: req.query.status_type as $Enums.Orders_status || undefined,
            user_id,
            ...(type === 'delivery' && { NOT: { Order_Items: { some: { Products: { product_type: { in: ['ticket'] } } } } } }),
            ...(type === 'ticket' && { AND: [{ Order_Items: { some: { Products: { product_type: { in: ['ticket'] } } } } }] })
        };

        const [orders, total] = await Promise.all([
            prisma.orders.findMany({
                where,
                skip,
                take: limit,
                include: Prisma$Utilities.Inclusions.Orders.Data,
                orderBy: { created_at: 'desc' }
            }),
            prisma.orders.count({
                where: { user_id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: convertDecimals(orders),
            message: 'User orders retrieved successfully',
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

export const getAllOrders = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<restaurantOrderType[] | undefined>>
) => {
    try {
        const type = req.query[Madeirense$Enumerators.SearchQueries.type] as ('delivery' | 'ticket') ?? undefined;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const _statuses = req.query[Madeirense$Enumerators.SearchQueries.statuses]
        const statuses = (!_statuses
            ? []
            : Array.isArray(_statuses)
                ? ([...(_statuses || [])])
                : [_statuses]
        ) as $Enums.Orders_status[];

        const whereClause: Prisma.OrdersWhereInput = {
            courier_id: !req.query.courier_id ? undefined : parseInt(req.query.courier_id as string),
            status: (statuses.length > 0)
                ? { in: statuses }
                : req.query.status_type as $Enums.Orders_status || undefined,
            ...(type === 'delivery' ? { NOT: { Order_Items: { some: { Products: { product_type: { in: ['ticket'] } } } } } } : {}),
            ...(type === 'ticket' ? { AND: [{ Order_Items: { some: { Products: { product_type: { in: ['ticket'] } } } } }] } : {})
        };

        const [orders, total] = await Promise.all([
            prisma.orders.findMany({
                where: whereClause,
                skip,
                take: limit,
                include: Prisma$Utilities.Inclusions.Orders.Data,
                orderBy: { created_at: 'desc' }
            }),
            prisma.orders.count({
                where: whereClause
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: convertDecimals(orders),
            message: 'Orders retrieved successfully',
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

export const getOrderById = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<restaurantOrderType | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const user_id = req.user!.user_id;
        const user_role = req.user!.user_role;

        const id = parseInt(_id as string, 10);

        const order = await prisma.orders.findUnique({
            where: { order_id: id },
            include: Prisma$Utilities.Inclusions.Orders.Data
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        if (user_role === 'Customer' && order.user_id !== user_id) {
            return res.status(403).json({
                data: undefined,
                code: 'FORBIDDEN',
                success: false,
                message: 'Access denied'
            });
        }

        return res.json({
            success: true,
            message: 'Order retrieved successfully',
            data: convertDecimals(order)
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getOrderChatMessages = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<chatEntryType[] | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const order_id = parseInt(_id as string, 10);

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

        const chatMessages = await prisma.chat_Messages.findMany({
            where: { order_id },
            skip,
            take: limit,
            include: {
                Users: {
                    select: {
                        user_id: true,
                        email: true,
                        name: true,
                        user_role: true,
                        phone: true,
                        profile_photo: true
                    }
                }
            },
            orderBy: { sent_at: 'asc' }
        });

        return res.json({
            success: true,
            message: 'Order chat messages retrieved successfully',
            data: chatMessages
        });

    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getOrderHistory = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<restaurantOrderHistoryType[] | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const order = await prisma.orders.findUnique({
            where: { order_id: id },
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        return res.json({
            data: await prisma.order_History.findMany({
                where: { order_id: id },
                include: {
                    Users: {
                        select: {
                            user_id: true,
                            email: true,
                            name: true,
                            user_role: true
                        }
                    }
                },
                orderBy: { created_at: 'asc' }
            }),
            message: 'Order history retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const postChatMessages = async (
    req: IAuthenticatedRequest<any, {
        message_text: string,
        order_id: number
    }>,
    res: Response<API$Types.response<chatEntryType | undefined>>
) => {
    const {
        message_text,
        order_id
    } = req.body;

    const user_role = req.user!.user_role;
    const user_name = req.user!.name;
    const user_id = parseInt(`${req.user!.user_id ?? '0'}`) as number;

    let chat_message: chatEntryType | null = null;

    try {
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

        chat_message = await prisma.$transaction(async $trx => {
            try {
                const _chat_message = await $trx.chat_Messages.create({
                    data: {
                        restaurant_id: order.restaurant_id,
                        message_text,
                        sender_id: user_id,
                        order_id: order.order_id,
                        sender_type: user_id === order.user_id ? 'user' : 'restaurant',
                        sent_at: new Date()
                    }, include: {
                        Orders: {
                            select: {
                                user_id: true,
                            }
                        },
                        Users: {
                            select: {
                                user_id: true,
                                email: true,
                                name: true,
                                user_role: true,
                                phone: true,
                                profile_photo: true
                            }
                        }
                    },
                });

                await $trx.order_History.create({
                    data: {
                        order_id: order.order_id,
                        user_id,
                        status: order.status as $Enums.Order_History_status,
                        notes: `${user_name} (${getLabel(user_role)}) enviou mensagem no chat: '${_chat_message.message_text}'`
                    },

                });

                return _chat_message;
            } catch (error) {
                throw new Error(`Unable to post chat message: ${(error as Error).message}`);
            }
        });

        return res.status(201).json({
            data: chat_message,
            message: 'Message posted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!chat_message) return;

        req.events?.chat_messages.emit(`chat_messages.created`, chat_message);
    }
};

export const updateOrderStatus = async (
    req: IAuthenticatedRequest<
        { id: string },
        {
            notes?: string,
            status: $Enums.Orders_status
        }
    >,
    res: Response<API$Types.response<any | undefined>>
) => {
    const { status, notes } = req.body;

    const { id: _id } = req.params;

    const user_id = req.user!.user_id;

    const id = parseInt(_id as string, 10);

    let updatedOrder: (restaurantOrderType | null) = null;

    try {
        const order = await prisma.orders.findUnique({
            where: { order_id: id }
        });

        if (!order) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Order not found',
                success: false
            });
        }

        const payment = await prisma.payments.findFirst({
            where: { order_id: id }
        });

        if (!payment) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Payment record not found',
                success: false
            });
        }

        updatedOrder = await prisma.$transaction(
            async $trx => {
                try {
                    const { auto_assign_driver } = await $trx.global_Settings.findFirst() ?? DEFAULT_APP_SETTINGS;

                    // Create order history entry
                    await $trx.order_History.createMany({
                        data: [
                            {
                                order_id: id,
                                user_id,
                                status,
                                notes: (() => {
                                    const _notes = `${(!notes || notes === '') ? '' : ` Nota: ${notes}`}`;

                                    switch (status) {
                                        case 'pending': return `Pedido em espera.${_notes}`;
                                        case 'confirmed': return `Pedido saiu de '${getLabel('pending')}' -> '${getLabel('confirmed')}'.${_notes}`;
                                        case 'preparing': return `Pedido saiu de '${getLabel('confirmed')}' -> '${getLabel('preparing')}'.${_notes}`;
                                        case 'ready': return `Pedido saiu de '${getLabel('preparing')}' -> '${getLabel('ready')}'.${_notes}`;

                                        default: throw new Error('Unknown or prohibited Order status');
                                    }
                                })(),
                            },
                            (auto_assign_driver && (status === 'ready')) ? {
                                order_id: id,
                                user_id,
                                status,
                                notes: `(Automático) À pesquisar por estafetas disponíveris`
                            } : null
                        ].filter(v => v !== null)
                    });

                    return await $trx.orders.update({
                        where: { order_id: id },
                        data: { status, updated_at: new Date() },
                        include: Prisma$Utilities.Inclusions.Orders.Data
                    });
                } catch (error) {
                    throw new Error(`Unable to update order status: ${(error as Error).message}`);
                }
            },
            {
                timeout: 30000,
                isolationLevel: 'ReadCommitted'
            }
        );

        return res.json({
            success: true,
            message: 'Order status updated successfully',
            data: updatedOrder
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!updatedOrder) return;

        req.events?.orders.emit(`order.status.updated`, updatedOrder);
    }
};