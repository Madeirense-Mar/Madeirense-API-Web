import { Router } from 'express';

import {
    body,
    query
} from 'express-validator';

import {
    type Coupons
} from '@Madeirense/database';

import {
    type Madeirense$Types
} from '@Madeirense/shared';

import {
    API_MIN_ID_NUMBER
} from '../utilities/constants';

import {
    validateJWT,
    onlyAllowUserRoles
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination
} from '../middlewares/validation';

import * as controller from '../controllers/coupon';

// ***************************************************************************************************************

const expiryDateTimeValidation = (value: any) => {
    if (!value.expires_at) return true;

    const expires_at = new Date(value.expires_at);

    if (expires_at < new Date()) throw new Error('Expiry date cannot be in the past');

    return true;
};

const idArrayValidation = [
    body('coupon_ids').isArray({ min: 1 }).withMessage('Must pass a list of coupon ids to update'),
    body('coupon_ids.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid coupon ID is required'),
];

const couponPayload = [
    body('code').notEmpty().withMessage('Coupon code is required'),
    body('discount').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid discount is required'),
    body('expires_at').isISO8601().withMessage('Valid expiration date is required'),
    body().custom(expiryDateTimeValidation),
    Validate.Handle.error
];

const v1 = Router();

v1.get(
    '/',
    validatePagination,
    [
        query("valid" as (keyof Madeirense$Types.searchQueryRecord)).optional({ values: 'falsy' }).isIn(["true"]).withMessage("Send `valid` with the value of `true` to filter coupon lists with strictly non-expired entries."),
        Validate.Handle.error
    ],
    controller.getAllCoupons as any
);

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/validate',
    [
        body('code').notEmpty().withMessage('Coupon code is required'),
        Validate.Handle.error
    ],
    controller.validateCoupon
);

v1.get(
    '/:id',
    validateId,
    controller.getCouponById
);

v1.post(
    '/',
    onlyAllowUserRoles(['Admin']) as any,
    couponPayload,
    controller.createCoupon
);

v1.patch(
    '/batch/expire',
    onlyAllowUserRoles(['Admin']) as any,
    [
        ...idArrayValidation,
        Validate.Handle.error
    ],
    controller.BATCH$expire
);

v1.patch(
    '/batch/renew',
    onlyAllowUserRoles(['Admin']) as any,
    [
        ...idArrayValidation,
        body('expires_at').isISO8601().withMessage('Valid expiration date is required'),
        body().custom(expiryDateTimeValidation),
        Validate.Handle.error
    ],
    controller.BATCH$renewExpiryDate
);

const requiredProperties = [
    'code',
    'discount',
    'expires_at'
] as (keyof Coupons)[];

v1.patch(
    '/:id',
    onlyAllowUserRoles(['Admin']) as any,
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField(
            requiredProperties,
            `Requires at least one of the fields ${requiredProperties.join(', or')}`
        ),
        body().custom(expiryDateTimeValidation),
        Validate.Handle.error
    ],
    controller.updateCoupon
);

v1.put(
    '/:id',
    onlyAllowUserRoles(['Admin']) as any,
    validateId,
    couponPayload,
    controller.updateCoupon
);

v1.delete(
    '/:id',
    onlyAllowUserRoles(['Admin']) as any,
    validateId,
    controller.deleteCoupon
);

const couponRoutes = {
    v1
};

export default couponRoutes;