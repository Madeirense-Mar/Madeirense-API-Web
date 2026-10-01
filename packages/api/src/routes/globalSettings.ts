import {
    Router
} from 'express';

import {
    body,
    param
} from 'express-validator';

import {
    type Global_Settings,
    type Restaurants
} from '@Madeirense/database';

import {
    PAYMENT_TYPES
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
    validateId
} from '../middlewares/validation';

import * as controller from '../controllers/globalSettings';

// ***************************************************************************************************************

const v1 = Router();

v1.get(
    '/',
    controller.getGlobalSettings as any
);

v1.get(
    '/restaurant-theme/:restaurant_id',
    [
        param(("restaurant_id") as keyof Restaurants).isInt({ min: API_MIN_ID_NUMBER }).withMessage('ID parameter is required and should be positive integer'),
        Validate.Handle.error
    ],
    controller.getRestaurantTheme as any
);

v1.get(
    '/version',
    controller.getGlobalSettingsVersion as any
);

v1.get(
    '/eligible-payments',
    controller.getGlobalEligiblePayments as any
);

v1.use(validateJWT as any); // ========================================================================

const bodyProperties = [
    "avg_ttd",
    "avg_ttp",
    "auto_assign_driver",
    "order_threshold",
    "prep_buffer",
] as (keyof Omit<Global_Settings, "setting_id">)[];

v1.patch(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField(bodyProperties, `Requires at least one of the fields ${bodyProperties.join(', or')}`),
        body('avg_ttd').optional({ values: "falsy" }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid average time to delivery is required, it\'s a positive integer'),
        body('avg_ttp').optional({ values: "falsy" }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid average time to prepare is required, it\'s a positive integer'),
        body('order_threshold').optional({ values: "falsy" }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid order warning threshold is required, it\'s a positive integer'),
        body('prep_buffer').optional({ values: "falsy" }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid preparation time buffer is required, it\'s a positive integer'),
        Validate.Handle.error
    ],
    controller.updateGlobalSettings as any
);

v1.post(
    '/:id/eligible-payments',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    [
        body('payments').isArray({ min: 1 }).withMessage(`Array must have at least 1 accepted payment type.`),
        body('payments.*').isIn(PAYMENT_TYPES).withMessage(`Accepted payment types: ${PAYMENT_TYPES.join(", ")}`),
        Validate.Handle.error
    ],
    controller.updateEligiblePayments as any
);

const globalSettingsRoutes = {
    v1
};

export default globalSettingsRoutes;