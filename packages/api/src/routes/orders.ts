import {
	Router
} from 'express';

import { 
	body, 
	param, 
	query
} from 'express-validator';

import { 
	$Enums
} from '@Madeirense/database';

import { 
	ACCEPTED_PAYMENT_TYPES,
	Carts, 
	type orderType
} from '@Madeirense/shared';

import { 
	API_MAX_TEXT_REQUEST_LENGTH, 
	API_MIN_ID_NUMBER, 
	API_MIN_TEXT_REQUEST_LENGTH
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

import * as controller from '../controllers/orders';

// ***************************************************************************************************************

const cartTypeValidation = [
	param('cartType').notEmpty().isIn(['all', ...Object.values(Carts)]).withMessage(`Only ${['all', ...Object.values(Carts)].join(', ')} cart types are accepted`)
];

const orderTypes = [
	'delivery',
	'ticket'
] as orderType[];

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.get(
	'/',
	onlyAllowUserRoles([
		'Admin',
		'Staff'
	]) as any,
	[
		...Validate.Queries.pagination,
		query('type').optional().isIn(orderTypes).withMessage(`Order types must be: ${orderTypes.join(' or ')}`),
		Validate.Handle.error
	],
	controller.getAllOrders as any
);

v1.post(
	'/',
	[
		body('cartType').notEmpty().isIn(['all', ...Object.values(Carts)]).withMessage(`Only ${['all', ...Object.values(Carts)].join(', ')} cart types are accepted`),
		body('restaurant_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Restaurant ID is required'),
		body('event_id').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('An event ID is a positive integer'),
		body('payment_method').isIn(ACCEPTED_PAYMENT_TYPES).withMessage(`The payment method must be one of the types: ${ACCEPTED_PAYMENT_TYPES.join(', ')}`),
		body('delivery_address').isNumeric().withMessage('Delivery location ID is required'),
		body('contact_phone').isMobilePhone('any', { strictMode: true }).withMessage('Valid phone number required, it must contain a + in the phone number'),
		body('special_instructions').optional({ values: 'falsy' }).isString().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Special instructions must be a string no longer than 500 characters'),
		Validate.Handle.error
	],
	controller.createOrder as any
);

v1.get(
	'/mine',
	[
		...Validate.Queries.pagination,
		param('type').optional().isIn(orderTypes).withMessage(`Order types must be: ${orderTypes.join(' or ')}`),
		Validate.Handle.error
	],
	controller.getMyOrders as any
);

v1.get(
	'/:id',
	validateId,
	controller.getOrderById as any
);

v1.get(
	'/:id/history',
	validateId,
	controller.getOrderHistory as any
);

v1.patch(
	'/:id/status',
	onlyAllowUserRoles([
		'Admin',
		'Driver', 
		'Staff', 
	]) as any,
	validateId,
	[
		body('status').isIn(['pending', 'confirmed', 'preparing', 'ready'] as $Enums.Orders_status[]).withMessage('Valid order status is required, cancelling, completing or assigning to a driver isn\'t allowed for this method'),
		body('notes').optional({ values: 'falsy' }).isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Notes too long'),
		Validate.Handle.error
	],
	controller.updateOrderStatus as any
);

v1.get(
	'/:id/chat-messages',
	onlyAllowUserRoles([
		'Admin',
		'Customer', 
		'Driver', 
		'Staff', 
	]) as any,
	validateId,
	validatePagination,
	controller.getOrderChatMessages as any
);

v1.post(
	'/:id/chat-messages',
	onlyAllowUserRoles([
		'Admin',
		'Customer', 
		'Driver', 
		'Staff', 
	]) as any,
	validateId,
	[
		body('order_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid order_id is required'),
		body('message_text').isString().withMessage('Must pass text to post'),
		body('message_text').isString().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Notes too long'),
		Validate.Handle.error
	],
	controller.postChatMessages as any
);

v1.patch(
	'/:id/cancel',
	onlyAllowUserRoles([
		'Admin', 
		'Staff', 
		'Customer'
	]) as any,
	validateId,
	[
		body('notes').isString().withMessage('Must provide a cancellation reason.'),
		body('notes').isLength({ min: API_MIN_TEXT_REQUEST_LENGTH, max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Invalid note length, must be within ${API_MIN_TEXT_REQUEST_LENGTH} or ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
		Validate.Handle.error
	],
	controller.cancelOrder as any
);

v1.post(
	'/:id/assign',
	onlyAllowUserRoles([
		'Admin', 
		'Staff'
	]) as any,
	validateId,
	[
		body('restaurant_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid restaurant_id is required'),
		body('courier_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid user_id is required'),
		body('notes').optional({ values: 'falsy' }).isString().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Notes too long'),
		Validate.Handle.error
	],
	controller.assignOrderToDriver as any
);

v1.post(
	'/:id/reallocate',
	onlyAllowUserRoles([
		'Admin', 
		'Staff'
	]) as any,
	validateId,
	[
		body('restaurant_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid restaurant_id is required'),
		body('courier_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Valid user_id is required'),
		body('notes').isString().isLength({ min: API_MIN_TEXT_REQUEST_LENGTH, max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Must provide a reallocation reason whose length is within 10 - 500 characters'),
		Validate.Handle.error
	],
	controller.reallocateDriver as any
);

v1.delete(
	'/:id',
	onlyAllowUserRoles([
		'Admin'
	]) as any,
	validateId,
	controller.deleteOrder as any
);

const orderRoutes = {
	v1
};

export default orderRoutes;