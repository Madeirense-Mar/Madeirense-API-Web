import { Router } from 'express';

import {
    param,
    query
} from 'express-validator';

import {
    DATE_INTERVALS,
    Madeirense$Enumerators
} from '@Madeirense/shared';

import {
    onlyAllowUserRoles,
    validateJWT
} from '../middlewares/authorization';

import {
    Validate
} from '../middlewares/validation';

import * as controller from '../controllers/statistics';

// ***************************************************************************************************************

const FIRST_STATISTICS_YEAR = 2025;

const ACTIONS = Object.values(Madeirense$Enumerators.StatisticsParameters.Actions);
const FACTS = Object.values(Madeirense$Enumerators.StatisticsParameters.Fact);

const defaultValidations = [
    ...Validate.Parameters.table,
    ...Validate.Queries.statistics,
];

const v1 = Router();

v1.use(validateJWT as any); // ========================================================================

v1.use(onlyAllowUserRoles([
    'Admin',
    'Staff'
]) as any);

// Dashboard header KPIs for a period (default: this month so far) vs the
// preceding period of equal length.
v1.get(
    '/overview',
    [
        ...Validate.Queries.statistics,
        Validate.Handle.error
    ],
    controller.getOverview as any
);

v1.get(
    '/count/:table/per/:column',
    [
        ...defaultValidations,
        param('column').notEmpty().withMessage('A column must be passed'),
        Validate.Handle.error
    ],
    controller.getCountPerProperty as any
);

v1.get(
    '/:table/:relation/count',
    [
        ...defaultValidations,
        Validate.Handle.error
    ],
    controller.getRelationCount as any
);

v1.get(
    '/:table/:relation/top',
    [
        ...defaultValidations,
        query(Madeirense$Enumerators.SearchQueries.group_by).optional({ values: 'falsy' }).isIn(controller.TOP_LOCATION_GROUPS).withMessage(`Locations can only be grouped by: ${controller.TOP_LOCATION_GROUPS.join(', ')}`),
        query(Madeirense$Enumerators.SearchQueries.user_role).optional({ values: 'falsy' }).isIn(controller.TOP_USER_ROLES).withMessage(`Top users can only be ranked for roles: ${controller.TOP_USER_ROLES.join(', ')}`),
        Validate.Handle.error
    ],
    controller.getTopRelation as any
);

v1.get(
    '/:table/:relation/:action/count',
    [
        ...defaultValidations,
        param('action').isIn(ACTIONS).withMessage(`Only ${ACTIONS.join(', ')} actions are allowed`),
        Validate.Handle.error
    ],
    controller.getRelationActionCount as any
);

v1.get(
    '/:table/report/:fact',
    [
        ...defaultValidations,
        param('fact').isIn(FACTS).withMessage(`Only ${FACTS.join(', ')} facts are allowed`),
        query(Madeirense$Enumerators.SearchQueries.interval).optional({ values: 'falsy' }).isIn(DATE_INTERVALS).withMessage(`Date interval must be within: ${DATE_INTERVALS.join(', ')}`),
        query(Madeirense$Enumerators.SearchQueries.month).optional({ values: 'falsy' }).isInt({ min: 1, max: 12 }).withMessage(`Choose a valid month, 1 - 12`),
        // Upper bound checked per request — a bound computed once at module load
        // would reject the new year until the server restarted.
        query(Madeirense$Enumerators.SearchQueries.year).optional({ values: 'falsy' })
            .isInt({ min: FIRST_STATISTICS_YEAR })
            .custom((year: string) => parseInt(year, 10) <= new Date().getFullYear())
            .withMessage(`Choose a valid year for a statistic, from ${FIRST_STATISTICS_YEAR} until now.`),
        Validate.Handle.error
    ],
    controller.getReport as any
);

const statisticsRoutes = {
    v1
};

export default statisticsRoutes;
