import { Router } from 'express';

import {
    body,
    query
} from 'express-validator';

import {
    type Delivery_Locations
} from '@Madeirense/database';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination
} from '../middlewares/validation';

import {
    API_MIN_ID_NUMBER
} from '../utilities/constants';

import * as controller from '../controllers/deliveryLocation';

// ***************************************************************************************************************

export const deliveryLocationPayloadValidation = [
    body('address').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('country').notEmpty().withMessage('Country is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is require'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required, value must be between -90/90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid latitude required, value must be between -180/180'),
    body('preferred').isBoolean().withMessage('Make sure the value is boolean'),
    body('postal_code').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
    body('special_instructions').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
    body('street_name').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
    body('street_number').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
    Validate.Handle.error
];

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.get(
    '/all',
    onlyAllowUserRoles([
        'Admin',
        'System'
    ]) as any,
    [
        ...Validate.Queries.pagination,
        // Optional id filter: `?selected=1&selected=2` (a single `?selected=1` is normalised to an array).
        query('selected').optional({ values: 'falsy' }).toArray(),
        query('selected.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Each selected delivery location must be a valid ID, meaning a positive integer'),
        Validate.Handle.error
    ],
    controller.getAll as any
);

v1.get(
    '/',
    validatePagination,
    controller.getUserDeliveryLocations as any
);

v1.post(
    '/',
    deliveryLocationPayloadValidation,
    controller.createDeliveryLocation as any
);

v1.get(
    '/:id',
    validateId,
    controller.getDeliveryLocationById as any
);

v1.patch(
    '/:id',
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField([
            'address',
            'city',
            'country',
            'postal_code',
            'latitude',
            'longitude',
            'name',
            'neighborhood',
            'postal_code',
            'preferred',
            'special_instructions',
            'state',
            'street_name',
            'street_number'
        ] as (keyof Delivery_Locations)[]),
        body('address').optional({ values: 'falsy' }).isString().withMessage('Valid address is required'),
        body('city').optional({ values: 'falsy' }).isString().withMessage('Valid city is required'),
        body('country').optional({ values: 'falsy' }).isString().withMessage('Valid country is required'),
        body('name').optional({ values: 'falsy' }).isString().withMessage('Valid delivery location name is required'),
        body('city').optional({ values: 'falsy' }).isString().withMessage('Valid city is required'),
        body('state').optional({ values: 'falsy' }).isString().withMessage('Valid state is required'),
        body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required, value must be between -90/90'),
        body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('Valid latitude required, value must be between -180/180'),
        body('preferred').optional({ values: 'falsy' }).isBoolean().withMessage('Make sure the value is boolean'),
        body('postal_code').optional({ values: 'falsy' }).isPostalCode('any').withMessage('Make sure the value is string and a valid postal code'),
        body('special_instructions').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
        body('street_name').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
        body('street_number').optional({ values: 'falsy' }).isString().withMessage('Make sure the value is string'),
        Validate.Handle.error
    ],
    controller.updateDeliveryLocation as any
);

v1.put(
    '/:id',
    validateId,
    deliveryLocationPayloadValidation,
    controller.updateDeliveryLocation as any
);

v1.delete(
    '/:id',
    validateId,
    controller.deleteDeliveryLocation as any
);

const deliveryLocationRoutes = {
    v1
};

export default deliveryLocationRoutes;