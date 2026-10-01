import {
    type Request,
    type Response
} from 'express';

import {
    type Delivery_Locations,
    type Restaurants,
    type Restaurant_Events,
    type Users
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    toDateISO,
    API$Enumerators,
    type API$Types,
    type driverType,
    type platformType,
    type restaurantType,
    type restaurantProductType,
    type scheduleType,
} from '@Madeirense/shared';

import {
    convertDecimals
} from '../utilities/converters';

import {
    handleControllerError
} from './utilities/handlers';

import {
    Prisma$Utilities
} from '../utilities/ORM';

import { prisma } from '../lib/prisma';

import type { IEventfulRequest } from '../middlewares/events';

// ***************************************************************************************************************

export const createRestaurant = async (
    req: IEventfulRequest,
    res: Response<API$Types.response<restaurantType | undefined>>
) => {
    const {
        name,
        location,
        thumbnail_url = null,
        ttp,
        ttd,
        schedule
    } = req.body;

    let restaurant: restaurantType | null = null;

    try {
        restaurant = await prisma.$transaction(async $trx => {
            try {
                const { location_id } = await $trx.delivery_Locations.create({
                    data: location
                });

                let _restaurant = await $trx.restaurants.create({
                    data: {
                        name,
                        location: location_id,
                        thumbnail_url,
                        ttp,
                        ttd,
                        created_at: new Date(),
                        updated_at: new Date()
                    },
                    include: Prisma$Utilities.Inclusions.Restaurants.Data
                });

                await $trx.restaurant_Hours.createMany({
                    data: (schedule as scheduleType[]).map(s => ({
                        closing_time: toDateISO(new Date(), s.closing_time),
                        opening_time: toDateISO(new Date(), s.opening_time),
                        day_of_week: s.day_of_week,
                        is_closed: s.is_closed,
                        restaurant_id: _restaurant.restaurant_id
                    }))
                });

                return _restaurant;
            } catch (error) {
                throw new Error(`Unable to create restaurant: ${(error as Error).message}`);
            }
        });

        return res.status(201).json({
            data: convertDecimals(restaurant),
            message: 'Restaurant created successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!restaurant) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurants.emit("restaurant.created", restaurant);
    }
};

export const deleteRestaurant = async (
    req: IEventfulRequest,
    res: Response<API$Types.response<undefined>>
) => {
    const { id: _id } = req.params;

    const id = parseInt(_id as string, 10);

    let restaurant: Restaurants | null = null;

    try {
        restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id: id }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        await prisma.restaurants.delete({
            where: { restaurant_id: id }
        });

        return res.status(204).json({
            data: undefined,
            message: 'Restaurant deleted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!restaurant) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurants.emit("restaurant.deleted", restaurant);
    }
};

export const getAllRestaurants = async (
    req: Request,
    res: Response<API$Types.response<any | undefined>>
) => {
    try {
        const platform = (req.headers[API$Enumerators.Headers.platform] ?? "web") as platformType;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [restaurants, total] = await Promise.all([
            prisma.restaurants.findMany({
                skip,
                take: limit,
                include: {
                    ...Prisma$Utilities.Inclusions.Restaurants.Data,
                    ...((platform === "mobile") ? {
                        Restaurant_Hours: true,
                    } : {})
                }
            }),
            prisma.restaurants.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!restaurants.length ? 404 : 200).json({
            data: (platform === "mobile") ? restaurants.map(convertDecimals) : restaurants,
            code: !restaurants.length ? 'API_GENERIC_NOT_FOUND_ERROR' : undefined,
            message: !restaurants.length ? 'None were found' : 'Restaurants retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (restaurants.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getAllAvailableDrivers(
    req: Request,
    res: Response<API$Types.response<driverType[] | undefined>>
) {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where: any = {
            user_role: 'Driver',
            Orders_Orders_courier_idToUsers: {
                none: {
                    status: 'assigned'
                }
            }
        };

        const [drivers, total] = await Promise.all([
            prisma.users.findMany({
                where,
                skip,
                take: limit,
                include: {
                    Workstations: {
                        select: {
                            restaurant_id: true
                        }
                    }
                }
            }),
            prisma.users.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!drivers.length ? 404 : 200).json({
            data: drivers,
            message: !drivers.length ? 'There\'re no registered drivers' : 'All available drivers were retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (drivers.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    };
};

export async function getAvailableDrivers(
    req: Request<{ id: string }>,
    res: Response<API$Types.response<Users[] | undefined>>
) {
    try {
        const { id: _id } = req.params;

        const restaurant_id = parseInt(_id as string, 10);

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where: any = {
            user_role: 'Driver',
            Workstations: {
                some: {
                    restaurant_id
                }
            },
            Orders_Orders_courier_idToUsers: {
                none: {
                    status: 'assigned'
                }
            }
        };

        const [drivers, total] = await Promise.all([
            prisma.users.findMany({
                where,
                skip,
                take: limit,
            }),
            prisma.users.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!drivers.length ? 404 : 200).json({
            data: drivers,
            message: !drivers.length ? 'There\'re no available drivers' : 'All available drivers were retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (drivers.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    };
};

export const getRestaurantById = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<restaurantType | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id: id },
            include: {
                Products: {
                    orderBy: { restaurant_id: 'desc' }
                },
                Delivery_Locations: {
                    select: {
                        location_id: true,
                        address: true,
                        latitude: true,
                        longitude: true
                    }
                },
                Restaurant_Hours: {
                    select: {
                        day_of_week: true,
                        is_closed: true,
                        opening_time: true,
                        closing_time: true
                    }
                },
                Restaurant_Events: {
                    where: {
                        event_date: {
                            gte: new Date()
                        }
                    },
                    orderBy: { event_date: 'asc' }
                },
                Workstations: {
                    include: {
                        Users: {
                            select: {
                                name: true,
                                user_id: true,
                                user_role: true,
                                email: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        Orders: true,
                        Products: true
                    }
                }
            }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        return res.status(200).json({
            data: restaurant,
            message: 'Restaurant retrieved successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getRestaurantProducts = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<restaurantProductType[] | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const id = parseInt(_id as string, 10);

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id: id }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        const [products, total] = await Promise.all([
            prisma.products.findMany({
                where: { restaurant_id: id },
                skip,
                take: limit,
                orderBy: { product_id: 'desc' },
                include: {
                    _count: {
                        select: {
                            User_Comments: true
                        }
                    }
                }
            }),
            prisma.products.count({
                where: { restaurant_id: id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!products.length ? 404 : 200).json({
            data: products,
            message: !products.length ? 'This restaurant has no registered products' : 'Restaurant products retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (products.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getRestaurantEvents = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<Restaurant_Events[] | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const id = parseInt(_id as string, 10);

        const restaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id: id }
        });

        if (!restaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        const [events, total] = await Promise.all([
            prisma.restaurant_Events.findMany({
                where: { restaurant_id: id },
                skip,
                take: limit,
                orderBy: { event_date: 'asc' },
            }),
            prisma.restaurant_Events.count({
                where: { restaurant_id: id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!events.length ? 404 : 200).json({
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

export const updateRestaurant = async (
    req: IEventfulRequest<
        { id: string },
        Partial<{
            name: string,
            location: Partial<Delivery_Locations>,
            thumbnail_url: string,
            schedule: scheduleType[],
            ttp: number,
            ttd: number
        }>
    >,
    res: Response<API$Types.response<Partial<restaurantType> | undefined>>
) => {
    const { id: _id } = req.params;

    const { name, location, thumbnail_url, schedule, ttp, ttd } = req.body;

    const id = parseInt(_id as string, 10);

    let restaurant: Restaurants | null = null;

    try {
        const existingRestaurant = await prisma.restaurants.findUnique({
            where: { restaurant_id: id }
        });

        if (!existingRestaurant) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Restaurant not found',
                success: false
            });
        }

        if (location) try {
            await prisma.delivery_Locations.update({
                where: { location_id: existingRestaurant.location as number },
                data: location
            });
        } catch (error) {
            throw new Error(`Unable to update restaurant's new location: ${(error as Error).message}`);
        }

        const $PARTIAL = {
            ...(name && { name }),
            ...(thumbnail_url && { thumbnail_url }),
            ...(ttp && { ttp }),
            ...(ttd && { ttd })
        };

        if (schedule) await prisma.$transaction(async $trx => {
            schedule.forEach(async s => {
                await $trx.restaurant_Hours.updateMany({
                    where: {
                        restaurant_id: id,
                        AND: [
                            { day_of_week: s.day_of_week }
                        ]
                    },
                    data: {
                        closing_time: toDateISO(new Date(), s.closing_time),
                        opening_time: toDateISO(new Date(), s.opening_time),
                        is_closed: s.is_closed
                    }
                })
            })
        });

        restaurant = await prisma.restaurants.update({
            where: { restaurant_id: id },
            data: {
                ...$PARTIAL,
                updated_at: new Date()
            },
            ...(req.method === "PATCH" ? {} : { include: Prisma$Utilities.Inclusions.Restaurants.Data })
        });

        return res.status(200).json({
            data: req.method === "PATCH" ? $PARTIAL : restaurant,
            message: 'Restaurant updated successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!restaurant) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurants.emit("restaurant.updated", restaurant);
    }
};

export const BATCH$updateRestaurants = async (
    req: IEventfulRequest<
        any,
        Partial<{
            name: string,
            thumbnail_url: string,
            schedule: scheduleType[],
            ttp: number,
            ttd: number
        }>
    >,
    res: Response<API$Types.response<restaurantType[] | undefined>>
) => {
    const {
        name,
        thumbnail_url,
        schedule,
        ttp,
        ttd
    } = req.body;

    let count: number;
    let restaurants: restaurantType[] = [];

    try {
        const $PARTIAL = {
            ...(name && { name }),
            ...(thumbnail_url && { thumbnail_url }),
            ...(ttp && { ttp }),
            ...(ttd && { ttd })
        };

        if (schedule) await prisma.$transaction(async $trx => {
            schedule.forEach(async s => {
                await $trx.restaurant_Hours.updateMany({
                    where: {
                        day_of_week: s.day_of_week
                    },
                    data: {
                        closing_time: toDateISO(new Date(), s.closing_time),
                        opening_time: toDateISO(new Date(), s.opening_time),
                        is_closed: s.is_closed
                    }
                })
            })
        });

        [
            count,
            restaurants
        ] = await prisma.$transaction(async $trx => {
            const { count } = await $trx.restaurants.updateMany({
                data: { ...$PARTIAL, updated_at: new Date() }
            });

            if (count === 0) new Error("Unable to update restaurants as there are either no entries or neither matches the search query");

            return [
                count,
                await $trx.restaurants.findMany({ include: Prisma$Utilities.Inclusions.Restaurants.Data })
            ];
        })

        return res.status(200).json({
            data: restaurants,
            message: `Restaurants updated successfully in batch | COUNT: ${count}`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!restaurants.length) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.restaurants.SILENT$emit("restaurants.updated");
    }
};