import {
    type Request,
    type Response
} from 'express';

import {
    DEFAULT_API_LIST_LIMIT,
    Carts,
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type cartedProductType,
    type cartWithProductsType,
    type cartSummaryType,
    type userCartType
} from '@Madeirense/shared';

import {
    $Enums,
    type DB$Types,
    type Cart,
    type Products
} from '@Madeirense/database';

import {
    Messages
} from './utilities/enumerators';

import {
    prisma
} from '../lib/prisma';

import {
    handleControllerError
} from './utilities/handlers';

import {
    validateCoupon$Dry
} from './coupon';

import type {
    IAuthenticatedRequest
} from '../interfaces';

// ***************************************************************************************************************

export const addToCart = async (
    req: IAuthenticatedRequest<any, {
        product_id: number,
        quantity?: number
    }>,
    res: Response<API$Types.response<cartWithProductsType | undefined>>
) => {
    let cartItem: Omit<Cart, 'product_id'>;

    let Products: Products & {
        quantity?: number
    };

    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            product_id,
            quantity
        } = req.body;

        const {
            user_id
        } = req.user;

        const product = await prisma.products.findUnique({
            where: {
                product_id
            }
        });

        if (!product) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Product not found',
            success: false
        });

        const existingCartItem = await prisma.cart.findFirst({
            where: {
                user_id,
                product_id
            }
        });

        const $productsInclusion = {
            Products: {
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
        };

        switch (true) {
            case (existingCartItem !== null): {
                const result = await prisma.cart.update({
                    where: {
                        cart_id: existingCartItem.cart_id
                    },
                    data: {
                        quantity: {
                            increment: (!quantity) ? 1 : quantity
                        }
                    },
                    include: $productsInclusion
                });

                ({
                    Products,
                    ...cartItem
                } = result);

                break;
            }

            default: {
                const result = await prisma.cart.create({
                    data: {
                        user_id,
                        product_id,
                        ...(quantity && { quantity }),
                        added_at: new Date()
                    },
                    include: $productsInclusion
                });

                ({
                    Products,
                    ...cartItem
                } = result);

                break;
            }
        };

        Products.quantity = cartItem.quantity;

        return res.status(201).json({
            success: true,
            message: 'Item added to cart successfully',
            data: {
                ...cartItem,
                Products
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const clearCart = async (
    req: IAuthenticatedRequest<{
        type: 'all' | (keyof typeof Carts)
    }>,
    res: Response<API$Types.response<DB$Types.actionCountRecord>>
) => {
    let count: number;

    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            user_id
        } = req.user;

        switch (req.params.type) {
            case 'delivery':
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id,
                        Products: {
                            product_type: {
                                in: [
                                    'beverage',
                                    'dessert',
                                    'garnish',
                                    'main',
                                    'starter'
                                ]
                            }
                        }
                    }
                }));

                break;

            case 'event':
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id,
                        Products:
                        {
                            product_type: {
                                in: [
                                    'ticket'
                                ]
                            }
                        }
                    }
                }));

                break;

            default:
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id
                    }
                }));

                break;
        };

        return res.json({
            data: {
                deletedCount: count
            },
            message: `Cart cleared successfully. ${count} items removed.`,
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const clearCart$Dry = async (
    user_id: number,
    cartType: 'all' | (keyof typeof Carts)
) => {
    try {
        let count: number;

        switch (cartType) {
            case 'delivery':
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id,
                        Products: {
                            product_type: {
                                in: [
                                    'beverage',
                                    'dessert',
                                    'garnish',
                                    'main',
                                    'starter'
                                ]
                            }
                        }
                    }
                }));

                break;

            case 'event':
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id,
                        Products:
                        {
                            product_type: {
                                in: [
                                    'ticket'
                                ]
                            }
                        }
                    }
                }));

                break;

            default:
                ({ count } = await prisma.cart.deleteMany({
                    where: {
                        user_id
                    }
                }));

                break;
        };

        return count;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
};

export const getAllCartItems = async (
    req: Request,
    res: Response<API$Types.response<any>>
) => {
    try {
        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [
            cartItems,
            total
        ] = await Promise.all([
            prisma.cart.findMany({
                skip,
                take: limit,
                include: {
                    Products: {
                        include: {
                            Restaurants: {
                                select: {
                                    restaurant_id: true,
                                    name: true,
                                    location: true
                                }
                            }
                        }
                    },
                    Users: {
                        select: {
                            user_id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { added_at: 'desc' }
            }),
            prisma.cart.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: cartItems,
            success: true,
            message: 'All cart items retrieved successfully',
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

export const getCartItemById = async (
    req: Request<{ id: string }>,
    res: Response<API$Types.response<userCartType | undefined>>
) => {
    try {
        const cartItem = await prisma.cart.findUnique({
            where: {
                cart_id: parseInt(req.params.id as string, 10)
            },
            include: {
                Products: {
                    include: {
                        Restaurants: {
                            select: {
                                restaurant_id: true,
                                name: true,
                                location: true
                            }
                        }
                    }
                },
                Users: {
                    select: {
                        user_id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!cartItem) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            success: false,
            message: 'Cart item not found'
        });

        return res.status(200).json({
            data: cartItem,
            success: true,
            message: 'Cart item retrieved successfully',
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getCartSummary$Dry = async (
    user_id: number,
    cartType: 'all' | (keyof typeof Carts),
    coupon_code?: string
): Promise<cartSummaryType> => {
    let cartItems = await prisma.cart.findMany({
        where: {
            user_id
        },
        include: {
            Products: {
                select: {
                    product_type: true,
                    price: true,
                    discount: true
                }
            }
        }
    });

    const coupon = (!coupon_code)
        ? undefined
        : await validateCoupon$Dry(coupon_code);

    switch (cartType) {
        case 'delivery':
            cartItems = cartItems.filter(p => (!p.Products.product_type)
                ? false
                : ([
                    'beverage',
                    'dessert',
                    'garnish',
                    'main',
                    'starter'
                ] as $Enums.Products_product_type[]).includes(p.Products.product_type)
            );
            break;

        case 'event':
            cartItems = cartItems.filter(p => (!p.Products.product_type)
                ? false
                : ([
                    'ticket'
                ] as $Enums.Products_product_type[]).includes(p.Products.product_type)
            );
            break;

        default:
            break;
    };

    const totalItems = cartItems.length;

    const totalPrice = cartItems.reduce((sum, item) => {
        const discount = (item.Products.discount.toNumber() || 0) + (!coupon ? 0 : coupon.discount.toNumber());

        const price = item.Products.price.toNumber();

        const finalPrice = price - (price * discount / 100);

        return sum + (finalPrice * item.quantity);
    }, 0);

    const originalPrice = cartItems.reduce((sum, item) => {
        return sum + (item.Products.price.toNumber() * item.quantity);
    }, 0);

    const totalDiscount = originalPrice - totalPrice;

    return {
        totalItems,
        originalPrice: parseFloat(originalPrice.toFixed(2)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        coupon
    };
};

export const getCartSummary = async (
    req: IAuthenticatedRequest<{
        type: (keyof typeof Carts)
    }>,
    res: Response<API$Types.response<any>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            user_id
        } = req.user;

        const coupon_code = req.query[Madeirense$Enumerators.SearchQueries.coupon_code] as string || undefined;

        let coupon = (!coupon_code)
            ? undefined
            : await validateCoupon$Dry(coupon_code);

        let cartItems = await prisma.cart.findMany({
            where: { user_id },
            include: {
                Products: {
                    select: {
                        product_type: true,
                        price: true,
                        discount: true
                    }
                }
            }
        });

        switch (req.params.type) {
            case 'delivery':
                cartItems = cartItems.filter(p => !p.Products.product_type ? false : (['beverage', 'garnish', 'dessert', 'main', 'starter'] as $Enums.Products_product_type[]).includes(p.Products.product_type));
                break;

            case 'event':
                cartItems = cartItems.filter(p => !p.Products.product_type ? false : (['ticket'] as $Enums.Products_product_type[]).includes(p.Products.product_type));
                break;

            default:
                break;
        };

        const totalItems = cartItems.length;

        const totalPrice = cartItems.reduce((sum, item) => {
            const discount = (item.Products.discount.toNumber() || 0) + (!coupon ? 0 : coupon.discount.toNumber());

            const price = item.Products.price.toNumber();

            const finalPrice = price - (price * discount / 100);

            return sum + (finalPrice * item.quantity);
        }, 0);

        const originalPrice = cartItems.reduce((sum, item) => {
            return sum + (item.Products.price.toNumber() * item.quantity);
        }, 0);

        const totalDiscount = originalPrice - totalPrice;

        return res.json({
            data: {
                totalItems,
                originalPrice: parseFloat(originalPrice.toFixed(2)),
                totalDiscount: parseFloat(totalDiscount.toFixed(2)),
                totalPrice: parseFloat(totalPrice.toFixed(2)),
                ...(coupon && { coupon })
            },
            message: `Cart (${req.params.type}) summary retrieved successfully`,
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getUserCart = async (
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<cartedProductType[]>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            user_id
        } = req.user;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const [
            cartItems,
            total
        ] = await Promise.all([
            prisma.cart.findMany({
                where: {
                    user_id
                },
                skip,
                take: limit,
                include: {
                    Products: {
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
                    added_at: 'desc'
                }
            }),
            prisma.cart.count({
                where: {
                    user_id
                }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
            data: (cartItems.map(({ Products, quantity }) => {
                return { ...Products, quantity }
            })),
            success: true,
            message: 'Cart items retrieved successfully',
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: (page < totalPages),
                hasPrevious: (page > 1)
            }
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const getUserCart$Dry = async (
    user_id: number,
    cartType: 'all' | (keyof typeof Carts)
) => {
    let cartItems = await prisma.cart.findMany({
        where: { user_id },
        include: {
            Products: {
                select: {
                    product_id: true,
                    product_type: true,
                    prep_time_minutes: true,
                    name: true,
                    description: true,
                    price: true,
                    thumbnail: true,
                    discount: true,
                    restaurant_id: true,
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
            added_at: 'desc'
        }
    });

    switch (cartType) {
        case 'delivery':
            cartItems = cartItems.filter(p => !p.Products.product_type ? false : (['beverage', 'garnish', 'dessert', 'main', 'starter'] as $Enums.Products_product_type[]).includes(p.Products.product_type));
            break;

        case 'event':
            cartItems = cartItems.filter(p => !p.Products.product_type ? false : (['ticket'] as $Enums.Products_product_type[]).includes(p.Products.product_type));
            break;

        default:
            break;
    };

    return (cartItems.map(({ Products, quantity }) => {
        return {
            ...Products,
            quantity
        }
    })) as cartedProductType[];
};

export const removeFromCart = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            user_id
        } = req.user;

        const cartItem = await prisma.cart.findUnique({
            where: {
                cart_id: parseInt(req.params.id as string),
                user_id
            }
        });

        if (!cartItem) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Cart item not found',
            success: false,
        });

        await prisma.cart.delete({
            where: {
                cart_id: parseInt(req.params.id as string)
            }
        });

        return res.json({
            data: undefined,
            message: 'Item removed from cart successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const removeFromCartByProduct = async (
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            quantity = '1'
        } = req.query;

        const {
            user_id
        } = req.user;

        const cartItem = await prisma.cart.findFirst({
            where: {
                user_id,
                ...((req.params.id) ? {
                    product_id: parseInt(req.params.id ?? '0')
                } : {})
            }
        });

        if (!cartItem) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Cart item not found',
            success: false,
        });

        console.log(req.query, cartItem);

        switch (true) {
            case (cartItem.quantity <= 1):
            case (cartItem.quantity === parseInt(quantity as string)):
                await prisma.cart.delete({
                    where: { cart_id: cartItem.cart_id }
                });

                break;

            default:
                await prisma.cart.update({
                    where: { cart_id: cartItem.cart_id },
                    data: {
                        quantity: { decrement: parseInt(quantity as string) }
                    }
                });

                break;
        }

        return res.json({
            data: undefined,
            message: 'Item removed from cart successfully',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export const removeFromCartByProducts = async (
    req: IAuthenticatedRequest<any, {
        product_ids: number[]
    }>,
    res: Response<API$Types.response<undefined>>
) => {
    try {
        if (!req.user) throw new Error(Messages.INACTIVE_SESSION);

        const {
            product_ids
        } = req.body;

        const {
            user_id
        } = req.user;

        const cartItems = await prisma.cart.findMany({
            where: {
                user_id,
                product_id: {
                    in: product_ids
                }
            }
        });

        if (!cartItems.length) return res.status(404).json({
            data: undefined,
            code: 'API_GENERIC_NOT_FOUND_ERROR',
            message: 'Cart items not found',
            success: false
        });

        const {
            count
        } = await prisma.cart.deleteMany({
            where: {
                cart_id: {
                    in: cartItems.map(({ cart_id }) => cart_id)
                }
            }
        });

        return res.json({
            data: undefined,
            message: 'Items removed from cart successfully',
            success: (count === product_ids.length),
            ...((count !== product_ids.length) ? {
                warnings: [
                    {
                        'Mismatch deletions': `Only ${count} of the ${product_ids.length} were removed`
                    }
                ]
            } : {})
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};