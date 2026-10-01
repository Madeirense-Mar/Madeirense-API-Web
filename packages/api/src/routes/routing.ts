import { Router } from 'express';

import {
    body
} from 'express-validator';

import {
    validateJWT,
} from '../middlewares/authorization';

import {
    Validate
} from '../middlewares/validation';

import * as controller from '../controllers/routing';

// ***************************************************************************************************************

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/route',
    [
        body('origin').exists().withMessage('origin is required'),
        body('origin.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid origin.latitude required, value must be between -90/90'),
        body('origin.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid origin.longitude required, value must be between -180/180'),
        body('destination').exists().withMessage('destination is required'),
        body('destination.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid destination.latitude required, value must be between -90/90'),
        body('destination.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid destination.longitude required, value must be between -180/180'),
        Validate.Handle.error
    ],
    controller.getRoute as any
);

const routingRoutes = {
    v1
};

export default routingRoutes;
