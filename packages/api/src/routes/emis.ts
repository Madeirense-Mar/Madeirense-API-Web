import { Router } from 'express';

import {
    type NextFunction,
    type Request,
    type Response
} from 'express';

import * as emis from '../services/emis';

import * as controller from '../controllers/payment';

// ***************************************************************************************************************
//
// Mounted at /v1/emis — deliberately its OWN router, not folded into
// routes/payments.ts, because that router does `v1.use(validateJWT)`
// for everything in it: EMIS calling us back is a server-to-server
// request with no Madeirense user session to present a JWT for. This
// route is guarded by a shared secret instead (see
// services/emis.ts#verifyCallbackSecret's header comment for how
// unverified that scheme itself still is). Added 2026-09-30.
//
// ***************************************************************************************************************

function verifyEmisCallback(req: Request, res: Response, next: NextFunction) {
    const provided = req.header('x-emis-callback-secret');

    if (!emis.verifyCallbackSecret(provided)) {
        return res.status(401).json({
            code: 'UNAUTHORIZED',
            data: undefined,
            message: 'Invalid or missing EMIS callback credentials',
            success: false
        });
    }

    next();
}

const v1 = Router();

v1.post(
    '/callback',
    verifyEmisCallback,
    controller.emisPaymentCallback as any
);

const emisRoutes = {
    v1
};

export default emisRoutes;
