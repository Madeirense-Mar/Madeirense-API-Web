import {
    type Request,
    type Response,
    type NextFunction
} from 'express';

import {
    body,
    param,
    query,
    validationResult
} from 'express-validator';

import {
    DAYS_OF_THE_WEEK,
    isInvalidValue,
} from '@Madeirense/shared';

import {
    API_MIN_ID_NUMBER
} from '../utilities/constants.js';
import { DB$Enumerators } from '@Madeirense/database';

// ***************************************************************************************************************

export namespace Validate {
    export namespace Custom {
        export const timestamp = (value: any) => {
            const timestamp = parseInt(value);

            const timestampStr = timestamp.toString();

            const timestampDate = (
                (timestampStr.length === 10)
                    ? new Date(timestamp * 1000)
                    : new Date(timestamp)
            );

            switch (true) {
                case (isNaN(timestamp)):
                    throw new Error('Invalid timestamp format');

                case (timestamp < 0):
                    throw new Error('Timestamp cannot be negative');

                case (![10, 13].includes(timestampStr.length)):
                    throw new Error('Timestamp must be 10 digits (seconds) or 13 digits (milliseconds)');

                case (isNaN(timestampDate.getTime())):
                    throw new Error('Invalid timestamp - cannot convert to valid date');

                default:
                    return true;
            }
        }
    }

    export namespace Body {
        export const location = (required: boolean = false) => {
            switch (true) {
                case (required): return [
                    body('location').notEmpty().withMessage('Location is required'),
                    body('location.address').notEmpty().withMessage('Address is required'),
                    body('location.country').notEmpty().withMessage('Country is required'),
                    body('location.name').notEmpty().withMessage('Name is required'),
                    body('location.city').notEmpty().withMessage('City is required'),
                    body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required, value must be between -90/90'),
                    body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required, value must be between -180/180')
                ]

                default: return [
                    body('location').optional({ values: 'falsy' }),
                    body('location.address').optional({ values: 'falsy' }).isString().withMessage('Provide a valid address'),
                    body('location.country').optional({ values: 'falsy' }).isString().withMessage('Provide a valid Country'),
                    body('location.name').optional({ values: 'falsy' }).isString().withMessage('Provide a valid name for the location'),
                    body('location.city').optional({ values: 'falsy' }).isString().withMessage('Provide a valid Country'),
                    body('location.latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required, value must be between -90/90'),
                    body('location.longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required, value must be between -180/180')
                ]
            }
        }

        export const schedule = (required: boolean = false) => {
            switch (true) {
                case (required): return [
                    body('schedule').isArray({ min: 1, max: DAYS_OF_THE_WEEK.length }).withMessage('Schedule must be an array of 1 - 7 items'),
                    body('schedule.*.day_of_week').isIn(DAYS_OF_THE_WEEK).withMessage(`Days of the week must be one of: ${DAYS_OF_THE_WEEK.join(', ')}`),
                    body('schedule.*.closing_time').isTime({ hourFormat: 'hour24', mode: 'default' }).withMessage('Closing time must be in HH:MM format'),
                    body('schedule.*.opening_time').isTime({ hourFormat: 'hour24', mode: 'default' }).withMessage('Opening time must be in HH:MM format'),
                    body('schedule.*.is_closed').isBoolean().withMessage('Closing time is a boolean value'),
                    body('schedule.*').custom((value) => {
                        if (!value.is_closed && (!value.opening_time || !value.closing_time))
                            throw new Error('Opening and closing times are required when not closed');

                        else
                            return true;
                    })
                ];

                default: return [
                    body('schedule').optional({ values: 'falsy' }).isArray({ min: API_MIN_ID_NUMBER, max: 7 }).withMessage('Schedule must be an array of 1 - 7 items'),
                    body('schedule.*.day_of_week').optional({ values: 'falsy' }).isIn(DAYS_OF_THE_WEEK).withMessage(`Days of the week must be one of: ${DAYS_OF_THE_WEEK.join(', ')}`),
                    body('schedule.*.closing_time').optional({ values: 'falsy' }).isTime({ hourFormat: 'hour24', mode: 'default' }).withMessage('Closing time must be in HH:MM format'),
                    body('schedule.*.opening_time').optional({ values: 'falsy' }).isTime({ hourFormat: 'hour24', mode: 'default' }).withMessage('Opening time must be in HH:MM format'),
                    body('schedule.*.is_closed').optional({ values: 'falsy' }).isBoolean().withMessage('Closing time is a boolean value')
                ];
            }
        }

        export namespace Custom {
            const doFieldsHaveValues = (
                fields: string[],
                req: any
            ) => fields.some(field => {
                const fieldValue = req.body[field];

                return [
                    !isInvalidValue(fieldValue),
                    (fieldValue.toString().trim() !== '')
                ].every(Boolean);
            });

            export const forbiddenFields = (fields: string[], message = 'These fields should be updated using the correct endpoint') => {
                return body().custom((
                    value,
                    { req }
                ) => {
                    if (doFieldsHaveValues(fields, req))
                        throw new Error(`${message}: ${fields.join(', or ')}`);
                    else
                        return true;
                });
            }

            export const requireAtLeastOneField = (fields: string[], message = 'At least one field is required') => {
                return body().custom((
                    value,
                    { req }
                ) => {
                    if (!doFieldsHaveValues(fields, req))
                        throw new Error(`${message}: ${fields.join(', or ')}`);
                    else
                        return true;
                });
            }
        }
    }

    export namespace Handle {
        export const error = (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            const errors = validationResult(req);

            if (!errors.isEmpty())
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });

            else
                next();
        }
    }

    export namespace Parameters {
        export const id = [
            param('id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('ID parameter is required and should be positive integer'),
        ]

        export const table = [
            param('table').optional({ values: 'falsy' }).isIn(Object.values(DB$Enumerators.Tables)).withMessage('Table name must be valid'),
            param('relation').optional({ values: 'falsy' }).isIn(Object.values(DB$Enumerators.Tables)).withMessage('Relation is also a table name, and it must be present in the server in order to return the correct statistical data, make sure the table name is correct.'),
        ]
    }

    export namespace Queries {
        export const pagination = [
            query('page').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Page must be a positive integer'),
            query('limit').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER, max: 100 }).withMessage('Limit must be between 1 and 100'),
        ]

        // Shared by every /statistics route. `group_by` is a query (not a path
        // param) and is whitelisted per-route, next to the controller that uses it.
        export const statistics = [
            query('restaurant_id').optional({ values: 'falsy' }).isInt({ min: API_MIN_ID_NUMBER }).withMessage('Restaurant ID query should be positive integer'),
            query('from').optional({ values: 'falsy' }).isISO8601().withMessage('"from" must be an ISO-8601 date (YYYY-MM-DD) or datetime'),
            query('to').optional({ values: 'falsy' }).isISO8601().withMessage('"to" must be an ISO-8601 date (YYYY-MM-DD) or datetime')
                .bail()
                .custom((to: string, { req }) => {
                    const from = req.query?.from;

                    return (typeof from !== 'string' || from === '') || (new Date(to).getTime() >= new Date(from).getTime());
                }).withMessage('"to" must not be before "from"'),
            query('quantity').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
            query('strict').optional({ values: 'falsy' }).isIn(['false', 'true']).withMessage('To define strict mode pass a boolean value (true or false)'),
        ]
    }
};

export const validateId = [
    ...Validate.Parameters.id,
    Validate.Handle.error
];

export const validatePagination = [
    ...Validate.Queries.pagination,
    Validate.Handle.error
];