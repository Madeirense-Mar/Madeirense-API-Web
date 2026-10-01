import {
    type Request,
    type Response
} from 'express';

import {
    $Enums,
    Prisma,
    type DB$Types,
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    MENU_PRODUCT_TYPES,
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type productType,
    type productCommentType,
    type productGroupType
} from '@Madeirense/shared';

import {
    handleControllerError
} from './utilities/handlers';

import { prisma } from '../lib/prisma';

import type { IEventfulRequest } from '../middlewares/events';

// ***************************************************************************************************************

export const addDiscounts = async (
    req: IEventfulRequest,
    res: Response<API$Types.response<DB$Types.actionCountRecord | undefined>>
) => {
    try {
        const { discount, product_ids } = req.body;

        const updateResponse = await prisma.products.updateMany({
            where: { product_id: { in: product_ids } },
            data: {
                discount,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Successfully added discount to products',
            data: { updatedCount: updateResponse.count }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.SILENT$emit("product.discount.created");
    }
};

export const clearAllDiscounts = async (
    req: IEventfulRequest,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        await prisma.products.updateMany({
            where: { product_type: { in: [...MENU_PRODUCT_TYPES] } },
            data: {
                discount: 0,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            data: undefined,
            message: 'Removed all discounts from menu products',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.SILENT$emit("product.discount.deleted");
    }
};

export const createProduct = async (
    req: IEventfulRequest<any, {
        name: string,
        description: string,
        price: number,
        restaurant_id?: number,
        discount?: number,
        product_composition: $Enums.Products_product_composition,
        product_type: $Enums.Products_product_type,
        prep_time_minutes: number,
        thumbnail?: string
    }>,
    res: Response<API$Types.response<productType | undefined>>
) => {
    const {
        name,
        description,
        price,
        restaurant_id = null,
        discount,
        product_composition,
        product_type,
        prep_time_minutes,
        thumbnail
    } = req.body;

    let product: productType | null = null;

    try {
        if (restaurant_id !== null) {
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
        }

        product = await prisma.products.create({
            data: {
                name,
                description,
                restaurant_id,
                thumbnail,
                prep_time_minutes,
                product_composition,
                product_type,
                delisted: false,
                price,
                discount: discount || 0,
                created_at: new Date(),
                updated_at: new Date()
            },
            ...!restaurant_id ? {} : {
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
        });

        return res.status(201).json({
            data: product,
            message: 'Product created successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!product) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.emit("product.created", product);
    }
};

export const deleteProduct = async (
    req: IEventfulRequest<{ id: string }>,
    res: Response<API$Types.response<productType & { stats: Partial<DB$Types.actionCountRecord> } | undefined>>
) => {
    const { id: _id } = req.params;

    const id = parseInt(_id as string, 10);

    let product: productType | null = null;

    try {
        product = await prisma.products.findUnique({
            where: {
                product_id: id,
                AND: [
                    { delisted: false }
                ]
            }
        });

        if (!product) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Product not found',
                success: false
            });
        }

        const [_product, stats] = await prisma.$transaction(
            async $trx => {
                try {
                    const delisted_product = await $trx.products.update({
                        where: { product_id: id },
                        data: {
                            delisted: true,
                            discount: 0
                        },
                        include: {
                            Restaurants: {
                                select: {
                                    restaurant_id: true,
                                    name: true,
                                    location: true
                                }
                            },
                            User_Comments: {
                                include: {
                                    Users: {
                                        select: {
                                            user_id: true,
                                            name: true,
                                            email: true,
                                            profile_photo: true
                                        }
                                    }
                                },
                                orderBy: { created_at: 'desc' }
                            },
                            _count: {
                                select: {
                                    User_Comments: true,
                                    Order_Items: true
                                }
                            }
                        }
                    });

                    const uc_count = await $trx.user_Comments.deleteMany({
                        where: { comment_id: { in: delisted_product.User_Comments.map(uc => uc.comment_id) } }
                    });

                    return [delisted_product, { deletedCount: uc_count.count }];
                } catch (error) {
                    throw new Error(`Unable to delisted product: ${(error as Error).message}`);
                }
            },
            {
                timeout: 30000,
                isolationLevel: "ReadCommitted"
            }
        );

        return res.json({
            success: true,
            message: 'Product delisted successfully',
            data: {
                ..._product,
                stats
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!product) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.emit("product.deleted", product);
    }
};

export const getAllProducts = async (
    req: Request,
    res: Response<API$Types.response<productType[] | undefined>>
) => {
    try {
        const group = (req.query[Madeirense$Enumerators.SearchQueries.group] as string) || undefined;
        const lesserThan = parseFloat(req.query[Madeirense$Enumerators.SearchQueries.lt] as string) || undefined;
        const greaterThan = parseFloat(req.query[Madeirense$Enumerators.SearchQueries.gt] as string) || undefined;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where = {
            product_composition: req.query.product_composition as $Enums.Products_product_composition || undefined,
            product_type: (group)
                ? {
                    in: (() => {
                        switch (group as productGroupType) {
                            case "event": return ["ticket"];
                            case "menu": return MENU_PRODUCT_TYPES;

                            default: Object.values($Enums.Products_product_type);
                        }
                    })()
                }
                : req.query.product_type as $Enums.Products_product_type || undefined
            ,
            ...(lesserThan || greaterThan) ? {
                price: {
                    greaterThanOrEqualTo: (n) => parseFloat(`${n}`) >= (lesserThan as number),
                    lessThanOrEqualTo: (n) => parseFloat(`${n}`) <= (greaterThan as number),
                }
            } : {},
            AND: [
                { delisted: false }
            ]
        } as Prisma.ProductsWhereInput;

        let [products, total] = await Promise.all([
            prisma.products.findMany({
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
                    _count: {
                        select: {
                            "User_Comments": true,
                            "Order_Items": true
                        }
                    }
                },
                orderBy: { name: 'desc' }
            }),
            prisma.products.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        products = products.map(({ price, discount, ...p }) => ({
            discount: parseFloat(discount.toString()) as any,
            price: parseFloat(price.toString()) as any,
            ...p,
        }));

        return res.status((!products.length) ? 404 : 200).json({
            data: products,
            message: (!products.length) ? 'None were found' : 'Products retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (products.length > 0)
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getDelistedProducts = async (
    req: Request,
    res: Response<API$Types.response<productType[] | undefined>>
) => {
    try {
        const group = (req.query[Madeirense$Enumerators.SearchQueries.group] as string) || undefined;
        const lesserThan = parseFloat(req.query[Madeirense$Enumerators.SearchQueries.lt] as string) || undefined;
        const greaterThan = parseFloat(req.query[Madeirense$Enumerators.SearchQueries.gt] as string) || undefined;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where = {
            product_composition: req.query.product_composition as $Enums.Products_product_composition || undefined,
            product_type: (group)
                ? {
                    in: (() => {
                        switch (group as productGroupType) {
                            case "event": return ["ticket"];
                            case "menu": return MENU_PRODUCT_TYPES;

                            default: Object.values($Enums.Products_product_type);
                        }
                    })()
                }
                : req.query.product_type as $Enums.Products_product_type || undefined
            ,
            ...(lesserThan || greaterThan) ? {
                price: {
                    greaterThanOrEqualTo: (n) => parseFloat(`${n}`) >= (lesserThan as number),
                    lessThanOrEqualTo: (n) => parseFloat(`${n}`) <= (greaterThan as number),
                }
            } : {},
            AND: [
                { delisted: true }
            ]
        } as Prisma.ProductsWhereInput;

        const [products, total] = await Promise.all([
            prisma.products.findMany({
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
                    _count: {
                        select: {
                            "User_Comments": true,
                            "Order_Items": true
                        }
                    }
                },
                orderBy: { name: 'desc' }
            }),
            prisma.products.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status((!products.length) ? 404 : 200).json({
            data: products,
            message: (!products.length) ? 'None were found' : 'Delisted products retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (products.length > 0)
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getProductById = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<productType | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const id = parseInt(_id as string, 10);

        const product = await prisma.products.findUnique({
            where: { product_id: id },
            include: {
                Restaurants: {
                    select: {
                        restaurant_id: true,
                        name: true,
                        location: true
                    }
                },
                User_Comments: {
                    include: {
                        Users: {
                            select: {
                                user_id: true,
                                name: true,
                                email: true,
                                profile_photo: true
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' }
                },
                _count: {
                    select: {
                        User_Comments: true,
                        Order_Items: true
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Product not found',
                success: false
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: product
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getProductComments = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<productCommentType[] | undefined>>
) => {
    try {
        const { id: _id } = req.params;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const id = parseInt(_id as string, 10);

        const product = await prisma.products.findUnique({
            where: {
                product_id: id,
                AND: [
                    { delisted: false }
                ]
            }
        });

        if (!product) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Product not found',
                success: false
            });
        }

        const [comments, total] = await Promise.all([
            prisma.user_Comments.findMany({
                where: { product_id: id },
                skip,
                take: limit,
                include: {
                    Users: {
                        select: {
                            user_id: true,
                            name: true,
                            profile_photo: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            prisma.user_Comments.count({
                where: { product_id: id }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!comments.length ? 404 : 200).json({
            data: comments,
            message: !comments.length ? 'None were found' : 'Product comments retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (comments.length > 0)
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const recoverProduct = async (
    req: IEventfulRequest<{ id: string }>,
    res: Response<API$Types.response<productType | undefined>>
) => {
    const { id: _id } = req.params;

    const id = parseInt(_id as string, 10);

    let product: productType | null = null;

    try {
        product = await prisma.products.update({
            where: {
                product_id: id,
                AND: [
                    { delisted: true }
                ]
            },
            data: { delisted: false },
            include: {
                Restaurants: {
                    select: {
                        restaurant_id: true,
                        name: true,
                        location: true
                    }
                },
                _count: {
                    select: {
                        User_Comments: true,
                        Order_Items: true
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Product not found or not delisted',
                success: false
            });
        }

        return res.json({
            success: true,
            message: 'Product recovered successfully',
            data: product
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!product) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.emit("product.created", product);
    }
};

export const updateProduct = async (
    req: IEventfulRequest<
        { id: string },
        Partial<{
            name: string, 
            description: string, 
            price: Prisma.Decimal, 
            discount: Prisma.Decimal, 
            thumbnail: string, 
            prep_time_minutes: number, 
            restaurant_id: number
        }>
    >,
    res: Response<API$Types.response<Partial<productType> | undefined>>
) => {
    const { id: _id } = req.params;

    const { name, description, price, discount, thumbnail, prep_time_minutes, restaurant_id: rId } = req.body;

    const id = parseInt(_id as string, 10);
    const restaurant_id = parseInt((rId ?? "0") as string, 10);

    let product: productType | null = null;

    try {
        const existingProduct = await prisma.products.findUnique({
            where: {
                product_id: id,
                AND: [
                    { delisted: false }
                ]
            }
        });

        if (!existingProduct) {
            return res.status(404).json({
                data: undefined,
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                message: 'Product not found, if you\'re trying to update a delisted product please use the appropriate method.',
                success: false
            });
        }

        if (rId !== null) {
            const existingRestaurant = await prisma.restaurants.findUnique({
                where: { restaurant_id }
            });

            if (!existingRestaurant) {
                return res.status(404).json({
                    data: undefined,
                    code: 'API_GENERIC_NOT_FOUND_ERROR',
                    message: 'Restaurant not found',
                    success: false
                });
            }
        }

        const $PARTIAL = {
            ...(name && { name }),
            ...(thumbnail && { thumbnail }),
            ...(restaurant_id && { restaurant_id }),
            ...(prep_time_minutes && { prep_time_minutes }),
            ...(description !== undefined && { description }),
            ...(price && { price }),
            ...(discount !== undefined && { discount }),
            updated_at: new Date()
        };

        product = await prisma.products.update({
            where: { product_id: id },
            data: $PARTIAL,
            include: {
                Restaurants: {
                    select: {
                        restaurant_id: true,
                        name: true,
                        location: true
                    }
                }
            }
        });

        return res.status(200).json({
            data: (req.method === "PATCH") ? $PARTIAL : product,
            message: 'Product updated successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!product) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
        req.events?.products.emit("product.updated", product);
    }
};