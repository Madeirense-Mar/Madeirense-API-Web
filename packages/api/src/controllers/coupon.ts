import {
    type Request,
    type Response
} from 'express';

import {
    Prisma,
    type Coupons,
    type DB$Types,
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    API$Enumerators,
    type API$Types
} from '@Madeirense/shared';

import { prisma } from '../lib/prisma';

import {
    handleControllerError
} from './utilities/handlers';

import {
    type IEventfulRequest
} from '../middlewares/events';
import { convertDecimals } from 'utilities/converters';

// ***************************************************************************************************************

type couponPayload = {
    code: string,
    discount: number,
    expires_at: Date
};

export const getAllCoupons = async (
    req: Request,
    res: Response<API$Types.response<Coupons[]>>
) => {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [
            coupons,
            total
        ] = await Promise.all([
            prisma.coupons.findMany({
                skip,
                take: limit,
                orderBy: {
                    expires_at: 'desc'
                }
            }),
            prisma.coupons.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            data: coupons.map(({ discount, ...c }) => ({
                discount: parseFloat(discount.toString()) as any,
                ...c
            })),
            message: 'Coupons retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: (page < totalPages),
                hasPrevious: (page > 1)
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

export const getCouponById = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<Coupons | undefined>>
) => {
    try {
        const coupon = await prisma.coupons.findUnique({
            where: {
                coupon_id: parseInt(req.params.id as string)
            }
        });

        if (!coupon) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Coupon not found',
                success: false
            });
        }

        res.json({
            data: coupon,
            message: 'Coupon retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const createCoupon = async (
    req: IEventfulRequest<any, couponPayload>,
    res: Response<API$Types.response<Coupons | undefined>>
) => {
    let coupon: Coupons | null = null;

    try {
        const {
            code,
            discount,
            expires_at
        } = req.body;

        const existingCoupon = await prisma.coupons.findUnique({
            where: {
                code
            }
        });

        if (existingCoupon) return res.status(400).json({
            data: undefined,
            code: 'BAD_REQUEST',
            message: 'Coupon code already exists',
            success: false
        });

        coupon = await prisma.coupons.create({
            data: {
                code,
                discount: parseFloat(discount.toString()),
                expires_at: new Date(expires_at),
                created_at: new Date(),
                updated_at: new Date(),
            }
        });

        res.status(201).json({
            data: coupon,
            message: 'Coupon created successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!coupon) return;

        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');
        req.events?.coupons.emit('coupon.created', coupon);
    }
};

export const updateCoupon = async (
    req: IEventfulRequest<{ id: string }, couponPayload>,
    res: Response<API$Types.response<Partial<Coupons> | undefined>>
) => {
    let coupon: Coupons | null = null;

    try {
        const {
            code,
            discount,
            expires_at
        } = req.body;

        const coupon_id = parseInt(req.params.id as string);

        const existingCoupon = await prisma.coupons.findUnique({
            where: {
                coupon_id
            }
        });

        if (!existingCoupon) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Coupon not found',
            success: false
        });

        if (code && code !== existingCoupon.code) {
            const codeExists = await prisma.coupons.findUnique({
                where: {
                    code
                }
            });

            if (codeExists) return res.status(400).json({
                data: undefined,
                code: 'BAD_REQUEST',
                message: 'Coupon code already exists',
                success: false
            });
        }

        const $partial: Partial<Coupons> = {
            ...(code && { code }),
            ...(discount && { discount: parseFloat(discount.toString()) as unknown as Prisma.Decimal }),
            ...(expires_at && { expires_at: new Date(expires_at) }),
            updated_at: new Date()
        };

        coupon = await prisma.coupons.update({
            where: {
                coupon_id
            },
            data: $partial
        });

        switch (req.method) {
            case 'PATCH':
                return res.status(206).json({
                    success: true,
                    message: 'Coupon updated successfully',
                    data: $partial
                });

            case 'PUT':
                return res.status(200).json({
                    success: true,
                    message: 'Coupon updated successfully',
                    data: coupon
                });
        }
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!coupon) return;

        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');
        req.events?.coupons.emit('coupon.updated', coupon);
    }
};

export const deleteCoupon = async (
    req: IEventfulRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    let coupon: Coupons | null = null;

    try {
        const coupon_id = parseInt(req.params.id as string);

        coupon = await prisma.coupons.findUnique({
            where: {
                coupon_id
            }
        });

        if (!coupon) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Coupon not found',
            success: false
        });

        await prisma.coupons.delete({
            where: {
                coupon_id
            }
        });

        return res.status(204).json({
            data: undefined,
            message: 'Coupon deleted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!coupon) return;

        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');
        req.events?.coupons.emit('coupon.deleted', coupon);
    }
};

export const validateCoupon = async (
    req: Request<any, any, { code: string }>,
    res: Response<API$Types.response<Omit<Coupons, (`${('created' | 'updated')}_at`)> | undefined>>
) => {
    try {
        const {
            code
        } = req.body;

        const coupon = await prisma.coupons.findUnique({
            where: {
                code
            }
        });

        if (!coupon) return res.status(404).json({
            data: undefined,
            message: 'Invalid coupon code',
            success: false
        });

        if (new Date() > coupon.expires_at) return res.status(400).json({
            data: undefined,
            message: 'Coupon has expired',
            success: false
        });

        return res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            data: convertDecimals({
                coupon_id: coupon.coupon_id,
                code: coupon.code,
                discount: coupon.discount,
                expires_at: coupon.expires_at
            })
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const validateCoupon$Dry = async (code: string): Promise<Omit<Coupons, (`${('created' | 'updated')}_at`)>> => {
    const coupon = await prisma.coupons.findUnique({
        where: {
            code
        }
    });

    if (!coupon)
        throw new Error('Invalid coupon code');

    if (new Date() > coupon.expires_at)
        throw new Error('Coupon has expired');

    return {
        coupon_id: coupon.coupon_id,
        code: coupon.code,
        discount: coupon.discount,
        expires_at: coupon.expires_at
    };
};

export const BATCH$expire = async (
    req: IEventfulRequest<any, { coupon_ids: number[] }>,
    res: Response<API$Types.response<DB$Types.actionCountRecord | undefined>>
) => {
    try {
        const {
            coupon_ids
        } = req.body;

        const existingCoupons = await prisma.coupons.findMany({
            where: {
                coupon_id: {
                    in: coupon_ids
                }
            }
        });

        if (!existingCoupons) return res.status(404).json({
            data: undefined,
            message: 'One or more supplied coupons were not found.',
            success: false
        });

        const updatedCoupons = await prisma.coupons.updateMany({
            where: {
                coupon_id: {
                    in: coupon_ids
                }
            },
            data: {
                expires_at: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: 'Coupons were expired successfully',
            data: {
                updatedCount: updatedCoupons.count
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');
        req.events?.coupons.SILENT$emit('coupon.expires_at.updated');
    }
};

export const BATCH$renewExpiryDate = async (
    req: IEventfulRequest<any, {
        coupon_ids: number[],
        expires_at: Date
    }>,
    res: Response<API$Types.response<DB$Types.actionCountRecord | undefined>>
) => {
    try {
        const {
            coupon_ids,
            expires_at
        } = req.body;

        const existingCoupons = await prisma.coupons.findMany({
            where: {
                coupon_id: {
                    in: coupon_ids
                }
            }
        });

        if (!existingCoupons) return res.status(404).json({
            data: undefined,
            message: 'One or more supplied coupons were not found.',
            success: false
        });

        const updatedCoupons = await prisma.coupons.updateMany({
            where: {
                coupon_id: {
                    in: coupon_ids
                }
            },
            data: {
                expires_at
            }
        });

        res.status(200).json({
            success: true,
            message: 'Coupons renewed successfully',
            data: {
                updatedCount: updatedCoupons.count
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        req.events?.global_settings.SILENT$emit('global_settings.change_version.updated');
        req.events?.coupons.SILENT$emit('coupon.expires_at.created');
    }
};