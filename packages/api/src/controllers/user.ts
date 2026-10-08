import {
    type CookieOptions,
    type Request,
    type Response
} from 'express';

import { randomUUID } from 'crypto';

import {
    $Enums,
    Prisma,
    type Blocked_Users,
    type Orders,
    type Users,
    type Workstations
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    generateRandomNumbers,
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type authenticatedProfileType,
    type platformType,
    type staffMemberType,
    type tokenObjectType
} from "@Madeirense/shared";

import {
    API_MAX_TIME_REFRESH_TOKEN,
    API_MAX_TIME_SESSION_TOKEN
} from '../utilities/constants';

import { encryptPassword } from '../utilities/functions';
import { generateToken } from '../utilities/generators';
import { Prisma$Utilities } from '../utilities/ORM';

import { prisma } from '../lib/prisma';

import { handleControllerError } from './utilities/handlers';

import { login$Dry } from './authentication';
import { clearCart$Dry } from './cart';

import UsersEventEmitter from '../events/user';

import type { IAuthenticatedRequest } from '../interfaces';
import type { IEventfulRequest } from '../middlewares/events';
import { DEFAULT_COOKIES_OPTIONS } from './utilities/constants';

// ***************************************************************************************************************

type createUserPayloadType = { 
    name: string, 
    email: string, 
    phone: string, 
    user_role: $Enums.Users_user_role, 
    profile_photo: string, 
    password: string
};

async function $delete(user: Users, emitter?: typeof UsersEventEmitter) {
    const REF = randomUUID();

    await prisma.$transaction(async $trx => {
        await $trx.credentials.delete({
            where: { email: user.email }
        });

        await $trx.blocked_Users.deleteMany({
            where: {
                blocked_user_id: user.user_id
            }
        });

        await $trx.push_Notification_Subscriptions.deleteMany({
            where: {
                user_id: user.user_id
            }
        });

        await $trx.notifications.deleteMany({
            where: {
                user_id: user.user_id
            }
        });

        await $trx.delivery_Locations.updateMany({
            where: {
                user_id: user.user_id
            },
            data: {
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

        await $trx.users.update({
            where: {
                user_id: user.user_id
            },
            data: {
                name: `FANTASMA_#${REF}`,
                email: `${REF}@madeirenseangola.com`,
                phone: `${generateRandomNumbers(9)}`,
                user_role: "Ghost",
                profile_photo: null
            }
        });

        emitter?.emit("user.deleted", user);
    });

    return true;
};

export async function block(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<undefined>>
) {
    const user_id = req.user!.user_id;
    const user_role = req.user!.user_role;
    const { expires_at, reason } = req.body;

    const id = parseInt(`${req.params.id}`, 10);

    let user: Users | null = null;

    try {
        user = await prisma.users.findUnique({
            where: { user_id: id }
        });

        if (!user) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User not found',
                success: false
            });
        }

        await prisma.blocked_Users.create({
            data: {
                expires_at,
                reason,
                blocked_user_id: id,
                blocked_by_id: user_id,
                blocked_by_type: (() => {
                    switch (user_role) {
                        case "Admin": return "admin";
                        case "Staff": return "restaurant";

                        default: throw new Error("Only admin and staff can block users");
                    }
                })()
            }
        });

        return res.json({
            data: undefined,
            message: 'User blocked successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!user) return;

        if (user_role === "Driver") req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");

        req.events?.users.emit("user.Blocked_Users.created", user);
    }
};

export async function create$Dry(
    { name, email, phone, user_role, profile_photo, password }: createUserPayloadType,
    emitter?: typeof UsersEventEmitter
) {
    return await prisma.$transaction(async $trx => {
        try {
            const existingUser = await prisma.users.findUnique({
                where: { email }
            });

            if (existingUser) throw new Error('User with this email already exists');

            const user = await $trx.users.create({
                data: {
                    name,
                    email,
                    phone,
                    user_role: user_role || 'Customer',
                    profile_photo
                },
                include: {
                    ...Prisma$Utilities.Inclusions.Users.Profile
                }
            });

            await $trx.credentials.create({
                data: {
                    email,
                    hash: encryptPassword(password)
                },
                select: {
                    email: true,
                    hash: true
                }
            });

            emitter?.emit("user.created", user);

            return user;
        } catch (error) {
            throw new Error(`Unable to create user: ${(error as Error).message}`);
        }
    });
};

export async function create(
    req: IEventfulRequest<any, createUserPayloadType>,
    res: Response<API$Types.response<authenticatedProfileType | undefined>>
) {
    let tokens: Partial<tokenObjectType> = {};

    const platform: platformType = req.headers[API$Enumerators.Headers.platform] as platformType ?? "web";

    const {
        name,
        email,
        phone,
        user_role,
        profile_photo,
        password
    } = req.body;

    let user: authenticatedProfileType | null = null;

    try {
        const existingUser = await prisma.users.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User with this email already exists',
                success: false
            });
        }

        user = await prisma.$transaction(async $trx => {
            try {
                const user = await $trx.users.create({
                    data: {
                        name,
                        email,
                        phone,
                        user_role: user_role || 'Customer',
                        profile_photo
                    },
                    include: Prisma$Utilities.Inclusions.Users.Profile
                });

                await $trx.credentials.create({
                    data: {
                        email,
                        hash: encryptPassword(password)
                    },
                    select: {
                        email: true,
                        hash: true
                    }
                });

                return user;
            } catch (error) {
                throw new Error(`Unable to create Users: ${(error as Error).message}`);
            }
        });

        await login$Dry(req);

        const [
            sessionToken,
            refreshToken
        ] = [
                generateToken(user, "SESSION"),
                generateToken(user, "REFRESH")
            ];

        switch (platform) {
            case "mobile":
                tokens = {
                    sessionToken,
                    refreshToken
                };

                break;

            default:
                res.cookie('sessionToken', sessionToken, DEFAULT_COOKIES_OPTIONS);
                res.cookie('refreshToken', refreshToken, { 
                    ...DEFAULT_COOKIES_OPTIONS, 
                    maxAge: API_MAX_TIME_REFRESH_TOKEN 
                });

                break;
        };

        return res.status(201).json({
            data: user,
            message: 'User created successfully',
            success: true,
            ...tokens
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!user) return;

        if (user.user_role === "Driver") req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");

        req.events?.users.emit("user.created", user);
    }
};

export async function createStaff(
    req: IEventfulRequest,
    res: Response<API$Types.response<staffMemberType & { password: string } | undefined>>
) {
    const {
        name,
        email,
        phone,
        user_role,
        profile_photo,
        restaurant_id: rId
    } = req.body;

    const restaurant_id = parseInt(rId);

    let workstation: staffMemberType | null = null;

    try {
        const password = encryptPassword(`${generateRandomNumbers(6)}`);

        const { user_id } = await create$Dry({
            name,
            email,
            phone,
            user_role,
            profile_photo,
            password
        }, req.events?.users);

        workstation = await prisma.workstations.create({
            data: {
                restaurant_id,
                user_id,
                created_at: new Date()
            },
            include: {
                Users: {
                    include: {
                        Blocked_Users: true
                    }
                },
                Restaurants: {
                    include: {
                        Delivery_Locations: true,
                        Restaurant_Hours: true
                    }
                }
            }
        })

        return res.status(201).json({
            success: true,
            message: 'Staff user created successfully',
            data: { ...workstation, password },
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!workstation) return;

        if (workstation.Users.user_role === "Driver") req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");

        req.events?.workstations.emit("workstation.Users.created", workstation);
    }
};

export async function delete_(
    req: IEventfulRequest,
    res: Response<API$Types.response<undefined>>
) {
    let user: Users | null = null;

    try {
        const id = parseInt(`${req.params.id}`, 10);

        user = await prisma.users.findUnique({
            where: { user_id: id }
        });

        if (!user) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User not found',
                success: false,
            });
        }

        await $delete(user, req.events?.users);

        return res.status(204).json({
            data: undefined,
            message: 'User deleted successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if ([
            !user,
            user?.user_role !== "Driver"
        ].includes(true)) return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
    }
};

export async function deleteProfile(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<undefined>>
) {
    try {
        await clearCart$Dry(req.user?.user_id as number, "all");

        await $delete(req.user!, req.events?.users);

        ['sessionToken', 'refreshToken'].forEach(key => res.cookie(key, '', { httpOnly: true, maxAge: 1 }));

        return res.json({
            data: undefined,
            message: 'Account deleted successfully. Goodbye!',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (req.user?.user_role !== "Driver") return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
    }
};

export async function getOngoingProcesses(
    req: Request<{ id: string }>,
    res: Response<API$Types.response<any | undefined>>
) {
    const { id: _id } = req.params;

    const id = parseInt(`${_id}`, 10);

    try {
        const processes = await prisma.$transaction(async $trx => {
            let deliveries: Orders[] | Error;

            try {
                deliveries = await $trx.orders.findMany({
                    where: {
                        AND: [
                            { courier_id: id },
                            { status: "assigned" },
                        ]
                    }
                });
            } catch (error) {
                deliveries = new Error((error as Error).message);
            }

            return {
                reports: {
                    deliveries: deliveries instanceof Error ? deliveries : null
                },
                processes: {
                    deliveries: deliveries instanceof Error ? [] : deliveries
                }
            };
        });

        return res.json({
            data: processes,
            message: 'Users retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getProfile(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<authenticatedProfileType | undefined>>
) {
    try {
        const user = await prisma.users.findUnique({
            where: { user_id: req.user!.user_id },
            include: Prisma$Utilities.Inclusions.Users.Profile
        });

        return res.json({
            data: user,
            message: 'Profile retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getRestaurantStaff(
    req: Request,
    res: Response<API$Types.response<(Workstations & { Users: Users & { Blocked_Users: Blocked_Users[] } })[] | undefined>>
) {
    try {
        const _restaurant_id = req.query[Madeirense$Enumerators.SearchQueries.restaurant_id];
        const restaurant_id = !_restaurant_id ? undefined : parseInt(_restaurant_id as string);

        const search = req.query[API$Enumerators.SearchQueries.search] || undefined;
        const user_role = req.query.user_role as $Enums.Users_user_role || undefined;

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where = {
            ...(!restaurant_id ? {} : { restaurant_id }),
            NOT: [
                { Users: { user_role: "Ghost" } }
            ]
        } as Prisma.WorkstationsWhereInput;

        let [users, total] = await Promise.all([
            prisma.workstations.findMany({
                where,
                skip,
                take: limit,
                include: {
                    Users: {
                        include: {
                            Blocked_Users: true
                        }
                    },
                }
            }),
            prisma.workstations.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        users = users
            .filter(({ Users }) => !search ? true : [Users.email, Users.name, Users.phone].some(s => s.includes(search as string)))
            .filter(({ Users }) => !user_role ? true : Users.user_role === user_role);

        return res.status(!users.length ? 404 : 200).json({
            message: !users.length ? 'No staff was found' : 'Users retrieved successfully',
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (users.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getStaffMember(
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<staffMemberType | undefined>>
) {
    try {
        const { id: _id } = req.params;

        if (!_id) throw new Error("User Id is required");

        const user_id = parseInt(_id, 10);

        const user = await prisma.workstations.findFirst({
            where: {
                user_id,
                NOT: [
                    { Users: { user_role: "Ghost" } }
                ]
            },
            include: {
                Users: {
                    include: {
                        Blocked_Users: true
                    }
                },
                Restaurants: {
                    include: {
                        Delivery_Locations: true,
                        Restaurant_Hours: true
                    }
                }
            }
        });

        return res.json({
            data: user,
            message: 'Staff member retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    };
};

export async function getUsers(
    req: Request,
    res: Response<API$Types.response<any | undefined>>
) {
    try {
        const roles = ([] as $Enums.Users_user_role[]).concat((req.query[Madeirense$Enumerators.SearchQueries.roles] as $Enums.Users_user_role[]) || []);

        const page = parseInt((req.query[API$Enumerators.SearchQueries.page] as string) ?? '1');
        const limit = parseInt((req.query[API$Enumerators.SearchQueries.limit] as string) ?? DEFAULT_API_LIST_LIMIT.toString());

        const skip = (page - 1) * limit;

        const where = {
            ...((roles.length > 0) && { user_role: { in: roles } }),
            NOT: [
                { user_role: "Ghost" }
            ]
        } as Prisma.UsersWhereInput;

        const [users, total] = await Promise.all([
            prisma.users.findMany({
                where,
                skip,
                take: limit,
                select: {
                    user_id: true,
                    name: true,
                    email: true,
                    phone: true,
                    profile_photo: true,
                    user_role: true
                }
            }),
            prisma.users.count()
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(!users.length ? 404 : 200).json({
            message: !users.length ? 'No users were found' : 'Users retrieved successfully',
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            },
            success: (users.length > 0),
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getUserById(
    req: Request<{ id: string }>,
    res: Response<API$Types.response<Users | undefined>>
) {
    try {
        const { id: _id } = req.params;

        if (!_id) throw new Error("User Id is required");

        const id = parseInt(_id, 10);

        const user = await prisma.users.findUnique({
            where: {
                user_id: id,
                NOT: [
                    { user_role: "Ghost" }
                ]
            },
            select: {
                user_id: true,
                name: true,
                email: true,
                phone: true,
                profile_photo: true,
                user_role: true,
                email_marketing: true
            }
        });

        if (!user) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User not found',
                success: false
            });
        }

        return res.status(200).json({
            data: user,
            message: 'User retrieved successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    }
};

export async function getUserFavorites(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<({ product_id: number })[] | undefined>>
) {
    const user_id = req.user?.user_id as number;

    try {
        const favorites = await prisma.$queryRawUnsafe(`
            SELECT 
                product_id
            FROM Favorites
            WHERE user_id = ${user_id}
            ORDER BY product_id DESC
        `) as ({ product_id: number })[];

        return res.status(!favorites.length ? 404 : 200).json({
            data: favorites,
            message: !favorites.length ? 'There are no favorite products saved' : 'Successfully fetch user\'s favorite list',
            success: true,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
    }
};

export async function favoriteProduct(
    req: IAuthenticatedRequest<any, { product_id: number }>,
    res: Response<API$Types.response<({ product_id: number })[] | undefined>>
) {
    const product_id = parseInt(`${req.body.product_id}`, 10);
    const user_id = req.user?.user_id as number;

    try {
        const favorites = await prisma.$transaction(async $trx => {
            try {
                const product = await $trx.products.findUnique({
                    where: {
                        product_id,
                        delisted: false
                    }
                });

                if (!product) throw new Error("404");

                if (product.delisted) throw new Error("Cannot save a delisted product");

                await $trx.favorites.create({
                    data: {
                        user_id,
                        product_id
                    }
                });

                return await $trx.$queryRawUnsafe(`
                    SELECT
                        product_id
                    FROM Favorites
                    WHERE user_id = ${user_id}
                    ORDER BY product_id DESC
                `) as ({ product_id: number })[];
            } catch (error) {
                throw new Error(`While saving favorite: ${(error as Error).message}`);
            }
        });

        return res.status(200).json({
            data: favorites,
            message: 'Added product as favorite',
            success: true
        });
    } catch (error) {
        switch ((error as Error).message) {
            case "404": return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Product not found',
                success: false
            });

            default: return handleControllerError(
                res,
                error
            );
        }
    } finally {
    }
};

export async function unblock(
    req: IAuthenticatedRequest<{ id: string }>,
    res: Response<API$Types.response<undefined>>
) {
    const id = parseInt(`${req.params.id}`, 10);

    let user: Users | null = null;

    try {
        const blocked_user = await prisma.blocked_Users.findFirst({
            where: { blocked_user_id: id },
            include: {
                Users: true
            }
        });

        if (!blocked_user) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User not found',
                success: false
            });
        }

        user = blocked_user.Users;

        await prisma.blocked_Users.delete({
            where: {
                block_id: blocked_user.block_id
            }
        });

        return res.status(200).json({
            data: undefined,
            message: 'User unblocked successfully',
            success: true
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (!user) return;

        req.events?.users.emit("user.Blocked_Users.deleted", user);
    }
};

export async function unfavoriteProduct(
    req: IAuthenticatedRequest<any, { product_id: number }>,
    res: Response<API$Types.response<({ product_id: number })[] | undefined>>
) {
    const product_id = parseInt(`${req.params.id}`, 10);
    const user_id = req.user?.user_id as number;

    try {
        const favorites = await prisma.$transaction(async $trx => {
            try {
                const product = await $trx.products.findUnique({
                    where: {
                        product_id,
                        delisted: false
                    }
                });

                if (!product) throw new Error("404");

                await $trx.favorites.delete({
                    where: {
                        user_id_product_id: {
                            user_id,
                            product_id
                        }
                    }
                });

                return await $trx.$queryRawUnsafe(`
                    SELECT 
                        product_id
                    FROM Favorites
                    WHERE user_id = ${user_id}
                    ORDER BY product_id DESC
                `) as ({ product_id: number })[];
            } catch (error) {
                throw new Error((error as Error).message);
            }
        });

        return res.status(200).json({
            data: favorites,
            message: 'Removed product from favorites',
            success: true
        });
    } catch (error) {
        switch ((error as Error).message) {
            case "404": return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'Product not found',
                success: false
            });

            default: return handleControllerError(
                res,
                error
            );
        }
    } finally {
    }
};

export async function update(
    req: IEventfulRequest<{ id: string }, Partial<createUserPayloadType>>,
    res: Response<API$Types.response<Partial<Users> | undefined>>
) {
    try {
        const { id: _id } = req.params;

        const { name, email, phone, user_role, profile_photo } = req.body;

        if (!_id) throw new Error("User Id is required");

        const id = parseInt(_id, 10);

        const existingUser = await prisma.users.findUnique({
            where: { user_id: id, NOT: [{ user_role: "Ghost" }] }
        });

        if (!existingUser) {
            return res.status(404).json({
                code: 'API_GENERIC_NOT_FOUND_ERROR',
                data: undefined,
                message: 'User not found',
                success: false
            });
        }

        if (email && email !== existingUser.email) {
            const emailExists = await prisma.users.findUnique({
                where: { email }
            });

            if (emailExists) {
                return res.status(400).json({
                    code: 'BAD_REQUEST',
                    data: undefined,
                    message: 'Email already in use',
                    success: false
                });
            }
        }

        const $PARTIAL = {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(user_role && { user_role }),
            ...(profile_photo && { profile_photo })
        };

        const updatedUser = await prisma.users.update({
            where: { user_id: id },
            data: $PARTIAL,
            select: {
                user_id: true,
                name: true,
                email: true,
                phone: true,
                profile_photo: true,
                user_role: true
            }
        });

        return res.json({
            success: true,
            message: 'User updated successfully',
            data: req.method === "PATCH" ? $PARTIAL : updatedUser
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if ((req.body.user_role as $Enums.Users_user_role) !== "Driver") return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
    }
};

export async function updateProfile(
    req: IAuthenticatedRequest<{ id: string }, Partial<createUserPayloadType>>,
    res: Response<API$Types.response<Partial<Users> | undefined>>
) {
    try {
        // SECURITY FIX (2026-09-30): this is the self-service `PATCH/PUT
        // /v1/users/profile` handler — any authenticated user of any role
        // can call it on themselves (routes/users.ts only gates it behind
        // validateJWT, not onlyAllowUserRoles). The route's shared
        // validator (updatePayloadValidation, also used by the
        // admin-only `PUT /:id` -> update() above) still requires a
        // `user_role` field in the body, but it must never be *applied*
        // here — doing so let any logged-in Customer PATCH their own
        // profile with `user_role: "Admin"` and self-escalate. `user_role`
        // is deliberately destructured and then dropped rather than
        // spread into $PARTIAL; admin-driven role changes still go
        // through update() (PUT /:id), which is role-gated at the route.
        const { name, phone, profile_photo } = req.body;

        const $PARTIAL = {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(profile_photo && { profile_photo })
        };

        const updatedUser = await prisma.users.update({
            where: { user_id: req.user!.user_id },
            data: $PARTIAL,
            select: {
                user_id: true,
                name: true,
                email: true,
                phone: true,
                profile_photo: true,
                user_role: true
            }
        });

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: (req.method === "PATCH") ? $PARTIAL : updatedUser
        });
    } catch (error) {
        return handleControllerError(
            res,
            error
        );
    } finally {
        if (req.user?.user_role !== "Driver") return;

        req.events?.global_settings.SILENT$emit("global_settings.change_version.updated");
    }
};