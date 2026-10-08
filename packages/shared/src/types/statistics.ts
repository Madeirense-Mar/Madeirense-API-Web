export type countEntryType = {
    id: string | number,
    data: number
};

/**
 * A `countEntryType` that also carries a monetary sum for the same group
 * (e.g. payments per method: how many, and how much).
 */
export type amountEntryType = countEntryType & {
    amount: number
};

/** Closed-open date range `[from, to)` a statistic was computed over. */
export type statisticsPeriodType = {
    from: string,
    to: string
};

export type overviewMetricsType = {
    /** Every order created in the period, whatever its status. */
    orders: number,
    delivered: number,
    cancelled: number,
    /** Share of `orders` that were cancelled, 0 – 1. */
    cancellation_rate: number,
    /** Sum of `total_amount` for every non-cancelled order. */
    gross_revenue: number,
    /** Sum of `total_amount` for delivered orders only. */
    factual_revenue: number,
    /** `factual_revenue / delivered`. */
    average_order_value: number,
    /** Distinct users that placed at least one order in the period. */
    customers: number,
    /** Users whose first-ever order (within the restaurant filter) falls in the period. */
    new_customers: number,
    /** Mean minutes between `created_at` and `delivered_at`, delivered orders only. `null` when there are none. */
    average_delivery_minutes: number | null,
    /** Mean review rating (1 – 5) for reviews left in the period. `null` when there are none. */
    average_rating: number | null,
    reviews: number,
    /** Sum of `Tickets_Purchased.quantity` bought in the period. */
    tickets_sold: number,
    tickets_revenue: number
};

export type overviewChangeType = {
    [K in keyof overviewMetricsType]: number | null
};

export type statisticsOverviewType = {
    period: statisticsPeriodType,
    previous_period: statisticsPeriodType,
    current: overviewMetricsType,
    previous: overviewMetricsType,
    /** Relative change current vs previous (0.25 = +25%). `null` when the previous value is 0/null. */
    change: overviewChangeType,
    /** Orders not yet delivered or cancelled right now — not bound to the period. */
    active_orders: number
};

export type peakHourEntryType = {
    /** 1 = Sunday … 7 = Saturday (MySQL `DAYOFWEEK`). */
    weekday: number,
    /** 0 – 23. */
    hour: number,
    orders: number,
    revenue: number
};

export type deliveryTimeEntryType = {
    restaurant_id: number,
    name: string,
    deliveries: number,
    average_minutes: number,
    min_minutes: number,
    max_minutes: number,
    /** The restaurant's configured time-to-prepare / time-to-deliver targets, in minutes. */
    ttp: number,
    ttd: number
};

export type topRestaurantEntryType = {
    restaurant_id: number,
    name: string,
    thumbnail_url: string | null,
    orders: number,
    delivered: number,
    cancelled: number,
    gross_revenue: number,
    factual_revenue: number
};

export type topCustomerEntryType = {
    user_id: number,
    name: string,
    email: string,
    phone: string,
    profile_photo: string | null,
    orders: number,
    total_spent: number,
    last_order_at: Date | string | null
};

export type topEventEntryType = {
    event_id: number,
    restaurant_id: number,
    name: string,
    event_date: Date | string,
    thumbnail_url: string | null,
    spots: number | null,
    tickets: number,
    validated: number,
    revenue: number,
    /** `tickets / spots`, 0 – 1. `null` when the event has no spot limit. */
    occupancy: number | null
};
