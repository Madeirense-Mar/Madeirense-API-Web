import {
    type Response
} from 'express';

import {
    DB$Enumerators,
    Prisma,
    type Orders
} from '@Madeirense/database';

import {
    DEFAULT_API_LIST_LIMIT,
    Madeirense$Enumerators,
    type API$Types,
    type amountEntryType,
    type countEntryType,
    type dateIntervalsType,
    type deliveryTimeEntryType,
    type orderRevenueType,
    type overviewChangeType,
    type overviewMetricsType,
    type peakHourEntryType,
    type statisticsOverviewType,
    type statisticsPeriodType,
    type topCustomerEntryType,
    type topEventEntryType,
    type topRestaurantEntryType
} from '@Madeirense/shared';

import { prisma } from '../lib/prisma';

import {
    handleControllerError
} from './utilities/handlers';

import type { IAuthenticatedRequest } from 'interfaces';

// ***************************************************************************************************************
// Shared plumbing
//
// Every raw query below is built with `Prisma.sql` (parameterised) instead of
// `$queryRawUnsafe` + string interpolation. The only fragments ever spliced in
// with `Prisma.raw` are constants from this file (column whitelists, date
// buckets) — never request input.
//
// MySQL runs with `sql_mode=only_full_group_by`: every non-aggregated column in
// a SELECT must be in the GROUP BY or functionally dependent on it. All GROUP BYs
// here are therefore on a primary key (so the table's other columns are
// dependent) or on the exact bucket expression being selected.
// ***************************************************************************************************************

const SearchQueries = Madeirense$Enumerators.SearchQueries;

/** Orders that are still in flight (neither delivered nor cancelled). */
const ACTIVE_ORDER_STATUSES = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'assigned'
] as const satisfies ReadonlyArray<NonNullable<Orders['status']>>;

/** Delivery_Locations columns `GET /Delivery_Locations/Orders/top` may group by. */
export const TOP_LOCATION_GROUPS = [
    'neighborhood',
    'city',
    'state',
    'country'
] as const;

type topLocationGroupType = (typeof TOP_LOCATION_GROUPS)[number];

/** User roles `GET /Users/Orders/top` can rank. */
export const TOP_USER_ROLES = [
    'Driver',
    'Customer'
] as const;

type topUserRoleType = (typeof TOP_USER_ROLES)[number];

/** What `$queryRaw` can hand back for a numeric column/aggregate on MySQL. */
type rawNumberType = (
    | bigint
    | number
    | string
    | Prisma.Decimal
    | null
);

type statisticsFiltersType = {
    restaurant_id: number | undefined,
    /** Inclusive lower bound. */
    from: Date | undefined,
    /** Exclusive upper bound. */
    to: Date | undefined,
    strict: boolean
};

function toNumber(value: rawNumberType | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint' || typeof value === 'string') return Number(value);

    return value.toNumber();
};

function toNullableNumber(value: rawNumberType | undefined): number | null {
    return (value === null || value === undefined) ? null : toNumber(value);
};

/** Rounds to 2 decimal places — for averages and money, so JSON doesn't carry float noise. */
function round(value: number): number {
    return Math.round(value * 100) / 100;
};

function parseIntegerQuery(value: unknown): number | undefined {
    if (typeof value !== 'string' || value === '') return undefined;

    const parsed = parseInt(value, 10);

    return Number.isInteger(parsed) ? parsed : undefined;
};

/**
 * Parses an ISO-8601 date/datetime query. When `inclusiveDay` is set and the
 * value is a bare date (`YYYY-MM-DD`), it's pushed to the start of the next day
 * so `to=2026-10-08` covers all of the 8th (the range is `[from, to)`).
 */
function parseDateQuery(value: unknown, inclusiveDay = false): Date | undefined {
    if (typeof value !== 'string' || value === '') return undefined;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return undefined;

    if (inclusiveDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        date.setUTCDate(date.getUTCDate() + 1);
    }

    return date;
};

function readFilters(req: IAuthenticatedRequest<any>): statisticsFiltersType {
    return {
        restaurant_id: parseIntegerQuery(req.query[SearchQueries.restaurant_id]),
        from: parseDateQuery(req.query[SearchQueries.from]),
        to: parseDateQuery(req.query[SearchQueries.to], true),
        strict: req.query[SearchQueries.strict] === 'true'
    };
};

function readQuantity(req: IAuthenticatedRequest<any>): number {
    return parseIntegerQuery(req.query[SearchQueries.quantity]) ?? DEFAULT_API_LIST_LIMIT;
};

function whereClause(conditions: Prisma.Sql[]): Prisma.Sql {
    return (conditions.length > 0)
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;
};

function dateRangeConditions(
    column: Prisma.Sql,
    { from, to }: Pick<statisticsFiltersType, 'from' | 'to'>
): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [];

    if (from) conditions.push(Prisma.sql`${column} >= ${from}`);
    if (to) conditions.push(Prisma.sql`${column} < ${to}`);

    return conditions;
};

/** `restaurant_id` + `[from, to)` on `Orders.created_at`. */
function orderConditions(filters: statisticsFiltersType): Prisma.Sql[] {
    return [
        ...((filters.restaurant_id !== undefined) ? [Prisma.sql`Orders.restaurant_id = ${filters.restaurant_id}`] : []),
        ...dateRangeConditions(Prisma.sql`Orders.created_at`, filters)
    ];
};

const NOT_CANCELLED = Prisma.sql`(Orders.status IS NULL OR Orders.status <> 'cancelled')`;
const DELIVERED = Prisma.sql`Orders.status = 'delivered'`;

/** Prisma-client equivalent of `orderConditions`, for `groupBy`/`count`/`aggregate`. */
function orderWhere(filters: statisticsFiltersType): Prisma.OrdersWhereInput {
    return {
        ...((filters.restaurant_id !== undefined) ? { restaurant_id: filters.restaurant_id } : {}),
        ...((filters.from || filters.to) ? {
            created_at: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lt: filters.to } : {})
            }
        } : {})
    };
};

function errorHandler(
    res: Response<API$Types.response<any>>,
    error: unknown,
    message: string = ''
) {
    switch ((error as Error).message) {
        case ('UNIMPLEMENTED' as API$Types.errorCode):
            return res.status(501).json({
                code: 'UNIMPLEMENTED',
                data: undefined,
                message,
                success: false
            });

        default: return handleControllerError(
            res,
            error
        );
    };
};

function unimplemented(): never {
    throw new Error('UNIMPLEMENTED' as API$Types.errorCode);
};

// ***************************************************************************************************************
// GET /statistics/overview
// ***************************************************************************************************************

async function getOverviewMetrics(filters: statisticsFiltersType): Promise<overviewMetricsType> {
    const restaurantCondition = (filters.restaurant_id !== undefined)
        ? [Prisma.sql`Orders.restaurant_id = ${filters.restaurant_id}`]
        : [];

    const [
        [orders],
        [newCustomers],
        [reviews],
        [tickets]
    ] = await Promise.all([
        prisma.$queryRaw<{
            orders: rawNumberType,
            delivered: rawNumberType,
            cancelled: rawNumberType,
            gross_revenue: rawNumberType,
            factual_revenue: rawNumberType,
            customers: rawNumberType,
            average_delivery_minutes: rawNumberType
        }[]>(Prisma.sql`
            SELECT
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN ${DELIVERED} THEN 1 ELSE 0 END), 0) AS delivered,
                COALESCE(SUM(CASE WHEN Orders.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
                COALESCE(SUM(CASE WHEN ${NOT_CANCELLED} THEN Orders.total_amount ELSE 0 END), 0) AS gross_revenue,
                COALESCE(SUM(CASE WHEN ${DELIVERED} THEN Orders.total_amount ELSE 0 END), 0) AS factual_revenue,
                COUNT(DISTINCT Orders.user_id) AS customers,
                AVG(CASE
                    WHEN ${DELIVERED} AND Orders.delivered_at IS NOT NULL
                    THEN TIMESTAMPDIFF(MINUTE, Orders.created_at, Orders.delivered_at)
                END) AS average_delivery_minutes
            FROM Orders
            ${whereClause(orderConditions(filters))}
        `),

        // "New" = the customer's first-ever order (within the restaurant filter, if
        // any) lands inside the period.
        prisma.$queryRaw<{ customers: rawNumberType }[]>(Prisma.sql`
            SELECT COUNT(*) AS customers
            FROM (
                SELECT Orders.user_id, MIN(Orders.created_at) AS first_order_at
                FROM Orders
                ${whereClause(restaurantCondition)}
                GROUP BY Orders.user_id
            ) AS first_orders
            ${whereClause(dateRangeConditions(Prisma.sql`first_orders.first_order_at`, filters))}
        `),

        prisma.$queryRaw<{ rating: rawNumberType, reviews: rawNumberType }[]>(Prisma.sql`
            SELECT
                AVG(User_Reviews.rating) AS rating,
                COUNT(User_Reviews.rating) AS reviews
            FROM User_Reviews
            INNER JOIN Orders ON Orders.order_id = User_Reviews.order_id
            ${whereClause([
                ...restaurantCondition,
                ...dateRangeConditions(Prisma.sql`User_Reviews.created_at`, filters)
            ])}
        `),

        prisma.$queryRaw<{ tickets: rawNumberType, revenue: rawNumberType }[]>(Prisma.sql`
            SELECT
                COALESCE(SUM(Tickets_Purchased.quantity), 0) AS tickets,
                COALESCE(SUM(Tickets_Purchased.price), 0) AS revenue
            FROM Tickets_Purchased
            ${whereClause([
                ...((filters.restaurant_id !== undefined) ? [Prisma.sql`Tickets_Purchased.restaurant_id = ${filters.restaurant_id}`] : []),
                ...dateRangeConditions(Prisma.sql`Tickets_Purchased.purchased_at`, filters)
            ])}
        `)
    ]);

    const orderCount = toNumber(orders?.orders);
    const delivered = toNumber(orders?.delivered);
    const factualRevenue = toNumber(orders?.factual_revenue);
    const averageDelivery = toNullableNumber(orders?.average_delivery_minutes);
    const averageRating = toNullableNumber(reviews?.rating);

    return {
        orders: orderCount,
        delivered,
        cancelled: toNumber(orders?.cancelled),
        cancellation_rate: (orderCount > 0) ? round(toNumber(orders?.cancelled) / orderCount) : 0,
        gross_revenue: round(toNumber(orders?.gross_revenue)),
        factual_revenue: round(factualRevenue),
        average_order_value: (delivered > 0) ? round(factualRevenue / delivered) : 0,
        customers: toNumber(orders?.customers),
        new_customers: toNumber(newCustomers?.customers),
        average_delivery_minutes: (averageDelivery === null) ? null : round(averageDelivery),
        average_rating: (averageRating === null) ? null : round(averageRating),
        reviews: toNumber(reviews?.reviews),
        tickets_sold: toNumber(tickets?.tickets),
        tickets_revenue: round(toNumber(tickets?.revenue))
    };
};

function compareMetrics(
    current: overviewMetricsType,
    previous: overviewMetricsType
): overviewChangeType {
    const change = {} as overviewChangeType;

    for (const key of Object.keys(current) as (keyof overviewMetricsType)[]) {
        const now = current[key];
        const before = previous[key];

        change[key] = (now === null || before === null || before === 0)
            ? null
            : round((now - before) / before);
    }

    return change;
};

function toPeriod(from: Date, to: Date): statisticsPeriodType {
    return {
        from: from.toISOString(),
        to: to.toISOString()
    };
};

/**
 * KPI summary for the dashboard header: the period's headline numbers, the
 * same numbers for the immediately preceding period of equal length, and the
 * relative change between them.
 *
 * Period defaults to the current calendar month so far (`from` = 1st of this
 * month, `to` = now).
 */
export async function getOverview(
    req: IAuthenticatedRequest,
    res: Response<API$Types.response<statisticsOverviewType | undefined>>
) {
    const filters = readFilters(req);

    const now = new Date();
    const from = filters.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = filters.to ?? now;

    if (from.getTime() >= to.getTime()) {
        return res.status(400).json({
            code: 'BAD_REQUEST',
            data: undefined,
            message: 'The "from" date must be before the "to" date',
            success: false
        });
    }

    const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));

    try {
        const [
            current,
            previous,
            active_orders
        ] = await Promise.all([
            getOverviewMetrics({ ...filters, from, to }),
            getOverviewMetrics({ ...filters, from: previousFrom, to: from }),
            prisma.orders.count({
                where: {
                    ...orderWhere({ ...filters, from: undefined, to: undefined }),
                    status: { in: [...ACTIVE_ORDER_STATUSES] }
                }
            })
        ]);

        return res.status(200).json({
            data: {
                period: toPeriod(from, to),
                previous_period: toPeriod(previousFrom, from),
                current,
                previous,
                change: compareMetrics(current, previous),
                active_orders
            },
            message: 'Statistics overview retrieved successfully',
            success: true
        });
    } catch (error) {
        return errorHandler(res, error);
    }
};

// ***************************************************************************************************************
// GET /statistics/count/:table/per/:column
// ***************************************************************************************************************

export async function getCountPerProperty(
    req: IAuthenticatedRequest<{
        column: string,
        table: keyof typeof DB$Enumerators.Tables,
    }>,
    res: Response<API$Types.response<(countEntryType | amountEntryType)[] | undefined>>
) {
    const {
        column,
        table
    } = req.params;

    const filters = readFilters(req);

    try {
        switch (table) {
            case 'Orders':
                switch (column) {
                    case 'status':
                        return res.status(200).json({
                            data: (await prisma.orders.groupBy({
                                by: 'status',
                                where: orderWhere(filters),
                                _count: { _all: true }
                            })).map(({ _count, status }) => ({
                                data: _count._all,
                                id: (status ?? '').toString()
                            })),
                            message: 'Order count per status retrieved successfully',
                            success: true
                        });

                    default: return unimplemented();
                }

            case 'Products':
                switch (column) {
                    case 'product_type':
                        return res.status(200).json({
                            data: (await prisma.products.groupBy({
                                by: 'product_type',
                                where: {
                                    ...((filters.restaurant_id !== undefined) ? { restaurant_id: filters.restaurant_id } : {}),
                                    ...(filters.strict ? { delisted: false } : {})
                                },
                                _count: { _all: true }
                            })).map(({ _count, product_type }) => ({
                                data: _count._all,
                                id: (product_type ?? '').toString()
                            })),
                            message: 'Product count per type retrieved successfully',
                            success: true
                        });

                    default: return unimplemented();
                }

            // Payment-method / payment-status breakdown, with the amount moved
            // per group. `strict=true` only counts completed payments.
            case 'Payments':
                switch (column) {
                    case 'payment_method':
                    case 'status': {
                        const where: Prisma.PaymentsWhereInput = {
                            ...((filters.restaurant_id !== undefined) ? { Orders: { restaurant_id: filters.restaurant_id } } : {}),
                            ...((filters.from || filters.to) ? {
                                created_at: {
                                    ...(filters.from ? { gte: filters.from } : {}),
                                    ...(filters.to ? { lt: filters.to } : {})
                                }
                            } : {}),
                            ...(filters.strict ? { status: 'completed' } : {})
                        };

                        const rows = (column === 'payment_method')
                            ? (await prisma.payments.groupBy({
                                by: 'payment_method',
                                where,
                                _count: { _all: true },
                                _sum: { amount: true }
                            })).map(({ _count, _sum, payment_method }) => ({
                                amount: round(_sum.amount?.toNumber() ?? 0),
                                data: _count._all,
                                id: payment_method.toString()
                            }))
                            : (await prisma.payments.groupBy({
                                by: 'status',
                                where,
                                _count: { _all: true },
                                _sum: { amount: true }
                            })).map(({ _count, _sum, status }) => ({
                                amount: round(_sum.amount?.toNumber() ?? 0),
                                data: _count._all,
                                id: (status ?? '').toString()
                            }));

                        return res.status(200).json({
                            data: rows.sort((a, b) => b.data - a.data),
                            message: `Payment count per ${column} retrieved successfully`,
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            case 'Resort_Bookings':
                switch (column) {
                    case 'status':
                        return res.status(200).json({
                            data: (await prisma.resort_Bookings.groupBy({
                                by: 'status',
                                where: (filters.from || filters.to) ? {
                                    created_at: {
                                        ...(filters.from ? { gte: filters.from } : {}),
                                        ...(filters.to ? { lt: filters.to } : {})
                                    }
                                } : {},
                                _count: { _all: true }
                            })).map(({ _count, status }) => ({
                                data: _count._all,
                                id: (status ?? '').toString()
                            })),
                            message: 'Resort booking count per status retrieved successfully',
                            success: true
                        });

                    default: return unimplemented();
                }

            default: return unimplemented();
        };
    } catch (error) {
        return errorHandler(
            res,
            error,
            `The count for table ${table}'s ${column} has not been implemented yet`
        );
    }
};

// ***************************************************************************************************************
// GET /statistics/:table/report/:fact
// ***************************************************************************************************************

const REVENUE_BUCKETS: Readonly<Record<dateIntervalsType, { key: 'day' | 'month' | 'year', expression: Prisma.Sql }>> = {
    daily: { key: 'day', expression: Prisma.raw('DAY(Orders.created_at)') },
    monthly: { key: 'month', expression: Prisma.raw('MONTH(Orders.created_at)') },
    yearly: { key: 'year', expression: Prisma.raw('YEAR(Orders.created_at)') }
};

export async function getReport(
    req: IAuthenticatedRequest<{
        fact: keyof typeof Madeirense$Enumerators.StatisticsParameters.Fact,
        table: keyof typeof DB$Enumerators.Tables,
    }>,
    res: Response<API$Types.response<orderRevenueType[] | peakHourEntryType[] | deliveryTimeEntryType[] | undefined>>
) {
    const {
        fact,
        table
    } = req.params;

    const filters = readFilters(req);

    try {
        switch (table) {
            case 'Orders':
                switch (fact) {
                    // Revenue per day (of `month`/`year`), per month (of `year`), or
                    // per year (all years). `total` = every order's amount; `factual`
                    // = delivered orders only. Missing buckets are simply absent —
                    // the web chart already fills gaps with 0.
                    case Madeirense$Enumerators.StatisticsParameters.Fact.revenue: {
                        const now = new Date();
                        const interval = (req.query[SearchQueries.interval] as dateIntervalsType | undefined) || 'monthly';
                        const year = parseIntegerQuery(req.query[SearchQueries.year]) ?? now.getFullYear();
                        const month = parseIntegerQuery(req.query[SearchQueries.month]) ?? (now.getMonth() + 1);

                        const bucket = REVENUE_BUCKETS[interval];

                        const conditions = orderConditions(filters);

                        if (interval !== 'yearly') conditions.push(Prisma.sql`YEAR(Orders.created_at) = ${year}`);
                        if (interval === 'daily') conditions.push(Prisma.sql`MONTH(Orders.created_at) = ${month}`);

                        const rows = await prisma.$queryRaw<{
                            bucket: rawNumberType,
                            orders: rawNumberType,
                            total: rawNumberType,
                            factual: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                ${bucket.expression} AS bucket,
                                COUNT(*) AS orders,
                                COALESCE(SUM(Orders.total_amount), 0) AS total,
                                COALESCE(SUM(CASE WHEN ${DELIVERED} THEN Orders.total_amount ELSE 0 END), 0) AS factual
                            FROM Orders
                            ${whereClause(conditions)}
                            GROUP BY bucket
                            ORDER BY bucket DESC
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                [bucket.key]: toNumber(row.bucket),
                                factual: round(toNumber(row.factual)),
                                orders: toNumber(row.orders),
                                total: round(toNumber(row.total))
                            })),
                            message: 'Order revenue retrieved successfully',
                            success: true
                        });
                    }

                    // Order volume per weekday × hour-of-day (heatmap). Cancelled
                    // orders excluded.
                    case Madeirense$Enumerators.StatisticsParameters.Fact.peak_hours: {
                        const rows = await prisma.$queryRaw<{
                            weekday: rawNumberType,
                            hour: rawNumberType,
                            orders: rawNumberType,
                            revenue: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                DAYOFWEEK(Orders.created_at) AS weekday,
                                HOUR(Orders.created_at) AS hour,
                                COUNT(*) AS orders,
                                COALESCE(SUM(Orders.total_amount), 0) AS revenue
                            FROM Orders
                            ${whereClause([...orderConditions(filters), NOT_CANCELLED])}
                            GROUP BY weekday, hour
                            ORDER BY weekday ASC, hour ASC
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                hour: toNumber(row.hour),
                                orders: toNumber(row.orders),
                                revenue: round(toNumber(row.revenue)),
                                weekday: toNumber(row.weekday)
                            })),
                            message: 'Order peak hours retrieved successfully',
                            success: true
                        });
                    }

                    // Average order → delivered time per restaurant, next to the
                    // restaurant's own ttp/ttd targets.
                    case Madeirense$Enumerators.StatisticsParameters.Fact.delivery_time: {
                        const rows = await prisma.$queryRaw<{
                            restaurant_id: rawNumberType,
                            name: string,
                            ttp: rawNumberType,
                            ttd: rawNumberType,
                            deliveries: rawNumberType,
                            average_minutes: rawNumberType,
                            min_minutes: rawNumberType,
                            max_minutes: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                Restaurants.restaurant_id,
                                Restaurants.name,
                                Restaurants.ttp,
                                Restaurants.ttd,
                                COUNT(Orders.order_id) AS deliveries,
                                AVG(TIMESTAMPDIFF(MINUTE, Orders.created_at, Orders.delivered_at)) AS average_minutes,
                                MIN(TIMESTAMPDIFF(MINUTE, Orders.created_at, Orders.delivered_at)) AS min_minutes,
                                MAX(TIMESTAMPDIFF(MINUTE, Orders.created_at, Orders.delivered_at)) AS max_minutes
                            FROM Restaurants
                            INNER JOIN Orders ON Orders.restaurant_id = Restaurants.restaurant_id
                            ${whereClause([
                                ...orderConditions(filters),
                                DELIVERED,
                                Prisma.sql`Orders.delivered_at IS NOT NULL`,
                                Prisma.sql`Orders.delivered_at >= Orders.created_at`
                            ])}
                            GROUP BY Restaurants.restaurant_id
                            ORDER BY average_minutes ASC
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                average_minutes: round(toNumber(row.average_minutes)),
                                deliveries: toNumber(row.deliveries),
                                max_minutes: toNumber(row.max_minutes),
                                min_minutes: toNumber(row.min_minutes),
                                name: row.name,
                                restaurant_id: toNumber(row.restaurant_id),
                                ttd: toNumber(row.ttd),
                                ttp: toNumber(row.ttp)
                            })),
                            message: 'Delivery times retrieved successfully',
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            default: return unimplemented();
        };
    } catch (error) {
        return errorHandler(
            res,
            error,
            `Cannot report ${fact} for ${table} as it has not been implemented yet`
        );
    }
};

// ***************************************************************************************************************
// GET /statistics/:table/:relation/count
// ***************************************************************************************************************

export async function getRelationCount(
    req: IAuthenticatedRequest<{
        relation: keyof typeof DB$Enumerators.Tables,
        table: keyof typeof DB$Enumerators.Tables,
    }>,
    res: Response<API$Types.response<countEntryType[] | undefined>>
) {
    const {
        table,
        relation
    } = req.params;

    const filters = readFilters(req);

    try {
        switch (table) {
            case 'Orders':
                switch (relation) {
                    case 'Restaurants': {
                        const restaurant_id = filters.restaurant_id;

                        if (restaurant_id === undefined) {
                            return res.status(400).json({
                                code: 'BAD_REQUEST',
                                data: undefined,
                                message: 'The restaurant_id property must be specified in the query for this statistic count',
                                success: false
                            });
                        }

                        if (!(await prisma.restaurants.findUnique({
                            where: {
                                restaurant_id
                            },
                            select: {
                                restaurant_id: true
                            }
                        }))) {
                            return res.status(404).json({
                                code: 'API_GENERIC_NOT_FOUND_ERROR',
                                data: undefined,
                                message: 'Restaurant not found',
                                success: false
                            });
                        };

                        return res.status(200).json({
                            data: (await prisma.orders.groupBy({
                                by: 'status',
                                where: orderWhere(filters),
                                _count: { _all: true }
                            })).map(({ _count, status }) => ({
                                data: _count._all,
                                id: (status ?? '').toString()
                            })),
                            message: 'Restaurant orders statistic retrieved successfully',
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            case 'Restaurants':
                switch (relation) {
                    case 'Orders':
                        return res.status(200).json({
                            data: (await prisma.orders.groupBy({
                                by: 'restaurant_id',
                                where: {
                                    ...orderWhere(filters),
                                    ...(filters.strict ? { status: 'delivered' } : {})
                                },
                                _count: { _all: true }
                            })).map(({ _count, restaurant_id }) => ({
                                data: _count._all,
                                id: restaurant_id
                            })),
                            message: 'All restaurant orders statistic retrieved successfully',
                            success: true
                        });

                    default: return unimplemented();
                }

            default: return unimplemented();
        };
    } catch (error) {
        return errorHandler(
            res,
            error,
            `The count for table ${table} and relation ${relation} have not been implemented yet`
        );
    }
};

// ***************************************************************************************************************
// GET /statistics/:table/:relation/:action/count
// ***************************************************************************************************************

export async function getRelationActionCount(
    req: IAuthenticatedRequest<{
        action: keyof typeof Madeirense$Enumerators.StatisticsParameters.Actions,
        relation: keyof typeof DB$Enumerators.Tables,
        table: keyof typeof DB$Enumerators.Tables,
    }>,
    res: Response<API$Types.response<object[] | undefined>>
) {
    const {
        action,
        relation,
        table
    } = req.params;

    const filters = readFilters(req);

    try {
        switch (table) {
            case 'Coupons':
                switch (relation) {
                    case 'Orders':
                        switch (action) {
                            // How many orders used each coupon, and the order value
                            // those orders carried. `strict=true` = delivered only.
                            case Madeirense$Enumerators.StatisticsParameters.Actions.use: {
                                const rows = await prisma.$queryRaw<{
                                    coupon_id: rawNumberType,
                                    code: string,
                                    discount: rawNumberType,
                                    expires_at: Date,
                                    orders: rawNumberType,
                                    revenue: rawNumberType
                                }[]>(Prisma.sql`
                                    SELECT
                                        Coupons.coupon_id,
                                        Coupons.code,
                                        Coupons.discount,
                                        Coupons.expires_at,
                                        COUNT(Orders.order_id) AS orders,
                                        COALESCE(SUM(Orders.total_amount), 0) AS revenue
                                    FROM Coupons
                                    INNER JOIN Orders ON Orders.coupon_id = Coupons.coupon_id
                                    ${whereClause([
                                        ...orderConditions(filters),
                                        ...(filters.strict ? [DELIVERED] : [])
                                    ])}
                                    GROUP BY Coupons.coupon_id
                                    ORDER BY orders DESC, Coupons.coupon_id ASC
                                `);

                                return res.status(200).json({
                                    data: rows.map((row) => ({
                                        code: row.code,
                                        coupon_id: toNumber(row.coupon_id),
                                        discount: toNumber(row.discount),
                                        expires_at: row.expires_at,
                                        orders: toNumber(row.orders),
                                        revenue: round(toNumber(row.revenue))
                                    })),
                                    message: 'Coupon use count retrieved successfully',
                                    success: true
                                });
                            }

                            default: return unimplemented();
                        }

                    default: return unimplemented();
                }

            default: return unimplemented();
        };
    } catch (error) {
        return errorHandler(
            res,
            error,
            `The count for table ${table} with relation to ${relation} and action ${action} have not been implemented yet`
        );
    }
};

// ***************************************************************************************************************
// GET /statistics/:table/:relation/top
// ***************************************************************************************************************

const LOCATION_GROUP_EXPRESSIONS: Readonly<Record<topLocationGroupType, Prisma.Sql>> = {
    neighborhood: Prisma.raw(`COALESCE(NULLIF(TRIM(Delivery_Locations.neighborhood), ''), 'Diversas')`),
    city: Prisma.raw(`COALESCE(NULLIF(TRIM(Delivery_Locations.city), ''), 'Diversas')`),
    state: Prisma.raw(`COALESCE(NULLIF(TRIM(Delivery_Locations.state), ''), 'Diversas')`),
    country: Prisma.raw(`COALESCE(NULLIF(TRIM(Delivery_Locations.country), ''), 'Diversas')`)
};

export async function getTopRelation(
    req: IAuthenticatedRequest<{
        table: keyof typeof DB$Enumerators.Tables,
        relation: keyof typeof DB$Enumerators.Tables,
    }>,
    res: Response<API$Types.response<object[] | undefined>>
) {
    const {
        table,
        relation
    } = req.params;

    const filters = readFilters(req);
    const quantity = readQuantity(req);

    try {
        switch (table) {
            case 'Users':
                switch (relation) {
                    case 'Orders': {
                        const role = ((req.query[SearchQueries.user_role] as topUserRoleType | undefined) || 'Driver');

                        // Top customers: by number of (non-cancelled) orders, then spend.
                        if (role === 'Customer') {
                            const rows = await prisma.$queryRaw<{
                                user_id: rawNumberType,
                                name: string,
                                email: string,
                                phone: string,
                                profile_photo: string | null,
                                orders: rawNumberType,
                                total_spent: rawNumberType,
                                last_order_at: Date | null
                            }[]>(Prisma.sql`
                                SELECT
                                    Users.user_id,
                                    Users.name,
                                    Users.email,
                                    Users.phone,
                                    Users.profile_photo,
                                    COUNT(Orders.order_id) AS orders,
                                    COALESCE(SUM(Orders.total_amount), 0) AS total_spent,
                                    MAX(Orders.created_at) AS last_order_at
                                FROM Users
                                INNER JOIN Orders ON Orders.user_id = Users.user_id
                                ${whereClause([
                                    Prisma.sql`Users.user_role = 'Customer'`,
                                    ...orderConditions(filters),
                                    (filters.strict ? DELIVERED : NOT_CANCELLED)
                                ])}
                                GROUP BY Users.user_id
                                ORDER BY orders DESC, total_spent DESC, Users.user_id ASC
                                LIMIT ${quantity}
                            `);

                            return res.status(200).json({
                                data: rows.map((row): topCustomerEntryType => ({
                                    email: row.email,
                                    last_order_at: row.last_order_at,
                                    name: row.name,
                                    orders: toNumber(row.orders),
                                    phone: row.phone,
                                    profile_photo: row.profile_photo,
                                    total_spent: round(toNumber(row.total_spent)),
                                    user_id: toNumber(row.user_id)
                                })),
                                message: 'Top customers retrieved successfully',
                                success: true
                            });
                        }

                        // Top couriers: by orders assigned to them (`strict=true` =
                        // delivered only).
                        const rows = await prisma.$queryRaw<{
                            user_id: rawNumberType,
                            name: string,
                            email: string,
                            phone: string,
                            profile_photo: string | null,
                            orders: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                Users.user_id,
                                Users.name,
                                Users.email,
                                Users.phone,
                                Users.profile_photo,
                                COUNT(Orders.order_id) AS orders
                            FROM Users
                            INNER JOIN Orders ON Orders.courier_id = Users.user_id
                            ${whereClause([
                                Prisma.sql`Users.user_role = 'Driver'`,
                                ...orderConditions(filters),
                                ...(filters.strict ? [DELIVERED] : [])
                            ])}
                            GROUP BY Users.user_id
                            ORDER BY orders DESC, Users.user_id ASC
                            LIMIT ${quantity}
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                email: row.email,
                                name: row.name,
                                orders: toNumber(row.orders),
                                phone: row.phone,
                                profile_photo: row.profile_photo,
                                user_id: toNumber(row.user_id)
                            })),
                            message: 'Top couriers retrieved successfully',
                            success: true,
                        });
                    }

                    default: return unimplemented();
                }

            case 'Delivery_Locations':
                switch (relation) {
                    // Order volume per area. Empty/NULL values fold into one
                    // "Diversas" bucket. `location_id` is the lowest location in
                    // the group — kept so clients have a stable row key.
                    case 'Orders': {
                        const group_by = ((req.query[SearchQueries.group_by] as topLocationGroupType | undefined) || 'neighborhood');

                        const rows = await prisma.$queryRaw<{
                            label: string,
                            location_id: rawNumberType,
                            orders: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                ${LOCATION_GROUP_EXPRESSIONS[group_by]} AS label,
                                MIN(Delivery_Locations.location_id) AS location_id,
                                COUNT(Orders.order_id) AS orders
                            FROM Delivery_Locations
                            INNER JOIN Orders ON Orders.delivery_address = Delivery_Locations.location_id
                            ${whereClause([
                                ...orderConditions(filters),
                                ...(filters.strict ? [DELIVERED] : [])
                            ])}
                            GROUP BY label
                            ORDER BY orders DESC, label ASC
                            LIMIT ${quantity}
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                [group_by]: row.label,
                                group_by,
                                label: row.label,
                                location_id: toNumber(row.location_id),
                                orders: toNumber(row.orders)
                            })),
                            message: 'Top order locations retrieved successfully',
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            case 'Products':
                switch (relation) {
                    // Best sellers. `orders` = distinct orders containing the
                    // product; `quantity` = units sold. Cancelled orders never
                    // count; `strict=true` additionally hides delisted products.
                    case 'Orders': {
                        const rows = await prisma.$queryRaw<{
                            product_id: rawNumberType,
                            name: string,
                            thumbnail: string | null,
                            price: rawNumberType,
                            delisted: boolean | number | null,
                            discount: rawNumberType,
                            product_type: string | null,
                            restaurant_id: rawNumberType,
                            orders: rawNumberType,
                            quantity: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                Products.product_id,
                                Products.name,
                                Products.thumbnail,
                                Products.price,
                                Products.delisted,
                                Products.discount,
                                Products.product_type,
                                Products.restaurant_id,
                                COUNT(DISTINCT Orders.order_id) AS orders,
                                COALESCE(SUM(Order_Items.quantity), 0) AS quantity
                            FROM Products
                            INNER JOIN Order_Items ON Order_Items.product_id = Products.product_id
                            INNER JOIN Orders ON Orders.order_id = Order_Items.order_id
                            ${whereClause([
                                ...orderConditions(filters),
                                NOT_CANCELLED,
                                ...(filters.strict ? [Prisma.sql`(Products.delisted IS NULL OR Products.delisted = 0)`] : [])
                            ])}
                            GROUP BY Products.product_id
                            ORDER BY quantity DESC, orders DESC, Products.product_id ASC
                            LIMIT ${quantity}
                        `);

                        return res.status(200).json({
                            data: rows.map((row) => ({
                                delisted: Boolean(row.delisted),
                                discount: toNumber(row.discount),
                                name: row.name,
                                orders: toNumber(row.orders),
                                price: toNumber(row.price),
                                product_id: toNumber(row.product_id),
                                product_type: row.product_type,
                                quantity: toNumber(row.quantity),
                                restaurant_id: toNullableNumber(row.restaurant_id),
                                thumbnail: row.thumbnail
                            })),
                            message: `Top ${quantity} products retrieved successfully`,
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            case 'Restaurants':
                switch (relation) {
                    // Restaurant leaderboard by delivered revenue.
                    case 'Orders': {
                        const rows = await prisma.$queryRaw<{
                            restaurant_id: rawNumberType,
                            name: string,
                            thumbnail_url: string | null,
                            orders: rawNumberType,
                            delivered: rawNumberType,
                            cancelled: rawNumberType,
                            gross_revenue: rawNumberType,
                            factual_revenue: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                Restaurants.restaurant_id,
                                Restaurants.name,
                                Restaurants.thumbnail_url,
                                COUNT(Orders.order_id) AS orders,
                                COALESCE(SUM(CASE WHEN ${DELIVERED} THEN 1 ELSE 0 END), 0) AS delivered,
                                COALESCE(SUM(CASE WHEN Orders.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
                                COALESCE(SUM(CASE WHEN ${NOT_CANCELLED} THEN Orders.total_amount ELSE 0 END), 0) AS gross_revenue,
                                COALESCE(SUM(CASE WHEN ${DELIVERED} THEN Orders.total_amount ELSE 0 END), 0) AS factual_revenue
                            FROM Restaurants
                            INNER JOIN Orders ON Orders.restaurant_id = Restaurants.restaurant_id
                            ${whereClause(orderConditions(filters))}
                            GROUP BY Restaurants.restaurant_id
                            ORDER BY factual_revenue DESC, orders DESC, Restaurants.restaurant_id ASC
                            LIMIT ${quantity}
                        `);

                        return res.status(200).json({
                            data: rows.map((row): topRestaurantEntryType => ({
                                cancelled: toNumber(row.cancelled),
                                delivered: toNumber(row.delivered),
                                factual_revenue: round(toNumber(row.factual_revenue)),
                                gross_revenue: round(toNumber(row.gross_revenue)),
                                name: row.name,
                                orders: toNumber(row.orders),
                                restaurant_id: toNumber(row.restaurant_id),
                                thumbnail_url: row.thumbnail_url
                            })),
                            message: 'Top restaurants retrieved successfully',
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            case 'Restaurant_Events':
                switch (relation) {
                    // Events by tickets sold, with check-ins and occupancy.
                    // `Tickets_Purchased.price` is the line total (unit × quantity).
                    case 'Tickets_Purchased': {
                        const rows = await prisma.$queryRaw<{
                            event_id: rawNumberType,
                            restaurant_id: rawNumberType,
                            name: string,
                            event_date: Date,
                            thumbnail_url: string | null,
                            spots: rawNumberType,
                            tickets: rawNumberType,
                            validated: rawNumberType,
                            revenue: rawNumberType
                        }[]>(Prisma.sql`
                            SELECT
                                Restaurant_Events.event_id,
                                Restaurant_Events.restaurant_id,
                                Restaurant_Events.name,
                                Restaurant_Events.event_date,
                                Restaurant_Events.thumbnail_url,
                                Restaurant_Events.spots,
                                COALESCE(SUM(COALESCE(Tickets_Purchased.quantity, 1)), 0) AS tickets,
                                COALESCE(SUM(CASE WHEN Tickets_Purchased.validated_at IS NOT NULL THEN COALESCE(Tickets_Purchased.quantity, 1) ELSE 0 END), 0) AS validated,
                                COALESCE(SUM(Tickets_Purchased.price), 0) AS revenue
                            FROM Restaurant_Events
                            INNER JOIN Tickets_Purchased ON Tickets_Purchased.event_id = Restaurant_Events.event_id
                            ${whereClause([
                                ...((filters.restaurant_id !== undefined) ? [Prisma.sql`Restaurant_Events.restaurant_id = ${filters.restaurant_id}`] : []),
                                ...dateRangeConditions(Prisma.sql`Tickets_Purchased.purchased_at`, filters)
                            ])}
                            GROUP BY Restaurant_Events.event_id
                            ORDER BY tickets DESC, revenue DESC, Restaurant_Events.event_id ASC
                            LIMIT ${quantity}
                        `);

                        return res.status(200).json({
                            data: rows.map((row): topEventEntryType => {
                                const spots = toNullableNumber(row.spots);
                                const tickets = toNumber(row.tickets);

                                return {
                                    event_date: row.event_date,
                                    event_id: toNumber(row.event_id),
                                    name: row.name,
                                    occupancy: (spots !== null && spots > 0) ? round(tickets / spots) : null,
                                    restaurant_id: toNumber(row.restaurant_id),
                                    revenue: round(toNumber(row.revenue)),
                                    spots,
                                    thumbnail_url: row.thumbnail_url,
                                    tickets,
                                    validated: toNumber(row.validated)
                                };
                            }),
                            message: 'Top events retrieved successfully',
                            success: true
                        });
                    }

                    default: return unimplemented();
                }

            default: return unimplemented();
        };
    } catch (error) {
        return errorHandler(
            res,
            error,
            `Cannot get top ${relation} for ${table} as it hasn't been implemented yet`
        );
    }
};
