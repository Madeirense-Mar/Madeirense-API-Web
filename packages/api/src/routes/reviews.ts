import { Router } from 'express';

import { 
    body
} from 'express-validator';

import { 
    API_MAX_RATING_NUMBER, 
    API_MAX_TEXT_REQUEST_LENGTH, 
    API_MIN_ID_NUMBER, 
    API_MIN_RATING_NUMBER
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

import * as controller from '../controllers/review';

// ***************************************************************************************************************

const reviewPayloadValidation = [
    body('order_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Order ID is required'),
    body('rating').isInt({ min: API_MIN_RATING_NUMBER, max: API_MAX_RATING_NUMBER }).withMessage(`Rating must be between ${API_MAX_RATING_NUMBER} and ${API_MIN_RATING_NUMBER}`),
    body('comment').optional({ values: 'falsy' }).isString().isLength({ max: API_MAX_TEXT_REQUEST_LENGTH }).withMessage('Comment must be a string no longer than 500 characters'),
    Validate.Handle.error
];

const v1 = Router();

v1.get(
    '/', 
    validatePagination, 
    controller.getAllReviews
);

// `/mine` is registered before the public `GET /:id`: Express matches routes
// in registration order, so "mine" would otherwise be parsed as an :id and
// rejected by validateId. It carries its own validateJWT because the
// router-wide `v1.use(validateJWT)` below only covers routes registered after it.
v1.get(
    '/mine',
    validateJWT as any,
    validatePagination,
    controller.getUserReviews as any
);

v1.get(
    '/:id', 
    validateId, 
    controller.getReviewById
);

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/', 
    reviewPayloadValidation, 
    controller.createReview as any
);

v1.put(
    '/:id', 
    validateId, 
    reviewPayloadValidation, 
    controller.updateReview as any
);

v1.delete(
    '/:id', 
    validateId, 
    controller.deleteReview as any
);

v1.delete(
    '/:id/admin',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    controller.adminDeleteReview as any
);

const reviewsRoutes = {
    v1
};

export default reviewsRoutes;
