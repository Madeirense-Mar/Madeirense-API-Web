import {
    Router
} from 'express';

import * as controller from '../controllers/legal';

// ***************************************************************************************************************
// Public, unauthenticated — same pattern as globalSettings.ts's
// `/restaurant-theme/:restaurant_id`. Both web and mobile need to read
// these before/without a signed-in session (e.g. from a signup screen).

const v1 = Router();

v1.get(
    '/terms',
    controller.getTerms as any
);

v1.get(
    '/privacy',
    controller.getPrivacyPolicy as any
);

const legalRoutes = {
    v1
};

export default legalRoutes;
