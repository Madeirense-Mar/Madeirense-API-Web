import { Router } from 'express';

import { body } from 'express-validator';

import {
    validateJWT
} from '../middlewares/authorization';

import {
    Validate
} from '../middlewares/validation';

import * as controller from '../controllers/devicePushTokens';

// ***************************************************************************************************************

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/register',
    [
        body('token').notEmpty().withMessage('FCM device token is required'),
        body('platform').optional({ values: 'falsy' }).isIn(['android', 'ios']).withMessage('platform must be android or ios'),
        Validate.Handle.error
    ],
    controller.registerToken as any
);

v1.delete(
    '/:token',
    controller.unregisterToken as any
);

const devicePushTokenRoutes = {
    v1
};

export default devicePushTokenRoutes;
