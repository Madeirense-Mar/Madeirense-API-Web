import { Router } from 'express';

import { body } from 'express-validator';

import { 
    $Enums
} from '@Madeirense/database';

import { 
    API_MIN_ID_NUMBER
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

import * as controller from '../controllers/payment';

// ***************************************************************************************************************

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.post(
    '/',
    [
        body('order_id').isInt({ min: API_MIN_ID_NUMBER }).withMessage('Order ID is required'),
        body('amount').isDecimal({ decimal_digits: '0,2' }).withMessage('Valid amount is required'),
        body('payment_method').isIn(Object.values($Enums.Payments_payment_method)).withMessage(`The payment method must be one of the types: ${Object.values($Enums.Payments_payment_method).join(', ')}`),
        Validate.Handle.error
    ],
    controller.createPayment as any
);

v1.get(
    '/mine',
    validatePagination,
    controller.getUserPayments as any
);

v1.get(
    '/:id',
    validateId,
    controller.getPaymentById as any
);

v1.patch(
    '/:id/status',
    // Was Admin-only; expanded 2026-09-30 to match Robbie's own
    // description of the intended design ("the back-end allows the
    // admin/staff/driver member to confirm payment") — this is the
    // manual-confirmation path (e.g. a driver marking a Cash payment
    // collected on delivery), distinct from the automated EMIS callback
    // (routes/emis.ts), which updates status without going through any
    // user role at all. Flagged in TODO.md to confirm this is actually
    // what was meant.
    onlyAllowUserRoles([
        'Admin',
        'Staff',
        'Driver'
    ]) as any,
    validateId,
    [
        // BUG FIX (2026-09-30): was checking uppercase values
        // ('COMPLETED'/'FAILED'/'REFUNDED') against what is actually an
        // all-lowercase Prisma enum (Payments_status: pending/completed/
        // failed/refunded) — every status transition except the no-op
        // 'pending' was rejected by this validator before ever reaching
        // Prisma. Now validated directly against the real enum values,
        // same pattern the payment_method validator above already uses.
        body('status').isIn(Object.values($Enums.Payments_status)).withMessage(`Valid payment status is required (one of: ${Object.values($Enums.Payments_status).join(', ')})`),
        Validate.Handle.error
    ],
    controller.updatePaymentStatus as any
);

v1.get(
    '/',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validatePagination,
    controller.getAllPayments
);

v1.delete(
    '/:id',
    onlyAllowUserRoles([
        'Admin'
    ]) as any,
    validateId,
    controller.deletePayment
);

const paymentRoutes = {
    v1
};

export default paymentRoutes;