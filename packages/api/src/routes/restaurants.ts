import { Router } from 'express';

import {
    body
} from 'express-validator';

import {
    type Restaurants
} from '@Madeirense/database';

import {
    API_MAX_TEXT_REQUEST_LENGTH
} from '../utilities/constants';

import {
    onlyAllowUserRoles,
    validateJWT,
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination
} from '../middlewares/validation';

import * as controller from '../controllers/restaurant';

// ***************************************************************************************************************

export const partialRestaurantValidation = [
    body('thumbnail_url').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
];

export const upsertValidation = [
    body('name').notEmpty().withMessage('Restaurant name is required'),
    body('ttp').isInt({ min: 0 }).withMessage(`Time to preparation must be an integer above 0 minutes`),
    body('ttd').isInt({ min: 0 }).withMessage(`Time to destination must be an integer above 0 minutes`),
    ...Validate.Body.location(true),
    ...Validate.Body.schedule(true),
    ...partialRestaurantValidation,
    Validate.Handle.error
];

const v1 = Router();

v1.get(
    '/',
    validatePagination,
    controller.getAllRestaurants as any
);

v1.get(
    '/:id',
    validateId,
    controller.getRestaurantById
);

v1.get(
    '/:id/products',
    validateId,
    validatePagination,
    controller.getRestaurantProducts
);

v1.get(
    '/:id/events',
    validateId,
    validatePagination,
    controller.getRestaurantEvents
);

v1.use(validateJWT as any); // ========================================================================

v1.get(
    '/drivers/all',
    validatePagination,
    controller.getAllAvailableDrivers
);

v1.get(
    '/:id/drivers',
    validatePagination,
    validateId,
    controller.getAvailableDrivers
);

v1.post(
    '/',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    upsertValidation,
    controller.createRestaurant
);

v1.patch(
    '/batch',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    [
        Validate.Body.Custom.requireAtLeastOneField(['name', 'thumbnail_url', 'schedule', 'ttd', 'ttp'] as (keyof Restaurants)[]),
        body('name').optional({ values: 'falsy' }).isString().withMessage('Must be valid string name'),
        body('ttp').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage(`Time to preparation must be an integer above 0 minutes`),
        body('ttd').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage(`Time to destination must be an integer above 0 minutes`),
        ...Validate.Body.schedule(),
        ...partialRestaurantValidation,
        Validate.Handle.error
    ],
    controller.BATCH$updateRestaurants
);

v1.patch(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField(['name', 'location', 'thumbnail_url', 'schedule', 'ttd', 'ttp'] as (keyof Restaurants)[]),
        body('name').optional({ values: 'falsy' }).isString().withMessage('Must be valid string name'),
        body('ttp').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage(`Time to preparation must be an integer above 0 minutes`),
        body('ttd').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage(`Time to destination must be an integer above 0 minutes`),
        ...Validate.Body.location(),
        ...Validate.Body.schedule(),
        ...partialRestaurantValidation,
        Validate.Handle.error
    ],
    controller.updateRestaurant
);

v1.put(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    upsertValidation,
    controller.updateRestaurant
);

v1.delete(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    controller.deleteRestaurant
);

const restaurantRoutes = {
    v1
};

export default restaurantRoutes;
