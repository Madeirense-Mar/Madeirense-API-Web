import { Router } from 'express';

import {
    body
} from 'express-validator';

import {
    API_MIN_ID_NUMBER
} from '../utilities/constants';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate
} from '../middlewares/validation';

import * as controller from '../controllers/emails';

// ***************************************************************************************************************

const v1 = Router();

/**
 * @swagger
 * /v1/emails/unsubscribe:
 *   get:
 *     tags:
 *       - 'E-mails'
 *     summary: Unsubscribe link from marketing e-mails (public, HTML page).
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: HTML confirmation page
 */
v1.get(
    '/unsubscribe',
    controller.unsubscribe
);

// RFC 8058 one-click unsubscribe (Gmail/Outlook "Unsubscribe" button).
v1.post(
    '/unsubscribe',
    controller.unsubscribe
);

v1.use(validateJWT as any); // ========================================================================

v1.use(onlyAllowUserRoles(['Admin']) as any);

/**
 * @swagger
 * /v1/emails/templates:
 *   get:
 *     tags:
 *       - 'E-mails'
 *     summary: Lists the e-mail templates found in content/emails/ (Admin).
 *     responses:
 *       200:
 *         description: Success
 */
v1.get(
    '/templates',
    controller.API$listTemplates as any
);

/**
 * @swagger
 * /v1/emails/send:
 *   post:
 *     tags:
 *       - 'E-mails'
 *     summary: Sends a template to specific users (Admin).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_ids, template]
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               template:
 *                 type: string
 *                 example: announcement
 *               variables:
 *                 type: object
 *     responses:
 *       202:
 *         description: Queued
 */
v1.post(
    '/send',
    [
        body('user_ids').isArray({ min: 1, max: 1000 }).withMessage('user_ids must be an array of 1 to 1000 ids'),
        body('user_ids.*').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Target user id must be a positive integer').toInt(),
        body('template').isString().matches(/^[a-z0-9-]+$/).withMessage('template must be a template file name (without .html)'),
        body('variables').optional().isObject(),
        Validate.Handle.error
    ],
    controller.API$send as any
);

/**
 * @swagger
 * /v1/emails/broadcast:
 *   post:
 *     tags:
 *       - 'E-mails'
 *     summary: Sends the announcement template to a whole audience (Admin). Respects marketing opt-out.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [audience, subject, heading, body]
 *             properties:
 *               audience:
 *                 type: string
 *                 enum: [customers, staff, drivers, everyone]
 *               subject:
 *                 type: string
 *               heading:
 *                 type: string
 *               body:
 *                 type: string
 *                 description: Plain text; blank lines become paragraphs.
 *               cta_label:
 *                 type: string
 *               cta_url:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       202:
 *         description: Broadcast started
 */
v1.post(
    '/broadcast',
    [
        body('audience').isIn(['customers', 'staff', 'drivers', 'everyone']).withMessage('audience must be customers, staff, drivers or everyone'),
        body('subject').isString().trim().isLength({ min: 3, max: 150 }),
        body('heading').isString().trim().isLength({ min: 1, max: 150 }),
        body('body').isString().trim().isLength({ min: 1, max: 10000 }),
        body('cta_label').optional({ values: 'falsy' }).isString().trim().isLength({ max: 60 }),
        body('cta_url').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
        body('image_url').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }),
        Validate.Handle.error
    ],
    controller.API$broadcast as any
);

const emailRoutes = {
    v1
};

export default emailRoutes;
