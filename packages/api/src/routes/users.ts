import { Router } from 'express';

import { body, param } from 'express-validator';

import {
    $Enums
} from '@Madeirense/database';

import {
    Madeirense$Enumerators,
    RANGES
} from '@Madeirense/shared';

import {
    API_MIN_ID_NUMBER
} from '../utilities/constants';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination,
} from '../middlewares/validation';

import * as controller from '../controllers/user';

// ***************************************************************************************************************

const acceptedUserRoles = [
    'Admin',
    'Customer',
    'Driver',
    'Staff'
] as $Enums.Users_user_role[];

const updatePayloadValidation = [
    body('name').notEmpty().withMessage('Name cannot be empty'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').isMobilePhone('any', { strictMode: true }).withMessage('Valid phone number required, it must contain a + in the phone number'),
    body('profile_photo').isURL().withMessage('Valid profile photo URL is required'),
    body('user_role').isIn(acceptedUserRoles).withMessage('A user needs to have 1 of the following roles: ' + acceptedUserRoles.join(', ')),
    Validate.Handle.error
];

const v1 = Router();

v1.post(
    '/',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isStrongPassword({
            minLength: RANGES['password-length'].min,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage(`Password length must be at least ${RANGES['password-length'].min}, must contain at least: 1 number and 1 special character`),
        body('phone').optional({ values: 'falsy' }).isMobilePhone('any', { strictMode: true }).withMessage('Valid phone number required, it must contain a + in the phone number'),
        body('user_role').optional({ values: 'falsy' }).isIn(['Customer', 'Admin', 'Driver', 'Staff'] as $Enums.Users_user_role[]).withMessage('A user needs to have 1 of the following roles: ' + ['Customer', 'Admin', 'Driver', 'Staff'].join(', ')),
        Validate.Handle.error
    ],
    controller.create
);

v1.use(validateJWT as any); // ========================================================================

v1.get(
    '/',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validatePagination,
    [
        param('name').optional({ values: 'falsy' }).isString().withMessage('Name is required'),
        param('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email is required'),
        param('phone').optional({ values: 'falsy' }).isMobilePhone('any', { strictMode: true }).withMessage('Valid phone number required, it must contain a + in the phone number'),
        param(Madeirense$Enumerators.SearchQueries.roles).optional({ values: 'falsy' }).isArray({ min: 1 }),
        param(`${Madeirense$Enumerators.SearchQueries.roles}.*`).isIn(Object.values($Enums.Users_user_role)).withMessage('A user only has 1 of the following roles: ' + Object.values($Enums.Users_user_role).join(', ')),
        Validate.Handle.error
    ],
    controller.getUsers
);

v1.get(
    '/profile',
    controller.getProfile as any
);

v1.patch(
    '/profile',
    updatePayloadValidation,
    controller.updateProfile as any
);

v1.put(
    '/profile',
    updatePayloadValidation,
    controller.updateProfile as any
);

v1.get(
    '/profile/favorites',
    controller.getUserFavorites as any
);

v1.post(
    '/profile/favorites/save',
    [
        body('product_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Product ID is required'),
        Validate.Handle.error
    ],
    controller.favoriteProduct as any
);

v1.delete(
    '/profile/favorites/remove/:id',
    validateId,
    controller.unfavoriteProduct as any
);

v1.delete(
    '/profile',
    controller.deleteProfile as any
);

v1.get(
    '/staff',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validatePagination,
    controller.getRestaurantStaff
);

v1.get(
    '/staff/:id',
    onlyAllowUserRoles([
        'Admin',
        'Driver',
        'Staff'
    ]) as any,
    validateId,
    controller.getStaffMember as any
);

v1.post(
    '/staff',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    controller.createStaff
);

v1.get(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Customer'
    ]) as any,
    validateId,
    controller.getUserById
);

v1.put(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    updatePayloadValidation,
    controller.update
);

v1.delete(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    controller.delete_
);

v1.post(
    '/:id/block',
    onlyAllowUserRoles([
        'Admin',
        'Customer'
    ]) as any,
    validateId,
    [
        body('expires_at').optional({ values: 'falsy' }).notEmpty().isISO8601().withMessage('Start date must be a valid ISO 8601 date').toDate().withMessage('Pass a valid expiry date'),
        body('reason').notEmpty().withMessage('You must specify a reason for blocking this user'),
        Validate.Handle.error
    ],
    controller.block as any
);

v1.get(
    '/:id/processes',
    validateId,
    controller.getOngoingProcesses
);

v1.delete(
    '/:id/unblock',
    onlyAllowUserRoles([
        'Admin',
        'Customer'
    ]) as any,
    validateId,
    controller.unblock as any
);

const userRoutes = {
    v1
};

export default userRoutes;