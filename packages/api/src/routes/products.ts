import { Router } from 'express';

import {
    body,
    query
} from 'express-validator';

import {
    $Enums
} from '@Madeirense/database';

import {
    type productGroupType
} from '@Madeirense/shared';

import {
    API_MAX_CART_ITEMS_FOR_REMOVAL,
    API_MAX_TEXT_REQUEST_LENGTH,
    API_MIN_ID_NUMBER,
    API_MIN_TEXT_REQUEST_LENGTH
} from '../utilities/constants';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination
} from '../middlewares/validation';

import * as controller from '../controllers/product';

// ***************************************************************************************************************

const groups = [
    'event',
    'menu'
] as productGroupType[];

export const queryValidation = [
    query('product_composition').optional().isIn(Object.values($Enums.Products_product_composition)).withMessage(`Product composition must be 1 of the following: ${Object.values($Enums.Products_product_composition).join(', ')}`),
    query('product_type').optional().isIn(Object.values($Enums.Products_product_type)).withMessage(`Product types must be 1 of the following: ${Object.values($Enums.Products_product_type).join(', ')}`),
    query('group').optional().isIn(groups).withMessage(`Product group must be one of type: ${groups.join(', ')}`),
    query('gt').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Greater amount than needs to be a number'),
    query('lt').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Lesser amount than needs to be a number'),
    body().custom((value) => {
        if (
            [value.gt, value.lt].every(v => v === undefined) ||
            [value.gt, value.lt].some(v => v === undefined)
        ) return true;

        if (value.gt < value.lt) throw new Error('The greater amount must be greater than the lesser amount');

        return true;
    }),
    ...validatePagination,
];

export const partialProductValidation = [
    body('restaurant_id').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Pass a valid Restaurant ID'),
    body('thumbnail').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
    body('description').optional({ values: 'falsy' }).isString().isLength({ min: API_MIN_TEXT_REQUEST_LENGTH, max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Description length must be within ${API_MIN_TEXT_REQUEST_LENGTH} - ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
    body('discount').optional({ values: 'falsy' }).isDecimal({ decimal_digits: '0,2' }).withMessage('Discount value is based on a percentage, must be within the range of 0.0 - 100.0'),
    body('prep_time_minutes').optional({ values: 'falsy' }).isInt({ min: 3 }).withMessage('Preparation time should be at least 3 minutes long'),
];

const v1 = Router();

v1.get(
    '/',
    queryValidation,
    controller.getAllProducts
);

v1.get(
    '/:id',
    validateId,
    controller.getProductById
);

v1.get(
    '/:id/comments',
    validateId,
    validatePagination,
    controller.getProductComments
);

v1.use(validateJWT as any); // ========================================================================

v1.get(
    '/filtered/delisted',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    queryValidation,
    controller.getDelistedProducts
);

v1.post(
    '/',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body('name').notEmpty().withMessage('Product name is required'),
        body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
        body('restaurant_id').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Pass a valid Restaurant ID'),
        body('thumbnail').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        body('description').optional({ values: 'falsy' }).isString().isLength({ min: API_MIN_TEXT_REQUEST_LENGTH, max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Description length must be within ${API_MIN_TEXT_REQUEST_LENGTH} - ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        body('product_composition').isIn(Object.values($Enums.Products_product_composition)).withMessage('Product composition must be one of the following: ' + Object.values($Enums.Products_product_composition).join(', ')),
        body('product_type').isIn(Object.values($Enums.Products_product_type)).withMessage('Product type must be one of the following: ' + Object.values($Enums.Products_product_type).join(', ')),
        body('discount').optional({ values: 'falsy' }).isInt({ min: 0, max: 100 }).withMessage('Discount value is based on a percentage, must be within the range of 0 - 100'),
        body('prep_time_minutes').isInt({ min: 3 }).withMessage('Preparation time should be at least 3 minutes long'),
        Validate.Handle.error
    ],
    controller.createProduct
);

v1.patch(
    '/batch/discount',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body('discount').isInt({ min: 0, max: 100 }).withMessage('Discount value is based on a percentage, must be within the range of 0 - 100'),
        body('product_ids').isArray({ min: 1, max: API_MAX_CART_ITEMS_FOR_REMOVAL }).withMessage(`Must provide 1 - ${API_MAX_CART_ITEMS_FOR_REMOVAL} product ids to have their discount value updated.`),
        body('product_ids.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid product ID is required'),
        Validate.Handle.error
    ],
    controller.addDiscounts
);

v1.patch(
    '/batch/discount/clear',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    controller.clearAllDiscounts
);

v1.patch(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField(['name', 'price', 'description', 'discount', 'thumbnail', 'restaurant_id', 'product_type', 'product_composition', 'prep_time_minutes']),
        body('name').optional({ values: 'falsy' }).isString().withMessage('Product name is required'),
        body('price').optional({ values: 'falsy' }).isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
        body('product_composition').optional({ values: 'falsy' }).isIn(Object.values($Enums.Products_product_composition)).withMessage('Product composition must be one of the following: ' + Object.values($Enums.Products_product_composition).join(', ')),
        body('product_type').optional({ values: 'falsy' }).isIn(Object.values($Enums.Products_product_type)).withMessage('Product type must be one of the following: ' + Object.values($Enums.Products_product_type).join(', ')),
        ...partialProductValidation,
        Validate.Handle.error
    ],
    controller.updateProduct
);

v1.patch(
    '/:id/recover',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    controller.recoverProduct
);

v1.put(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    [
        body('name').isString().withMessage('Product name is required'),
        body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
        body('product_composition').isIn(Object.values($Enums.Products_product_composition)).withMessage('Product composition must be one of the following: ' + Object.values($Enums.Products_product_composition).join(', ')),
        body('product_type').isIn(Object.values($Enums.Products_product_type)).withMessage('Product type must be one of the following: ' + Object.values($Enums.Products_product_type).join(', ')),
        ...partialProductValidation,
        Validate.Handle.error
    ],
    controller.updateProduct
);

v1.delete(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    controller.deleteProduct
);

const productRoutes = {
    v1
};

export default productRoutes;