import {
    Router
} from 'express';

import {
    body,
    param,
    query
} from 'express-validator';

import {
    $Enums,
    Resort_Booking_Cancellations_reason_code,
    Resort_Booking_Payments_payment_method,
    Resort_Booking_Payments_status,
    Resort_Bookings_status,
    Resort_Rooms_Media_media_type
} from '@Madeirense/database';

import {
    isInvalidValue,
    Madeirense$Enumerators,
    type resortPropertyType
} from '@Madeirense/shared';

import {
    API_MAX_TEXT_REQUEST_LENGTH,
    API_MIN_ID_NUMBER
} from 'utilities/constants';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate,
    validateId,
    validatePagination
} from '../middlewares/validation';

import * as controller from '../controllers/resorts';

// ***************************************************************************************************************

const checkInTimeValidation = (value: any) => {
    if ([
        value.check_in,
        value.check_out,
    ].some(isInvalidValue)) return true;

    const checkIn = new Date(value.check_in);
    const checkOut = new Date(value.check_out);

    if ([
        (checkOut < checkIn),
        (checkIn > checkOut)
    ].includes(true)) {
        throw new Error('Check-out date cannot be before check-in or vice-versa');
    }

    return true;
};

const validateBookingStatuses = [
    query(Madeirense$Enumerators.SearchQueries.statuses).optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('A filled status array must be passed in order to properly filter bookings'),
    query(`${Madeirense$Enumerators.SearchQueries.statuses}.*`).isIn(Object.values(Resort_Bookings_status)).withMessage(`Status type is invalid, must be: ${Object.values(Resort_Bookings_status).join(', ')}`),
    Validate.Handle.error
];

const v1 = Router();

v1.get(
    '/',
    [
        query(Madeirense$Enumerators.SearchQueries.withRooms).optional({ values: 'falsy' }).isIn([0, 1]).withMessage('0 to omit rooms, 1 to return them'),
        Validate.Handle.error
    ],
    validatePagination,
    controller.resorts.getResorts
);

v1.get(
    '/:id',
    validateId,
    controller.resorts.getResort as any
);

v1.get(
    '/:id/rooms',
    validateId,
    validatePagination,
    [
        ...([
            Madeirense$Enumerators.SearchQueries.amenities,
            Madeirense$Enumerators.SearchQueries.bed_types
        ].map(queryKey => [
            query(queryKey).optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Must be an array of valid id numbers and contain at least 1 positive integer'),
            query(`${queryKey}.*`).optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Each number must be a positive integer with 1 as the minimum value'),
        ])).flat(1),
        query(Madeirense$Enumerators.SearchQueries.statuses)
            .optional({ values: 'falsy' }).isIn(Object.values($Enums.Resort_Rooms_availability))
            .withMessage(`Correct values for room availability status: ${Object.values($Enums.Resort_Rooms_availability)}`),
        Validate.Handle.error
    ],
    controller.rooms.getRooms
);

/** BOOKING */

v1.get(
    '/bookings/cancellation-policies',
    validatePagination,
    controller.bookings.getBookingCancellationPolicies
);

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body('name').notEmpty().withMessage('Resort name is required'),
        body('location').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Pass a valid location ID'),
        body('thumbnail_url').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        body('video_url').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Video must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        Validate.Handle.error
    ],
    controller.resorts.createResort as any
);

v1.delete(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    controller.resorts.deleteResort as any
);

v1.patch(
    '/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    Validate.Body.Custom.requireAtLeastOneField([
        'name',
        'location',
        'thumbnail_url',
        'video_url'
    ]),
    body('name').optional({ values: 'falsy' }).isString().withMessage('Resort name must be a valid string'),
    body('location').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Pass a valid location ID'),
    body('thumbnail_url').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
    body('video_url').optional({ values: 'falsy' }).isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Video must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
    controller.resorts.updateResort as any
);

v1.post(
    '/:id/book',
    onlyAllowUserRoles([
        'Admin',
        'Customer',
        'Staff'
    ]) as any,
    validateId,
    [
        body('room_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('ID parameter is required and should be positive integer').withMessage(''),
        body('check_in').isISO8601().withMessage('Valid check-in date is required').withMessage(''),
        body('check_out').isISO8601().withMessage('Valid check-out date is required').withMessage(''),
        body('guests').isInt({ min: 1 }).withMessage('Room must be booked for at least 1 guest'),
        body('amount').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid booking amount is required'),
        body('payment_method').isIn(Object.values(Resort_Booking_Payments_payment_method)).withMessage('Must be a valid and accepted payment method'),
        body('payment_status').isIn(Object.values(Resort_Booking_Payments_status)).withMessage('Must be a valid payment status'),
        body().custom(checkInTimeValidation),
        Validate.Handle.error
    ],
    controller.bookings.bookRoom as any
);

v1.get(
    '/:id/bookings',
    onlyAllowUserRoles([
        'Admin',
        'Customer',
        'Staff'
    ]) as any,
    validateId,
    validatePagination,
    validateBookingStatuses,
    controller.bookings.getBookings as any
);

v1.post(
    '/:id/room',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    [
        ...([
            'amenities',
        ].map(bodyProperty => [
            body(bodyProperty).isArray({ min: 1 }).withMessage('Must be an array of valid id numbers and contain at least 1 positive integer'),
            body(`${bodyProperty}.*`).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Each number must be a positive integer with 1 as the minimum value'),
        ])).flat(1),
        body('bedTypes').isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('bedTypes.*').isObject({ strict: true }).withMessage('Bed type must be a valid object'),
        body('bedTypes.*.bed_type_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        body('bedTypes.*.quantity').isInt({ min: 1 }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        body('name').isString().withMessage('A room requires a name to be saved'),
        body('price_per_night').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
        body('quantity').isInt({ min: 0 }).withMessage('Room quantity must be a positive integer'),
        body('thumbnail_url_collection').isArray({ min: 1 }).withMessage(`Thumbnail collections must be a valid URL array`),
        body('thumbnail_url_collection.*').isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        body('video_url_collection').isArray({ min: 1 }).withMessage(`Video collections must be a valid URL array`),
        body('video_url_collection.*').isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Video must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        Validate.Handle.error
    ],
    controller.rooms.addRoom as any
);

/** BOOKING */

v1.get(
    '/bookings/mine',
    validatePagination,
    validateBookingStatuses,
    controller.bookings.getMyBookings as any
);

v1.get(
    '/bookings/:id',
    validateId,
    controller.bookings.getBooking as any
);

v1.get(
    '/bookings/:id/history',
    validateId,
    validatePagination,
    controller.bookings.getBookingHistory as any
);

v1.patch(
    '/bookings/:id',
    validateId,
    [
        Validate.Body.Custom.requireAtLeastOneField([
            'room_id',
            'check_in',
            'check_out',
            'guests',
            'amount',
            'payment_method',
            'status',
        ]),
        body('room_id').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('ID parameter is required and should be positive integer').withMessage(''),
        body('check_in').optional({ values: 'falsy' }).isISO8601().withMessage('Valid check-in date is required').withMessage(''),
        body('check_out').optional({ values: 'falsy' }).isISO8601().withMessage('Valid check-out date is required').withMessage(''),
        body('guests').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Room must be booked for at least 1 guest'),
        body('amount').optional({ values: 'falsy' }).isDecimal({ decimal_digits: '0,2' }).withMessage('Valid booking amount is required'),
        body('payment_method').optional({ values: 'falsy' }).isIn(Object.values(Resort_Booking_Payments_payment_method)).withMessage('Must be a valid and accepted payment method'),
        body('status').optional({ values: 'falsy' }).isIn(Object.values(Resort_Booking_Payments_status)).withMessage('Must be a valid payment status'),
        body().custom(checkInTimeValidation),
        Validate.Handle.error
    ],
    controller.bookings.updateBooking as any
);

v1.post(
    '/bookings/:id/cancel',
    onlyAllowUserRoles([
        'Admin',
        'Customer',
        'Staff'
    ]) as any,
    validateId,
    [
        body('reason_code').isIn(Object.values(Resort_Booking_Cancellations_reason_code)).withMessage('A booking cancellation must be paired with a reason'),
        Validate.Handle.error
    ],
    controller.bookings.cancelBooking as any
);

v1.patch(
    `/bookings/:id/update/:${Madeirense$Enumerators.SearchParameters.status}`,
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    [
        param(Madeirense$Enumerators.SearchParameters.status).isIn(Object.values(Resort_Bookings_status).filter(status => !['cancelled', 'completed'].includes(status))).withMessage('Pass the correct status type, this route cannot be used to cancel or complete booking'),
        Validate.Handle.error
    ],
    controller.bookings.updateStatus as any
);

/** BOOKING - CHAT */

v1.get(
    '/bookings/:id/chat',
    onlyAllowUserRoles([
        'Admin',
        'Customer',
        'Staff'
    ]) as any,
    validateId,
    validatePagination,
    controller.bookings.chat.getChatMessages as any
);

v1.post(
    '/bookings/:id/chat',
    onlyAllowUserRoles([
        'Admin',
        'Customer',
        'Staff'
    ]) as any,
    validateId,
    controller.bookings.chat.postChatMessages as any
);

/** PROPERTIES */

v1.get(
    '/properties/amenities',
    validatePagination,
    controller.properties.getAmenities as any
);

v1.post(
    '/properties/amenities',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body().isArray({ min: 1 }).withMessage('Must be an array'),
        body('*').exists({ values: 'falsy' }).isString().withMessage('Must be a valid name'),
        Validate.Handle.error
    ],
    controller.properties.addAmenities as any
);

v1.get(
    '/properties/bed-types',
    validatePagination,
    controller.properties.getBedTypes as any
);

v1.post(
    '/properties/bed-types',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body().isArray({ min: 1 }).withMessage('Must be an array'),
        body('*').isObject({ strict: true }).withMessage('Bed item must be an object'),
        body('*.name').isInt({ min: 1 }).withMessage('The number represents the amount of people that fit on this bed'),
        Validate.Handle.error
    ],
    controller.properties.addBedTypes as any
);

v1.delete(
    `/properties/:${Madeirense$Enumerators.SearchParameters.property}`,
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        param(Madeirense$Enumerators.SearchParameters.property).isIn([
            'amenity',
            'bedType'
        ] as (resortPropertyType)[]).withMessage('Must be a valid resort property'),
        query(Madeirense$Enumerators.SearchQueries.list).isArray({ min: 1 }).withMessage('An id list must be provided'),
        query(`${Madeirense$Enumerators.SearchQueries.list}.*`).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Each item must be a valid id, meaning a positive integer'),
        Validate.Handle.error
    ],
    controller.properties.deleteProperties as any
);

v1.patch(
    `/properties/update/:${Madeirense$Enumerators.SearchParameters.property}/:id`,
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    validateId,
    [
        param(Madeirense$Enumerators.SearchParameters.property).isIn([
            'amenity',
            'bedType'
        ] as (resortPropertyType)[]).withMessage('Must be a valid resort property'),
        body('sleeps').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('The number represents the amount of people that fit on this bed'),
        Validate.Handle.error
    ],
    controller.properties.updateProperty as any
);

/** ROOMS */

v1.patch(
    '/rooms/batch/update',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    Validate.Body.Custom.requireAtLeastOneField([
        'name',
        'price_per_night',
        'quantity'
    ]),
    body('list').isArray({ min: 1 }).withMessage('A list of valid ids must be passed to determine which rooms to edit'),
    body('list.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Id must be a valid positive integer'),
    body('name').optional({ values: 'falsy' }).isString().withMessage('A room requires a name to be saved'),
    body('price_per_night').optional({ values: 'falsy' }).isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
    body('quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Room quantity must be a positive integer'),
    controller.rooms.BATCH$updateRooms as any
);

v1.delete(
    '/rooms/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    controller.rooms.deleteRoom as any
);

v1.patch(
    '/rooms/:id',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        Validate.Body.Custom.requireAtLeastOneField([
            'name',
            'price_per_night',
            'quantity'
        ]),
        body('name').optional({ values: 'falsy' }).isString().withMessage('A room requires a name to be saved'),
        body('price_per_night').optional({ values: 'falsy' }).isDecimal({ decimal_digits: '0,2' }).withMessage('Valid price is required'),
        body('quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Room quantity must be a positive integer'),
        Validate.Handle.error
    ],
    controller.rooms.updateRoom as any
);

v1.patch(
    '/rooms/:id/amenities',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        Validate.Body.Custom.requireAtLeastOneField([
            'adding',
            'removing'
        ]),
        body('adding').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('adding.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        body('removing').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('removing.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        Validate.Handle.error
    ],
    controller.rooms.updateRoomAmenities as any
);

v1.patch(
    '/rooms/:id/bed-types',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body('adding').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('adding.*').isObject({ strict: true }).withMessage('Bed type must be a valid object'),
        body('adding.*.bed_type_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        body('adding.*.quantity').isInt({ min: 1 }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        body('removing').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('removing.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        Validate.Handle.error
    ],
    controller.rooms.updateRoomBedTypes as any
);

v1.patch(
    '/rooms/:id/media',
    onlyAllowUserRoles([
        'Admin',
        'Staff'
    ]) as any,
    [
        body('adding').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('adding.*').isObject({ strict: true }).withMessage('Bed type must be a valid object'),
        body('adding.*.media_type').isIn(Object.values(Resort_Rooms_Media_media_type)).withMessage(`Only media of type: ${Object.values(Resort_Rooms_Media_media_type).join(', ')} is accepted`),
        body('adding.*.media_url').isURL().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage(`Thumbnail must be a valid URL and can\'t be longer than ${API_MAX_TEXT_REQUEST_LENGTH} characters`),
        body('removing').optional({ values: 'falsy' }).isArray({ min: 1 }).withMessage('Bed type specification is required'),
        body('removing.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Number must be a positive integer with 1 as the minimum value'),
        Validate.Handle.error
    ],
    controller.rooms.updateRoomMedia as any
);

const resortRoutes = {
    v1
};

export default resortRoutes;