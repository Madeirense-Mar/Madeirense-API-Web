import {
    type Request,
    type Response
} from 'express';

import { 
    type Restaurant_Events
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    API$Enumerators,
    Madeirense$Enumerators,
    toDateISO,
    type API$Types,
    type restaurantEventType,
    type boughtTicketType,
    type myTicketType,
} from '@Madeirense/shared';

import {
    Messages
} from './utilities/enumerators';

import {
    handleControllerError
} from './utilities/handlers';

import {
    generateTicketToken,
    verifyTicketToken
} from '../utilities/generators';

import {
    convertDecimals
} from '../utilities/converters';

import { prisma } from '../lib/prisma';

import type { IEventfulRequest } from '../middlewares/events';
import type { IAuthenticatedRequest } from '../interfaces';

// ***************************************************************************************************************

type timeType = `${number}:${number}`;

export async function cancelRestaurantEvent(
    req: IEventfulRequest<{ id: string }>,
    res: Response<API$Types.response<restaurantEventType | undefined>>
) {
    const { id: _id } = req.params;

    const event_id = parseInt(_id as string, 10);

    let event: restaurantEventType | null = null;

    try {
        const [Restaurant_Events, Orders, Payments] = await prisma.$transaction(async $trx => {
            const restaurant_event = await $trx.restaurant_Events.update({
                where: { event_id },
                data: {
                    status: "cancelled"
                }
            });

            if (!restaurant_event) throw new Error("Restaurant event not found");

            const ordersBatch = await $trx.orders.updateMany({
                where: { event_id },
                data: {
                    status: "cancelled"
                }
            });

            const paymentsBatch = await $trx.payments.updateMany({
                where: {
                    Orders: { event_id }
                },
                data: {
                    status: "refunded"
                }
            });

            //TODO: Implement client wallet logic

            return [
                restaurant_event,
                ordersBatch.count,
                paymentsBatch.count
            ];
        });

        event = { ...Restaurant_Events };

        return res.status(201).json({
            data: {
                ...Restaurant_Events,
                _count: {
                    Orders,
                    Payments
                }
            },
            message: 'Restaurant event cancelled successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!event) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurant_events.emit("restaurant_event.updated", event);
    }
};

export async function createRestaurantEvent(
    req: IEventfulRequest<
        any,
        {
            restaurant_id: number,
            name: string,
            description: string,
            event_date: Date,
            start_time: timeType,
            end_time: timeType,
            price?: number,
            thumbnail_url?: string,
            spots?: number,
            video_url: string
        }
    >,
    res: Response<API$Types.response<any | undefined>>
) {
    const {
        restaurant_id,
        name,
        description,
        event_date: ed,
        start_time: st,
        end_time: et,
        price = undefined,
        thumbnail_url,
        spots = undefined,
        video_url
    } = req.body;

    let event: restaurantEventType | null = null;

    try {
        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        const event_date = new Date(ed);

        event = await prisma.restaurant_Events.create({
            data: {
                price: price ?? 0,
                spots: spots ?? null,
                restaurant_id,
                name,
                description,
                event_date,
                start_time: toDateISO(event_date, st),
                end_time: toDateISO(event_date, et),
                thumbnail_url,
                status: "upcoming",
                video_url,
                Products: {
                    create: {
                        name: `"${name}" Bilhete`,
                        description,
                        price: price ?? 0,
                        discount: 0,
                        product_type: 'ticket',
                        restaurant_id,
                        thumbnail: thumbnail_url,
                        prep_time_minutes: 0
                    }
                }
            },
            include: {
                Restaurants: {
                    select: {
                        restaurant_id: true,
                        name: true,
                        location: true
                    }
                },
                Products: true,
                _count: {
                    select: {
                        Products: true,
                        Tickets_Purchased: true
                    }
                }
            }
        });

        return res.status(201).json({
            data: event,
            message: 'Restaurant event created successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!event) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurant_events.emit("restaurant_event.created", event);
    }
};

export async function deleteRestaurantEvent(
    req: IEventfulRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) {
    const { id: _id } = req.params;

    const id = parseInt(_id as string, 10);

    let event: restaurantEventType | null = null;

    try {
        event = await prisma.restaurant_Events.findUnique({
            where: { event_id: id }
        });

        if (!event) {
            return res.status(404).json({
                data: undefined,
                message: 'Restaurant event not found',
                success: false
            });
        }

        await prisma.restaurant_Events.delete({
            where: { event_id: id }
        });

        return res.status(200).json({
            data: undefined,
            message: 'Restaurant event deleted successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!event) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurant_events.emit("restaurant_event.deleted", event);
    }
};

export async function getAllRestaurantEvents(
    req: Request,
    res: Response<API$Types.response<restaurantEventType[] | undefined>>
) {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const restaurant_id = req.query.restaurant_id as string;
        const upcoming = req.query.upcoming === 'true';

        const where: any = {};

        if (restaurant_id) {
            where.restaurant_id = restaurant_id;
        }

        if (upcoming) {
            where.event_date = {
                gte: new Date()
            };
        }

        let [events, total] = await Promise.all([
            prisma.restaurant_Events.findMany({
                where,
                skip,
                take: limit,
                include: {
                    Restaurants: {
                        select: {
                            restaurant_id: true,
                            name: true,
                            location: true
                        }
                    },
                    Products: true,
                    _count: {
                        select: {
                            Products: true,
                            Tickets_Purchased: true
                        }
                    }
                },
                orderBy: { event_date: 'asc' }
            }),
            prisma.restaurant_Events.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        // convertDecimals covers the nested `Products` (tickets) array too —
        // those weren't going through any conversion at all before, so a
        // ticket's `price`/`discount` (Prisma Decimal) was reaching
        // clients as a JSON string, not a number. Same bug class already
        // fixed for orders.ts/coupon.ts (see mobile/CLAUDE.md); the
        // top-level `price` still gets its own parseFloat first since
        // it's destructured out before the rest is converted.
        events = events.map(({ price, ...e }) => convertDecimals({
            price: parseFloat(price.toString()) as any,
            ...e
        }));

        return res.status(!events.length ? 404 : 200).json({
            code: !events.length ? 'API_GENERIC_NOT_FOUND_ERROR' : undefined,
            data: events,
            message: !events.length ? 'There are no registered events' : 'Restaurant events retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (events.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getBoughtTickets(
    req: Request,
    res: Response<API$Types.response<boughtTicketType[] | undefined>>
) {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const event_id = req.query[Madeirense$Enumerators.SearchQueries.event_id] as string;
        const restaurant_id = req.query[Madeirense$Enumerators.SearchQueries.restaurant_id] as string;

        const where: any = {};

        if (event_id) { where.event_id = parseInt(event_id); }
        if (restaurant_id) { where.restaurant_id = parseInt(restaurant_id); }

        const [tickets, total] = await Promise.all([
            await prisma.tickets_Purchased.findMany({
                where,
                skip,
                take: limit,
                include: {
                    Users_Tickets_Purchased_validator_idToUsers: {
                        select: {
                            email: true,
                            name: true,
                            profile_photo: true,
                            phone: true
                        }
                    },
                    Users_Tickets_Purchased_user_idToUsers: {
                        select: {
                            email: true,
                            name: true,
                            profile_photo: true,
                            phone: true
                        }
                    },
                    Orders: {
                        include: {
                            Payments: {
                                select: {
                                    payment_id: true,
                                    payment_method: true,
                                    status: true,
                                    amount: true,
                                    created_at: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    purchased_at: 'desc'
                }
            }),
            prisma.tickets_Purchased.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!tickets.length ? 404 : 200).json({
            code: !tickets.length ? 'API_GENERIC_NOT_FOUND_ERROR' : undefined,
            data: tickets.map(convertDecimals) as boughtTicketType[],
            message: !tickets.length ? 'No tickets have been bought until now' : 'Bought tickets retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (tickets.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getEventsByRestaurant(
    req: Request<{ restaurant_id: string }>,
    res: Response<API$Types.response<restaurantEventType[] | undefined>>
) {
    try {
        const { restaurant_id: _id } = req.params;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const upcoming = req.query[Madeirense$Enumerators.SearchQueries.upcoming] === 'true';

        const restaurant_id = parseInt(_id as string, 10);

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        const where: any = { restaurant_id };

        if (upcoming) {
            where.event_date = {
                gte: new Date()
            };
        }

        const [events, total] = await Promise.all([
            prisma.restaurant_Events.findMany({
                where,
                skip,
                take: limit,
                orderBy: { event_date: 'asc' }
            }),
            prisma.restaurant_Events.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!events.length ? 404 : 200).json({
            data: events,
            message: !events.length ? 'This restaurant has no scheduled/registered events' : 'Restaurant events retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (events.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getRestaurantEventById(
    req: Request<{ id: string }>,
    res: Response<API$Types.response<restaurantEventType | undefined>>
) {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const event = await prisma.restaurant_Events.findUnique({
            where: { event_id: id },
            include: {
                Restaurants: {
                    select: {
                        restaurant_id: true,
                        name: true,
                        location: true
                    }
                },
                Products: true,
                _count: {
                    select: {
                        Products: true,
                        Tickets_Purchased: true
                    }
                }
            }
        });

        if (!event) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant event not found',
                success: false
            });
        }

        // Unlike getAllRestaurantEvents, this endpoint wasn't converting
        // Decimal fields at all — not even the event's own `price`, let
        // alone the nested `Products` (tickets) array. convertDecimals
        // covers both in one pass.
        return res.status(200).json({
            data: convertDecimals(event),
            message: 'Restaurant event retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getUpcomingEvents(
    req: Request,
    res: Response<API$Types.response<restaurantEventType[] | undefined>>
) {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [events, total] = await Promise.all([
            prisma.restaurant_Events.findMany({
                where: {
                    event_date: {
                        gte: new Date()
                    }
                },
                skip,
                take: limit,
                include: {
                    Restaurants: {
                        select: {
                            restaurant_id: true,
                            name: true,
                            location: true
                        }
                    }
                },
                orderBy: { event_date: 'asc' }
            }),
            prisma.restaurant_Events.count({
                where: {
                    event_date: {
                        gte: new Date()
                    }
                }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!events.length ? 404 : 200).json({
            data: events,
            message: !events.length ? 'This restaurant has no upcoming events' : 'Upcoming events retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (events.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function updateRestaurantEvent(
    req: IEventfulRequest<
        { id: string },
        Partial<{
            name: string,
            description: string,
            event_date: Date,
            start_time: timeType,
            end_time: timeType,
            price?: number,
            thumbnail_url?: string,
            spots?: number,
            video_url: string
            restaurant_id: number
        }>
    >,
    res: Response<API$Types.response<Partial<restaurantEventType> | undefined>>
) {
    const { id: _id } = req.params;

    const {
        name = undefined,
        description = undefined,
        event_date: ed = undefined,
        start_time: st = undefined,
        end_time: et = undefined,
        price = undefined,
        spots = undefined,
        restaurant_id = undefined,
        thumbnail_url = undefined,
        video_url = undefined
    } = req.body;

    const id = parseInt(_id as string, 10);

    let event: restaurantEventType | null = null;

    try {
        const existingEvent = await prisma.restaurant_Events.findUnique({
            where: { event_id: id }
        });

        if (!existingEvent) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant event not found',
                success: false,
            });
        }

        const event_date = !ed ? undefined : new Date(ed);
        const start_time = (!st || !event_date) ? undefined : toDateISO(event_date, st);
        const end_time = (!et || !event_date) ? undefined : toDateISO(event_date, et);

        const $PARTIAL = {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(event_date && { event_date }),
            ...(start_time && { start_time }),
            ...(end_time && { end_time }),
            ...(price !== undefined && { price }),
            ...(spots !== undefined && { spots }),
            ...(restaurant_id !== undefined && { restaurant_id }),
            ...(thumbnail_url !== undefined && { thumbnail_url }),
            ...(video_url !== undefined && { video_url })
        } as unknown as Partial<Restaurant_Events>;

        event = await prisma.$transaction(async $trx => {
            try {
                const ue = await $trx.restaurant_Events.update({
                    where: { event_id: id },
                    data: $PARTIAL,
                    include: {
                        Restaurants: {
                            select: {
                                restaurant_id: true,
                                name: true,
                                location: true
                            }
                        },
                        Products: true,
                        _count: {
                            select: {
                                Products: true,
                                Tickets_Purchased: true
                            }
                        }
                    }
                });

                if ([price, description, thumbnail_url, name].some(v => v !== undefined)) await $trx.products.update({
                    where: { product_id: ue.Products.find(p => p.product_type === "ticket")?.product_id },
                    data: {
                        ...(name && { name }),
                        ...(description !== undefined && { description }),
                        ...(price !== undefined && { price }),
                        ...(thumbnail_url !== undefined && { thumbnail_url }),
                    },
                });

                return ue;
            } catch (error) {
                throw new Error(`Unable to update Event: ${(error as Error).message}`);
            }
        });

        return res.status(200).json({
            data: req.method === "PATCH" ? $PARTIAL : event,
            message: 'Restaurant event updated successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!event) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurant_events.emit("restaurant_event.updated", event);
    }
};

// RECONSTRUCTION NOTE (2026-09-30): getMyTickets, getMyTicketById and
// validateTicket below were lost with the stolen laptop and never
// reached GitHub — rebuilt against the Tickets_Purchased schema and the
// ticket JWT scheme in generateTicketToken/verifyTicketToken (utilities/
// generators.ts). Correction (2026-09-30, later same day): the route
// wiring did NOT survive either, despite what this note originally
// claimed — these three functions had no routes pointing at them at all
// until routes/restaurantEvents.ts's own "ADDED" note. Paths/middleware
// there were designed fresh, not recovered.

/**
 * Customer-facing — the logged-in user's own tickets, each with a signed
 * `token` for the app to render as a QR code. Scoped to req.user.user_id;
 * there's no way to list someone else's tickets through this endpoint.
 */
export async function getMyTickets(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<myTicketType[] | undefined>>
) {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where = { user_id: req.user.user_id };

        const [rawTickets, total] = await Promise.all([
            prisma.tickets_Purchased.findMany({
                where,
                skip,
                take: limit,
                include: {
                    Restaurant_Events: {
                        include: {
                            Restaurants: {
                                select: {
                                    restaurant_id: true,
                                    name: true,
                                    location: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    purchased_at: 'desc'
                }
            }),
            prisma.tickets_Purchased.count({ where })
        ]);

        const tickets: myTicketType[] = rawTickets.map(ticket => ({
            ...convertDecimals(ticket),
            token: generateTicketToken(ticket)
        }));

        const totalPages = Math.ceil(total / limit);

        return res.status(!tickets.length ? 404 : 200).json({
            code: !tickets.length ? 'API_GENERIC_NOT_FOUND_ERROR' : undefined,
            data: tickets,
            message: !tickets.length ? 'You have no tickets yet' : 'Your tickets retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (tickets.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

/**
 * Customer-facing — a single ticket by id, still scoped to the caller.
 * Returns a plain 404 (not 403) when the ticket belongs to someone else,
 * same "don't confirm another user's ticket id exists" reasoning used
 * elsewhere in this API.
 */
export async function getMyTicketById(
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<myTicketType | undefined>>
) {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const ticket_id = parseInt(req.params.id, 10);

        const ticket = await prisma.tickets_Purchased.findUnique({
            where: { ticket_id },
            include: {
                Restaurant_Events: {
                    include: {
                        Restaurants: {
                            select: {
                                restaurant_id: true,
                                name: true,
                                location: true
                            }
                        }
                    }
                }
            }
        });

        if (!ticket || ticket.user_id !== req.user.user_id) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Unable to find a ticket with this id for your account',
            success: false
        });

        return res.json({
            data: {
                ...convertDecimals(ticket),
                token: generateTicketToken(ticket)
            },
            message: 'Ticket retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

/**
 * Customer-facing — buys ticket(s) for an event directly.
 *
 * PRODUCT DECISION (2026-09-30, Robbie): tickets used to only come into
 * existence as a side effect of `createOrder` (controllers/orders.ts),
 * and only for free events — a paid "ticket" bought through the normal
 * cart/checkout flow charged the customer but never became a verifiable
 * `Tickets_Purchased` entity. Tickets are now bought through this
 * endpoint instead, entirely independent of the product cart/Orders
 * flow — no `Orders` or `Payments` row is created here at all (`order_id`
 * on `Tickets_Purchased` is now nullable — see schema.dev.prisma's own
 * comment on that model, and it REQUIRES a manual DB migration before
 * this works, spelled out there). The cart/Orders flow stays reserved
 * for food delivery and, eventually, event merchandise — never tickets.
 *
 * No real payment integration exists anywhere in this codebase yet
 * (checkout is still a placeholder flow client-side too), so this
 * doesn't regress anything by not charging a card — when real payment
 * gets wired in, it belongs here, gating the `Tickets_Purchased.create`
 * call below.
 */
export async function purchaseTicket(
    req: IAuthenticatedRequest<{ id: string }, { quantity?: number }>,
    res: Response<API$Types.response<myTicketType | undefined>>
) {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const event_id = parseInt(req.params.id, 10);

        const quantityInput = req.body?.quantity;
        const quantity = (typeof quantityInput === 'number' && quantityInput > 0)
            ? Math.floor(quantityInput)
            : 1;

        const event = await prisma.restaurant_Events.findUnique({
            where: { event_id }
        });

        if (!event) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Restaurant event not found',
            success: false
        });

        if (event.status === 'cancelled' || event.status === 'expired') return res.status(400).json({
            data: undefined,
            code: 'BAD_REQUEST',
            message: 'This event is no longer accepting ticket purchases',
            success: false
        });

        let ticket;

        try {
            ticket = await prisma.$transaction(async $trx => {
                // Spots are capacity, not a row count — a single purchase
                // can cover more than one seat (quantity), so this sums
                // quantity rather than counting Tickets_Purchased rows.
                // `expired` tickets (see restaurantEvent$Cron / the
                // expiry sweep referenced elsewhere) don't hold a spot.
                if (event.spots !== null) {
                    const { _sum } = await $trx.tickets_Purchased.aggregate({
                        where: { event_id, expired: false },
                        _sum: { quantity: true }
                    });

                    const sold = _sum.quantity ?? 0;

                    if (sold + quantity > event.spots) {
                        throw new Error('NOT_ENOUGH_SPOTS');
                    }
                }

                const unitPrice = parseFloat(event.price.toString());

                return $trx.tickets_Purchased.create({
                    data: {
                        user_id: req.user!.user_id,
                        restaurant_id: event.restaurant_id,
                        event_id,
                        order_id: null,
                        quantity,
                        price: unitPrice * quantity,
                        expiry_date: event.end_time,
                        purchased_at: new Date()
                    },
                    include: {
                        Restaurant_Events: {
                            include: {
                                Restaurants: {
                                    select: {
                                        restaurant_id: true,
                                        name: true,
                                        location: true
                                    }
                                }
                            }
                        }
                    }
                });
            });
        } catch (error) {
            if ((error as Error).message === 'NOT_ENOUGH_SPOTS') {
                return res.status(400).json({
                    data: undefined,
                    code: 'BAD_REQUEST',
                    message: 'Not enough spots left for this event',
                    success: false
                });
            }

            throw error;
        }

        return res.status(201).json({
            data: {
                ...convertDecimals(ticket),
                token: generateTicketToken(ticket)
            },
            message: 'Ticket purchased successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}

type ticketErrorCodes = (
    'API_INVALID_TICKET_TOKEN' |
    'API_TICKET_ALREADY_VALIDATED' |
    'API_TICKET_EXPIRED'
);

/**
 * Staff/Admin-only — scans a ticket's QR token at the door. Validates the
 * token's signature first (a malformed/foreign token never reaches the
 * DB lookup), then checks the ticket's own DB state
 * (validated_at/expired/expiry_date) rather than trusting anything
 * encoded in the token itself — the token is only ever a tamper-proof
 * pointer to a ticket_id, see generateTicketToken's own comment.
 */
export async function validateTicket(
    req: IAuthenticatedRequest<{}, { token: string }>,
    res: Response<API$Types.response<boughtTicketType | undefined, ticketErrorCodes>>
) {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const { token } = req.body;

        let ticketId: number;

        try {
            ({ ticketId } = verifyTicketToken(token));
        } catch {
            return res.status(400).json({
                data: undefined,
                code: 'API_INVALID_TICKET_TOKEN',
                message: 'This QR code isn\'t a valid ticket — it may be corrupted or from a different event',
                success: false
            });
        }

        const ticket = await prisma.tickets_Purchased.findUnique({
            where: { ticket_id: ticketId },
            include: {
                Users_Tickets_Purchased_user_idToUsers: {
                    select: {
                        name: true,
                        email: true,
                        profile_photo: true
                    }
                }
            }
        });

        if (!ticket) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'This ticket no longer exists',
            success: false
        });

        if (ticket.validated_at) return res.status(409).json({
            data: convertDecimals(ticket),
            code: 'API_TICKET_ALREADY_VALIDATED',
            message: `This ticket was already validated at ${ticket.validated_at.toISOString()}`,
            success: false
        });

        if (ticket.expired || (ticket.expiry_date && ticket.expiry_date < new Date())) return res.status(409).json({
            data: convertDecimals(ticket),
            code: 'API_TICKET_EXPIRED',
            message: 'This ticket has expired',
            success: false
        });

        const validatedTicket = await prisma.tickets_Purchased.update({
            where: { ticket_id: ticketId },
            data: {
                validated_at: new Date(),
                validator_id: req.user.user_id
            },
            include: {
                Users_Tickets_Purchased_user_idToUsers: {
                    select: {
                        name: true,
                        email: true,
                        profile_photo: true
                    }
                }
            }
        });

        return res.json({
            data: convertDecimals(validatedTicket),
            message: 'Ticket validated successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
}