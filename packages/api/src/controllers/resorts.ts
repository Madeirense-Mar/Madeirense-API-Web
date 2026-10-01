import {
    type Request,
    type Response
} from 'express';

import {
    $Enums,
    Prisma,
    Resort_Booking_Cancellations_reason_code,
    Resort_Bookings_status,
    Resort_Rooms_Media_media_type,
    type Resort_Amenities,
    type Resort_Bed_Types,
    type Resort_Booking_Cancellation_Policies,
    type Resort_Booking_Cancellations,
    type Resorts,
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    API$Enumerators,
    Madeirense$Enumerators,
    getLabel,
    isTruthful,
    type API$Types,
    type addRoomBodyType,
    type bookRoomBodyType,
    type bookingType,
    type bookingHistoryType,
    type createResortBodyType,
    type resortRoomType,
    type resortPropertyType,
    type resortChatEntryType,
    type updateBookingBodyType,
    type updateRoomBodyType
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import { Prisma$Utilities } from 'utilities/ORM';

import { prisma } from '../lib/prisma';

import type {
    IAuthenticatedRequest
} from '../interfaces';

// ***************************************************************************************************************

export namespace resorts {
    export async function createResort(
        req: IAuthenticatedRequest<any, createResortBodyType>,
        res: Response<API$Types.response<Resorts | undefined>>
    ) {
        try {
            if (req.body.location) {
                const location = await prisma.delivery_Locations.findUnique({
                    where: {
                        location_id: req.body.location
                    },
                });

                if (!location) return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    message: 'Unable to find registered locations',
                    success: false
                });
            }

            const resort = await prisma.resorts.create({
                data: {
                    ...req.body,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
            });

            return res.status(201).json({
                data: resort,
                message: 'Resort created successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function deleteResort(
        req: IAuthenticatedRequest<{ id: string }>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            const { id: _id } = req.params;

            const id = parseInt(_id as string, 10);

            const resort = await prisma.resorts.findUnique({
                where: { resort_id: id }
            });

            if (!resort) {
                return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    success: false,
                    message: 'Resort not found'
                });
            }

            await prisma.resorts.delete({
                where: { resort_id: id },

            });

            return res.json({
                data: undefined,
                message: 'Resort deleted successfully',
                success: true
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getResort(
        req: Request<{ id: string }>,
        res: Response<API$Types.response<(Resorts & { Resort_Rooms: resortRoomType[] }) | undefined>>
    ) {
        try {
            const resort = await prisma.resorts.findUnique({
                where: {
                    resort_id: parseInt(req.params.id)
                },
                include: {
                    Resort_Rooms: {
                        include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
                    }
                }
            });

            if (!resort) return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Unable to find resort, check if the id parameter is correct',
                success: false
            });

            return res.status(200).json({
                data: resort,
                message: 'Resort retrieved successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getResorts(
        req: Request,
        res: Response<API$Types.response<Resorts[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const withRooms = [
                '0',
                '1'
            ].includes(req.query[Madeirense$Enumerators.SearchQueries.withRooms] as string);

            const [resorts, total] = await Promise.all([
                prisma.resorts.findMany({
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    ...(withRooms ? {
                        include: {
                            Resort_Rooms: {
                                include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
                            }
                        }
                    } : {})
                }),
                prisma.resorts.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!resorts.length ? 404 : 200).json({
                data: resorts,
                message: !resorts.length ? 'There are no created resorts' : 'Resorts retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (resorts.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type updateResortBodyType = Partial<createResortBodyType>

    export async function updateResort(
        req: IAuthenticatedRequest<{ id: string }, Partial<updateResortBodyType>>,
        res: Response<API$Types.response<Resorts | undefined>>
    ) {
        try {
            if (req.body.location) {
                const location = await prisma.delivery_Locations.findUnique({
                    where: {
                        location_id: req.body.location
                    },
                });

                if (!location) return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    message: 'Unable to find registered locations',
                    success: false
                });
            }

            const resort = await prisma.resorts.update({
                where: {
                    resort_id: parseInt(req.params.id)
                },
                data: {
                    ...req.body,
                    updated_at: new Date().toISOString()
                },
            });

            return res.status(200).json({
                data: resort,
                message: 'Resort created successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }
};

export namespace rooms {
    export async function addRoom(
        req: IAuthenticatedRequest<{ id: string }, addRoomBodyType>,
        res: Response<API$Types.response<resortRoomType | undefined>>
    ) {
        try {
            const resort = await prisma.resorts.findUnique({
                where: {
                    resort_id: parseInt(req.params.id),
                },
            });

            if (!resort) return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Unable to find resort, check if the id parameter is correct',
                success: false
            });

            const {
                thumbnail_url_collection,
                video_url_collection
            } = req.body;

            const room = await prisma.resort_Rooms.create({
                data: {
                    name: req.body.name,
                    price_per_night: req.body.price_per_night,
                    quantity: req.body.quantity,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    availability: 'Available',
                    resort_id: parseInt(req.params.id),
                    Resort_Room_Amenities: {
                        createMany: {
                            data: req.body.amenities.map(amenity_id => ({
                                amenity_id
                            }))
                        }
                    },
                    Resort_Room_Bed_Options: {
                        createMany: {
                            data: req.body.bedTypes.map(({ bed_type_id, quantity }) => ({
                                bed_type_id,
                                quantity
                            }))
                        }
                    },
                    Resort_Rooms_Media: {
                        createMany: {
                            data: ([
                                ...(thumbnail_url_collection ?? []).map(url => ({ url, type: 'Thumbnail' })),
                                ...(video_url_collection ?? []).map(url => ({ url, type: 'Video' })),
                            ] as ({ url: string, type: Resort_Rooms_Media_media_type })[]).map(({ url: media_url, type: media_type }) => ({
                                media_type,
                                media_url,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            }))
                        }
                    }
                },
                include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
            });

            return res.status(201).json({
                data: room as resortRoomType,
                message: 'Room added successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function deleteRoom(
        req: IAuthenticatedRequest<{ id: string }>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            const { id: _id } = req.params;

            const id = parseInt(_id as string, 10);

            const resort = await prisma.resort_Rooms.findUnique({
                where: { room_id: id }
            });

            if (!resort) {
                return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    success: false,
                    message: 'Room not found'
                });
            }

            await prisma.resort_Rooms.delete({
                where: { room_id: id },

            });

            return res.json({
                data: undefined,
                message: 'Room deleted successfully',
                success: true
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getRooms(
        req: Request<{ id: string }>,
        res: Response<API$Types.response<resortRoomType[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const _amenities: undefined | string = req.query[Madeirense$Enumerators.SearchQueries.amenities] as string;
            const amenities: number[] = (!_amenities) ? [] : _amenities.split(',').map(str => parseInt(str)) as number[];

            const _bedTypes: undefined | string = req.query[Madeirense$Enumerators.SearchQueries.bed_types] as string;
            const bedTypes: number[] = (!_bedTypes) ? [] : _bedTypes.split(',').map(str => parseInt(str)) as number[];

            const _statuses: undefined | string = req.query[Madeirense$Enumerators.SearchQueries.statuses] as string;
            const statuses: $Enums.Resort_Rooms_availability[] = (!_statuses) ? [] : _statuses.split(',') as $Enums.Resort_Rooms_availability[];

            const skip = (page - 1) * limit;

            const where: Prisma.Resort_RoomsWhereInput = {
                resort_id: parseInt(req.params.id),
                ...(!statuses.length ? {} : {
                    availability: {
                        in: statuses
                    }
                }),
                ...(!amenities.length ? {} : {
                    Resort_Room_Amenities: {
                        some: {
                            amenity_id: {
                                in: amenities
                            }
                        }
                    }
                }),
                ...(!bedTypes.length ? {} : {
                    Resort_Room_Bed_Options: {
                        some: {
                            bed_type_id: {
                                in: bedTypes
                            }
                        }
                    }
                })
            };

            const [rooms, total] = await Promise.all([
                prisma.resort_Rooms.findMany({
                    where,
                    skip,
                    take: limit,
                    include: Prisma$Utilities.Inclusions.Resort_Rooms.Data,
                    orderBy: { created_at: 'desc' },
                }),
                prisma.resort_Rooms.count({
                    where
                })
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!rooms.length ? 404 : 200).json({
                data: rooms,
                message: !rooms.length ? 'This resort has no registered rooms or none match the searching criteria' : 'Rooms retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (rooms.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function updateRoom(
        req: IAuthenticatedRequest<{ id: string }, updateRoomBodyType>,
        res: Response<API$Types.response<resortRoomType | undefined>>
    ) {
        try {
            const room = await prisma.$transaction(async $trx => {
                const _room = await $trx.resort_Rooms.update({
                    where: {
                        room_id: parseInt(req.params.id)
                    },
                    data: {
                        updated_at: new Date().toISOString(),
                        ...((!req.body.name) ? {} : { name: req.body.name }),
                        ...((!req.body.price_per_night) ? {} : { price_per_night: req.body.price_per_night }),
                        ...((!req.body.quantity) ? {} : { quantity: req.body.quantity })
                    },
                    include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
                });

                return _room;
            });

            return res.status(200).json({
                data: room,
                message: 'Room updated successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    };

    type updateRoomAmenitiesBodyType = API$Types.listUpdateType;

    export async function updateRoomAmenities(
        req: IAuthenticatedRequest<{ id: string }, updateRoomAmenitiesBodyType>,
        res: Response<API$Types.response<resortRoomType | undefined>>
    ) {
        try {
            if (!(await (prisma.resort_Rooms).findUnique({ where: { room_id: parseInt(req.params.id) } }))) {
                return res.status(404).json({
                    data: undefined,
                    message: 'This room doesn\'t exist',
                    success: false,
                });
            }

            const {
                adding,
                removing
            } = req.body;

            if (adding) await prisma.resort_Room_Amenities.createMany({
                data: adding.map(amenity_id => ({
                    amenity_id,
                    room_id: parseInt(req.params.id)
                }))
            });

            if (removing) await prisma.resort_Room_Amenities.deleteMany({
                where: {
                    room_id: parseInt(req.params.id),
                    AND: [
                        {
                            amenity_id: {
                                in: removing
                            }
                        }
                    ]
                }
            });

            const room = await prisma.resort_Rooms.findUnique({
                where: {
                    room_id: parseInt(req.params.id)
                },
                include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
            });

            return res.status(200).json({
                data: room,
                message: 'Successfully edited room\'s amenities',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type updateRoomBedTypesBodyType = API$Types.listUpdateType<
        { bed_type_id: number, quantity: number }
    >
    type updateRoomBedTypesPayloadType = {};

    export async function updateRoomBedTypes(
        req: Request<any, any, updateRoomBedTypesBodyType>,
        res: Response<API$Types.response<updateRoomBedTypesPayloadType | undefined>>
    ) {
        try {
            if (!(await (prisma.resort_Rooms).findUnique({ where: { room_id: parseInt(req.params.id) } }))) {
                return res.status(404).json({
                    data: undefined,
                    message: 'This room doesn\'t exist',
                    success: false,
                });
            }

            const {
                adding,
                removing
            } = req.body;

            if (adding) await prisma.resort_Room_Bed_Options.createMany({
                data: adding.map(({ bed_type_id, quantity }) => ({
                    bed_type_id,
                    quantity,
                    room_id: parseInt(req.params.id)
                }))
            });

            if (removing) await prisma.resort_Room_Bed_Options.deleteMany({
                where: {
                    room_id: parseInt(req.params.id),
                    AND: [
                        {
                            bed_type_id: {
                                in: removing
                            }
                        }
                    ]
                }
            });

            const room = await prisma.resort_Rooms.findUnique({
                where: {
                    room_id: parseInt(req.params.id)
                },
                include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
            });

            return res.status(200).json({
                data: room,
                message: 'Successfully edited room\'s bed types',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type updateRoomMediaBodyType = API$Types.listUpdateType<
        { media_url: string, media_type: Resort_Rooms_Media_media_type }
    >

    type updateRoomMediaPayloadType = {};

    export async function updateRoomMedia(
        req: Request<any, any, updateRoomMediaBodyType>,
        res: Response<API$Types.response<updateRoomMediaPayloadType | undefined>>
    ) {
        try {
            if (!(await (prisma.resort_Rooms).findUnique({ where: { room_id: parseInt(req.params.id) } }))) {
                return res.status(404).json({
                    data: undefined,
                    message: 'This room doesn\'t exist',
                    success: false,
                });
            }

            const {
                adding,
                removing
            } = req.body;

            if (adding) await prisma.resort_Rooms_Media.createMany({
                data: adding.map(({ media_type, media_url }) => ({
                    media_type,
                    media_url,
                    room_id: parseInt(req.params.id)
                }))
            });

            if (removing) await prisma.resort_Rooms_Media.deleteMany({
                where: {
                    room_id: parseInt(req.params.id),
                    AND: [
                        {
                            media_id: {
                                in: removing
                            }
                        }
                    ]
                }
            });

            const room = await prisma.resort_Rooms.findUnique({
                where: {
                    room_id: parseInt(req.params.id)
                },
                include: Prisma$Utilities.Inclusions.Resort_Rooms.Data
            });

            return res.status(200).json({
                data: room,
                message: 'Successfully edited room\'s profile media files',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function BATCH$updateRooms(
        req: IAuthenticatedRequest<any, updateRoomBodyType & {
            list: number[]
        }>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            await prisma.resort_Rooms.updateMany({
                where: {
                    room_id: {
                        in: req.body.list
                    }
                },
                data: {
                    updated_at: new Date().toISOString(),
                    ...((!req.body.name) ? {} : { name: req.body.name }),
                    ...((!req.body.price_per_night) ? {} : { price_per_night: req.body.price_per_night }),
                    ...((!req.body.quantity) ? {} : { quantity: req.body.quantity })
                }
            });

            return res.status(200).json({
                data: undefined,
                message: 'Rooms updated successfully',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }
};

export namespace bookings {
    export async function bookRoom(
        req: IAuthenticatedRequest<{ id: string }, bookRoomBodyType>,
        res: Response<API$Types.response<bookingType | undefined>>
    ) {
        try {
            const booking_id = await prisma.$transaction(async $trx => {
                await $trx.resort_Booking_History.create({
                    data: {
                        booking_id: parseInt(req.params.id),
                        user_id: req.user?.user_id as number,
                        status: 'pending',
                        notes: [
                            `Marcação criada`,
                            `check-in ${new Date(req.body.check_in).toLocaleString()}`,
                            `check-out ${new Date(req.body.check_out).toLocaleString()}`,
                            `para ${req.body.guests} pessoa(s)`,
                            `no valor de ${req.body.amount} AOA.`
                        ].join(', '),
                    }
                });

                const { Resort_Bookings } = await $trx.resort_Booking_Payments.create({
                    data: {
                        amount: req.body.amount,
                        user_id: req.user?.user_id as number,
                        payment_method: req.body.payment_method,
                        status: req.body.payment_status,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        Resort_Bookings: {
                            create: {
                                resort_id: parseInt(req.params.id),
                                user_id: req.user?.user_id as number,
                                room_id: req.body.room_id,
                                check_in: new Date(req.body.check_in.toString()).toISOString(),
                                check_out: new Date(req.body.check_out.toString()).toISOString(),
                                guests: req.body.guests,
                                status: 'pending',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }
                        }
                    },
                    include: {
                        Resort_Bookings: {
                            select: {
                                booking_id: true
                            }
                        }
                    }
                });

                return Resort_Bookings[0]?.booking_id
            });

            return res.status(201).json({
                data: await prisma.resort_Bookings.findUnique({
                    where: {
                        booking_id
                    },
                    include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
                }),
                message: 'Successfully booked a room',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type cancelBookingBodyType = {
        reason_code: Resort_Booking_Cancellations_reason_code
    }

    export async function cancelBooking(
        req: IAuthenticatedRequest<{ id: string }, cancelBookingBodyType>,
        res: Response<API$Types.response<Resort_Booking_Cancellations | undefined>>
    ) {
        try {
            // switch (req.user?.user_role!) {
            //     case 'Admin':
            //     case 'Staff':

            //         break;

            //     default:
            //         break;
            // };

            const cancellationRecord = await prisma.$transaction(async $trx => {
                await $trx.resort_Booking_History.create({
                    data: {
                        booking_id: parseInt(req.params.id),
                        user_id: req.user?.user_id as number,
                        status: 'cancelled',
                        notes: `Marcação cancelada por motivo: ${req.body.reason_code}`,
                    }
                });

                await $trx.resort_Bookings.update({
                    where: {
                        booking_id: parseInt(req.params.id),
                    },
                    data: {
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    }
                });

                return await $trx.resort_Booking_Cancellations.create({
                    data: {
                        booking_id: parseInt(req.params.id),
                        reason_code: req.body.reason_code,
                    }
                });
            });

            res.status(201).json({
                data: cancellationRecord,
                message: 'Updated current booking to cancelled status and added a cancellation record',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getBookingHistory(
        req: IAuthenticatedRequest<{ id: string }>,
        res: Response<API$Types.response<bookingHistoryType[] | undefined>>
    ) {
        try {
            const { id: _id } = req.params;

            const id = parseInt(_id as string, 10);

            const booking = await prisma.resort_Bookings.findUnique({
                where: { booking_id: id },
            });

            if (!booking) {
                return res.status(404).json({
                    data: undefined,
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    message: 'Booking not found',
                    success: false
                });
            }

            return res.json({
                data: await prisma.resort_Booking_History.findMany({
                    where: { booking_id: id },
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
                message: 'Booking history retrieved successfully',
                success: true
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getBooking(
        req: IAuthenticatedRequest<{ id: string }>,
        res: Response<API$Types.response<bookingType | undefined>>
    ) {
        try {
            const booking = await prisma.resort_Bookings.findUnique({
                where: {
                    booking_id: parseInt(req.params.id)
                },
                include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
            });

            if (!booking) {
                return res.status(404).json({
                    code: 'BAD_REQUEST',
                    data: undefined,
                    message: 'Booking does not exist',
                    success: false
                });
            }

            return res.status(200).json({
                data: booking,
                message: 'Booking retrieved successfully',
                success: true
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getBookings(
        req: IAuthenticatedRequest<{ id: string }>,
        res: Response<API$Types.response<bookingType[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const _statuses: undefined | string = req.query[Madeirense$Enumerators.SearchQueries.statuses] as string;
            const statuses: Resort_Bookings_status[] = (!_statuses) ? [] : _statuses.split(',') as Resort_Bookings_status[];

            const where: Prisma.Resort_BookingsWhereInput = {
                resort_id: parseInt(req.params.id),
                ...(_statuses && {
                    status: {
                        in: statuses
                    }
                })
            };

            const [bookings, total] = await Promise.all([
                prisma.resort_Bookings.findMany({
                    where,
                    skip,
                    take: limit,
                    include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
                }),
                prisma.resort_Bookings.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!bookings.length ? 404 : 200).json({
                data: bookings,
                message: !bookings.length ? 'There are no registered bookings for this resort' : 'Bookings retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (bookings.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getMyBookings(
        req: IAuthenticatedRequest,
        res: Response<API$Types.response<bookingType[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const _statuses: undefined | string = req.query[Madeirense$Enumerators.SearchQueries.statuses] as string;
            const statuses: Resort_Bookings_status[] = (!_statuses) ? [] : _statuses.split(',') as Resort_Bookings_status[];

            const where: Prisma.Resort_BookingsWhereInput = {
                user_id: req.user?.user_id as number,
                ...(_statuses && {
                    status: {
                        in: statuses
                    }
                })
            };

            const [bookings, total] = await Promise.all([
                prisma.resort_Bookings.findMany({
                    where,
                    skip,
                    take: limit,
                    include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
                }),
                prisma.resort_Bookings.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!bookings.length ? 404 : 200).json({
                data: bookings,
                message: !bookings.length ? 'There are no registered bookings for this resort' : 'Bookings retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (bookings.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getBookingCancellationPolicies(
        req: Request,
        res: Response<API$Types.response<Resort_Booking_Cancellation_Policies[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const [policies, total] = await Promise.all([
                prisma.resort_Booking_Cancellation_Policies.findMany({
                    skip,
                    take: limit,
                }),
                prisma.resort_Booking_Cancellation_Policies.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!policies.length ? 404 : 200).json({
                data: policies,
                message: !policies.length ? 'There are no registered cancellation policies' : 'Cancellation policies retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (policies.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function updateBooking(
        req: IAuthenticatedRequest<{ id: string }, updateBookingBodyType>,
        res: Response<API$Types.response<bookingType | undefined>>
    ) {
        try {
            const currentBooking = await prisma.resort_Bookings.findUnique({
                where: {
                    booking_id: parseInt(req.params.id),
                }
            });

            if (!currentBooking) {
                return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    message: 'Unable to find booking, check if the id parameter is correct',
                    success: false
                });
            }

            if ([
                req.body.check_in,
                req.body.check_out,
            ].some(isTruthful)) {
                if (req.body.check_in && (new Date(req.body.check_in) > new Date(currentBooking.check_out))) {
                    return res.status(400).json({
                        code: 'BAD_REQUEST',
                        data: undefined,
                        message: 'The check-in date cannot be after check-out',
                        success: false
                    });
                }

                if (req.body.check_out && (new Date(req.body.check_out) < new Date(currentBooking.check_in))) {
                    return res.status(400).json({
                        code: 'BAD_REQUEST',
                        data: undefined,
                        message: 'The check-out date cannot be after check-in',
                        success: false
                    });
                }
            }

            const booking = await prisma.$transaction(async $trx => {
                await $trx.resort_Booking_History.createMany({
                    data: (Object.keys(req.body) as (keyof updateBookingBodyType)[]).map(key => ({
                        booking_id: parseInt(req.params.id),
                        user_id: req.user?.user_id as number,
                        notes: ((k: keyof updateBookingBodyType) => {
                            switch (k) {
                                case 'amount':
                                    return `Preço da marcação foi actualizado para de ${req.body.amount} AOA`;
                                case 'check_in':
                                    return `Data de check-in foi movida para ${new Date(req.body.check_in as Date).toLocaleString()}`;
                                case 'check_out':
                                    return `Data de check-out foi movida para ${new Date(req.body.check_in as Date).toLocaleString()}`;
                                case 'guests':
                                    return `Número de hóspedes foi alterado de ${currentBooking.guests} para ${req.body.guests}`;
                                case 'payment_method':
                                    return `O modo de pagamento foi alterado para ${req.body.payment_method}`;
                                case 'room_id':
                                    return `O quarto para esta marcação foi alterado`;

                                default: throw new Error('Unknown or prohibited booking update property');
                            }
                        })(key),
                    }))
                });


                if ([
                    req.body.amount,
                    req.body.payment_method,
                ].some(isTruthful)) {
                    $trx.resort_Booking_Payments.update({
                        where: {
                            payment_id: currentBooking.payment_id,
                        },
                        data: {
                            ...(!req.body.amount ? {} : { amount: req.body.amount }),
                            ...(!req.body.payment_method ? {} : { payment_method: req.body.payment_method }),
                        }
                    });
                }

                return $trx.resort_Bookings.update({
                    where: {
                        booking_id: parseInt(req.params.id),
                    },
                    data: {
                        ...(!req.body.room_id ? {} : { room_id: req.body.room_id }),
                        ...(!req.body.check_in ? {} : { check_in: new Date(req.body.check_in.toString()).toISOString() }),
                        ...(!req.body.check_out ? {} : { check_out: new Date(req.body.check_out.toString()).toISOString() }),
                        ...(!req.body.guests ? {} : { guests: req.body.guests }),
                        updated_at: new Date().toISOString(),
                    },
                    include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
                });
            });

            return res.status(200).json({
                data: booking,
                message: 'Successfully updated booking status',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function updateStatus(
        req: IAuthenticatedRequest<{ id: string, status: Resort_Bookings_status }>,
        res: Response<API$Types.response<bookingType | undefined>>
    ) {
        try {
            if (!(await prisma.resort_Bookings.findUnique({
                where: {
                    booking_id: parseInt(req.params.id),
                },
            }))) {
                return res.status(404).json({
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    data: undefined,
                    message: 'Unable to find booking, check if the id parameter is correct',
                    success: false
                });
            }

            const booking = await prisma.$transaction(async $trx => {
                await $trx.resort_Booking_History.create({
                    data: {
                        booking_id: parseInt(req.params.id),
                        user_id: req.user?.user_id as number,
                        status: req.params.status,
                        notes: (() => {
                            switch (req.params.status) {
                                case 'pending': return `Marcação em espera.`;
                                case 'confirmed': return `Marcação em confirmada.`;

                                default: throw new Error('Unknown or prohibited booking status');
                            }
                        })(),
                    }
                });

                return await $trx.resort_Bookings.update({
                    where: {
                        booking_id: parseInt(req.params.id),
                    },
                    data: {
                        status: req.params.status
                    },
                    include: Prisma$Utilities.Inclusions.Resort_Bookings.Data
                });
            })

            return res.status(200).json({
                data: booking,
                message: 'Successfully updated booking status',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export namespace chat {
        export async function getChatMessages(
            req: IAuthenticatedRequest<{ id: string }>,
            res: Response<API$Types.response<resortChatEntryType[] | undefined>>
        ) {
            try {
                const { id: _id } = req.params;

                const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
                const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

                const skip = (page - 1) * limit;

                const booking_id = parseInt(_id as string, 10);

                const booking = await prisma.resort_Bookings.findUnique({
                    where: { booking_id }
                });

                if (!booking) {
                    return res.status(404).json({
                        data: undefined,
                        code: 'API_GENERIC_NOT_FOUND_ERROR',
                        message: 'Booking not found',
                        success: false
                    });
                }

                const chatMessages = await prisma.resort_Chat_Messages.findMany({
                    where: { booking_id },
                    skip,
                    take: limit,
                    include: Prisma$Utilities.Inclusions.Resort_Chat_Messages.Data,
                    orderBy: { sent_at: 'asc' }
                });

                return res.json({
                    success: true,
                    message: 'Booking chat messages retrieved successfully',
                    data: chatMessages
                });

            } catch (error) {
                return handleControllerError(
                    res,
                    error
                );
            }
        }

        export async function postChatMessages(
            req: IAuthenticatedRequest<any, {
                message_text: string,
                booking_id: number
            }>,
            res: Response<API$Types.response<resortChatEntryType | undefined>>
        ) {
            const {
                message_text,
                booking_id
            } = req.body;

            const user_role = req.user!.user_role;
            const user_name = req.user!.name;
            const user_id = parseInt(`${req.user!.user_id ?? '0'}`) as number;

            let chat_message: resortChatEntryType | null = null;

            try {
                const booking = await prisma.resort_Bookings.findUnique({
                    where: { booking_id }
                });

                if (!booking) {
                    return res.status(404).json({
                        data: undefined,
                        code: 'API_GENERIC_NOT_FOUND_ERROR',
                        message: 'Booking not found',
                        success: false
                    });
                }

                chat_message = await prisma.$transaction(async $trx => {
                    try {
                        const _chat_message = await $trx.resort_Chat_Messages.create({
                            data: {
                                booking_id,
                                message_text,
                                sender_id: user_id,
                                sender_type: (user_id === booking.user_id) ? 'user' : 'resort',
                                sent_at: new Date()
                            }, include: {
                                Resort_Bookings: {
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

                        await $trx.resort_Booking_History.create({
                            data: {
                                booking_id,
                                user_id,
                                status: booking.status,
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
            }
        }
    }
};

export namespace properties {
    type addAmenitiesBodyType = string[];

    export async function addAmenities(
        req: IAuthenticatedRequest<any, addAmenitiesBodyType>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            await prisma.resort_Amenities.createMany({
                data: req.body.map(name => ({ name }))
            });

            return res.status(201).json({
                data: undefined,
                message: 'Successfully added new amenities to the resort property options',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type addBedTypesBodyType = ({
        name: number
    })[]

    export async function addBedTypes(
        req: Request<any, any, addBedTypesBodyType>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            await prisma.resort_Bed_Types.createMany({
                data: req.body.map(bed => ({
                    name: Object.entries(bed)[0] as unknown as string,
                    sleeps: Object.entries(bed)[1] as unknown as number,
                }))
            });

            return res.status(201).json({
                data: undefined,
                message: 'Successfully added new bed types to the resort property options',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function deleteProperties(
        req: IAuthenticatedRequest<{ property: resortPropertyType }>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            const tableName = (req.params.property);

            switch (tableName) {
                case 'amenity':
                    await prisma.resort_Amenities.deleteMany({
                        where: {
                            amenity_id: {
                                in: (req.query[Madeirense$Enumerators.SearchQueries.list] as string).split(',').map(parseInt)
                            }
                        }
                    });

                    break;

                case 'bedType':
                    await prisma.resort_Bed_Types.deleteMany({
                        where: {
                            bed_type_id: {
                                in: (req.query[Madeirense$Enumerators.SearchQueries.list] as string).split(',').map(parseInt)
                            }
                        }
                    });

                    break;

                default:
                    break;
            }

            return res.status(200).json({
                data: undefined,
                message: 'Successfully removed selected amenities',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getAmenities(
        req: IAuthenticatedRequest,
        res: Response<API$Types.response<Resort_Amenities[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const [amenities, total] = await Promise.all([
                prisma.resort_Amenities.findMany({
                    skip,
                    take: limit,
                }),
                prisma.resort_Amenities.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!amenities.length ? 404 : 200).json({
                data: amenities,
                message: !amenities.length ? 'There are no registered amenities' : 'Amenities retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (amenities.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    export async function getBedTypes(
        req: IAuthenticatedRequest,
        res: Response<API$Types.response<Resort_Bed_Types[] | undefined>>
    ) {
        try {
            const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
            const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

            const skip = (page - 1) * limit;

            const [bedTypes, total] = await Promise.all([
                prisma.resort_Bed_Types.findMany({
                    skip,
                    take: limit,
                }),
                prisma.resort_Bed_Types.count()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(!bedTypes.length ? 404 : 200).json({
                data: bedTypes,
                message: !bedTypes.length ? 'There are no registered bed types' : 'Bed types retrieved successfully',
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrevious: page > 1
                },
                success: (bedTypes.length > 0),
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }

    type updateAmenityBodyType = {
        name: string,
        sleeps?: number,
    }

    export async function updateProperty(
        req: IAuthenticatedRequest<{ id: string, property: resortPropertyType }, updateAmenityBodyType>,
        res: Response<API$Types.response<undefined>>
    ) {
        try {
            switch (req.params.property) {
                case 'amenity':
                    if (await prisma.resort_Amenities.findFirst({ where: { name: req.body.name } })) {
                        return res.status(400).json({
                            data: undefined,
                            message: 'An amenity with this name already exists',
                            success: false,
                        });
                    }

                    await prisma.resort_Amenities.update({
                        where: {
                            amenity_id: parseInt(req.params.id)
                        },
                        data: {
                            name: req.body.name
                        }
                    });
                    break;

                case 'bedType':
                    if (await prisma.resort_Bed_Types.findFirst({ where: { name: req.body.name } })) {
                        return res.status(400).json({
                            data: undefined,
                            message: 'A bed type with this name already exists',
                            success: false,
                        });
                    }

                    await prisma.resort_Bed_Types.update({
                        where: {
                            bed_type_id: parseInt(req.params.id)
                        },
                        data: {
                            name: req.body.name,
                            ...((!req.body.sleeps) ? {} : {
                                sleeps: req.body.sleeps
                            })
                        }
                    });
                    break;

                default:
                    break;
            };

            return res.status(200).json({
                data: undefined,
                message: 'Successfully updated amenity name',
                success: true,
            });
        } catch (error) {
            return handleControllerError(
                res,
                error
            );
        }
    }
};