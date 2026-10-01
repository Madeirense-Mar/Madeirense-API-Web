import { Router } from 'express';

import baseController from '../controllers/base.js';

import authenticationRoutes from './authentication.js';
import cartRoutes from './cart.js';
import commentRoutes from './comments.js';
import couponRoutes from './coupons.js';
import courierPositionsRoutes from './courierPositions.js';
import deliveryLocationRoutes from './deliveryLocations.js';
import devicePushTokenRoutes from './devicePushTokens.js';
import emisRoutes from './emis.js';
import globalSettingsRoutes from './globalSettings.js';
import orderRoutes from './orders.js';
import paymentRoutes from './payments.js';
import productRoutes from './products.js';
import pushNotificationRoutes from './pushNotifications.js';
import resortRoutes from './resorts.js';
import restaurantEventRoutes from './restaurantEvents.js';
import restaurantRoutes from './restaurants.js';
import reviewRoutes from './reviews.js';
import routingRoutes from './routing.js';
import userRoutes from './users.js';
import statisticsRoutes from './statistics.js';

// ***************************************************************************************************************

const v1 = Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - 'Microservice Template'
 *     summary: Returns greetings.
 *     description: Hello.
 *     security: []
 *     responses:
 *       200:
 *          description: Success
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/APIResponse'
 */
v1.get('/', baseController.v1.welcome);

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - 'Microservice Template'
 *     summary: Returns a list of dependencies and their current status.
 *     description: Pings a list of dependencies to inquire about their status, this determines whether or not the app will be operational.
 *     security: []
 *     responses:
 *       200:
 *          description: Success
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/APIResponse'
 *                  - type: object
 *                    properties:
 *                      data:
 *                        type: array
 *                        items:
 *                          $ref: '#/components/schemas/dependency'
 *       503:
 *          description: Server will respond with 'HAS_UNAVAILABLE_ESSENTIALS' meaning there are key dependencies that are down (ping resulted in all packets being lost), so the application will not work.
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/APIResponse'
 *                  - type: object
 *                    properties:
 *                      success:   
 *                        type: boolean
 *                        default: false
 *                      code:   
 *                        type: string
 *                        enum: [HAS_UNAVAILABLE_ESSENTIALS]
 *                      data:
 *                        type: array
 *                        items:
 *                          $ref: '#/components/schemas/dependency'
 */
v1.get('/health', baseController.v1.health);

const baseRoutes = {
    v1
};

const routes = {
    v1: {
        'base': baseRoutes.v1,
        'auth': authenticationRoutes.v1,
        'cart': cartRoutes.v1,
        'comments': commentRoutes.v1,
        'coupons': couponRoutes.v1,
        'courier-positions': courierPositionsRoutes.v1,
        'delivery-locations': deliveryLocationRoutes.v1,
        'device-tokens': devicePushTokenRoutes.v1,
        'emis': emisRoutes.v1,
        'global-settings': globalSettingsRoutes.v1,
        'orders': orderRoutes.v1,
        'payments': paymentRoutes.v1,
        'products': productRoutes.v1,
        'push-notifications': pushNotificationRoutes.v1,
        'resorts': resortRoutes.v1,
        'restaurant-events': restaurantEventRoutes.v1,
        'restaurants': restaurantRoutes.v1,
        'reviews': reviewRoutes.v1,
        'routing': routingRoutes.v1,
        'statistics': statisticsRoutes.v1,
        'users': userRoutes.v1
    },
    // 'v$': {
        
    // }
};

export default routes;