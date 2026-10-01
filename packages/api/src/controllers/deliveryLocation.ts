import {
    type Response
} from 'express';

import {
    Prisma,
    type Delivery_Locations
} from '@Madeirense/database';

import { prisma } from '../lib/prisma';

import {
    handleControllerError
} from './utilities/handlers';

import {
    DEFAULT_API_LIST_LIMIT,
    API$Enumerators,
    isInvalidValue,
    type API$Types
} from '@Madeirense/shared';

import type {
    IAuthenticatedRequest
} from '../interfaces';
import { convertDecimals } from 'utilities/converters';

// ***************************************************************************************************************

export const getAll = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<any | undefined>>
) => {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const _selected = req.query.selected || undefined;

        const selected = (
            (_selected)
                ? []
                : (Array.isArray(_selected)
                    ? _selected
                    : [_selected]
                ) as string[]
        );

        const where: Prisma.Delivery_LocationsWhereInput = {
            location_id: {
                in: selected.map(parseInt)
            }
        };

        const [locations, total] = await Promise.all([
            prisma.delivery_Locations.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.delivery_Locations.count({})
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            success: true,
            message: 'All delivery locations retrieved successfully',
            data: locations.map(convertDecimals),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getUserDeliveryLocations = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<Delivery_Locations[] | undefined>>
) => {
    try {
        const user_id = req.user!.user_id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || DEFAULT_API_LIST_LIMIT;
        const skip = (page - 1) * limit;

        const [locations, total] = await Promise.all([
            prisma.delivery_Locations.findMany({
                where: { user_id },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.delivery_Locations.count({
                where: { user_id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: locations.map(convertDecimals),
            message: 'Delivery locations retrieved successfully',
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

export const createDeliveryLocation = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<any | undefined>>
) => {
    try {
        const {
            address,
            city,
            postal_code,
            latitude,
            longitude,
            name,
            country,
            special_instructions = null,
            street_number = null,
            street_name = null,
            neighborhood = null,
            state = null
        } = req.body;

        const user_id = req.user!.user_id;

        const location = await prisma.delivery_Locations.create({
            data: {
                user_id,
                address,
                city,
                postal_code,
                name,
                country,
                special_instructions,
                latitude: latitude ? parseFloat(latitude) : 0,
                longitude: longitude ? parseFloat(longitude) : 0,
                street_number,
                street_name,
                neighborhood,
                state,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Delivery location created successfully',
            data: convertDecimals(location)
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getDeliveryLocationById = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<Delivery_Locations | undefined>>
) => {
    try {
        const {
            id: _id
        } = req.params;

        const user_id = req.user!.user_id;

        const id = parseInt(_id as string, 10);

        const location = await prisma.delivery_Locations.findUnique({
            where: {
                location_id: id
            }
        });

        switch (true) {
            case (isInvalidValue(location)): return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Delivery location not found',
                success: false
            });

            case (location?.user_id !== user_id): return res.status(403).json({
                data: undefined,
                code: 'FORBIDDEN',
                message: 'Access denied',
                success: false
            });

            default: return res.json({
                success: true,
                message: 'Delivery location retrieved successfully',
                data: convertDecimals(location)
            });
        };

    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const updateDeliveryLocation = async (
    req: IAuthenticatedRequest<
        { id: string },
        {
            location_id: number,
            user_id: number
        } & Partial<Delivery_Locations>
    >,
    res: Response<API$Types.response<any | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const { user_id: uId, location_id, ...delivery_location } = req.body;

        const user_id = req.user!.user_id;

        const id = parseInt(_id as string, 10);

        const existingLocation = await prisma.delivery_Locations.findUnique({
            where: { location_id: id }
        });

        if (!existingLocation) {
            return res.status(404).json({
                data: undefined,
                message: 'Delivery location not found',
                success: false
            });
        }

        if (existingLocation.user_id !== user_id) {
            return res.status(403).json({
                data: undefined,
                message: 'Access denied',
                success: false
            });
        }

        const data = convertDecimals(await prisma.$transaction(async $trx => {
            try {
                if (delivery_location.preferred) await $trx.delivery_Locations.updateMany({
                    where: { user_id },
                    data: { preferred: false }
                });

                return await $trx.delivery_Locations.update({
                    where: { location_id: id },
                    data: {
                        ...(delivery_location as Omit<Delivery_Locations, ("user_id" | "location_id")>),
                        updated_at: new Date()
                    }
                });
            } catch (error) {
                throw new Error((error as Error).message);
            }
        }));

        return res.json({
            data,
            message: 'Delivery location updated successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const deleteDeliveryLocation = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const user_id = req.user!.user_id;

        const id = parseInt(_id as string, 10);

        const location = await prisma.delivery_Locations.findUnique({
            where: { location_id: id }
        });

        if (!location) return res.status(404).json({
            data: undefined,
            message: 'Delivery location not found',
            success: false,
        });

        if (location.user_id !== user_id) return res.status(403).json({
            data: undefined,
            message: 'Access denied',
            success: false
        });

        const SYSTEM$USER = await prisma.users.findFirst({
            where: { user_role: "System" }
        });

        if (!SYSTEM$USER) return res.status(500).json({
            data: undefined,
            message: 'Unable to locate system user to make address attribution',
            success: false
        });

        await prisma.delivery_Locations.updateMany({
            where: {
                location_id: location.location_id
            },
            data: {
                user_id: SYSTEM$USER.user_id,
                address: '',
                latitude: 0,
                longitude: 0,
                special_instructions: null,
                street_number: null,
                name: '',
                street_name: null,
                postal_code: ''
            }
        });

        return res.status(204).json({
            data: undefined,
            message: 'Delivery location deleted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};