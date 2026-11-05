import {
    type ComponentPropsWithoutRef
} from "react";

import {
    resolveClassNames
} from "@Madeirense/shared";

import {
    useApp
} from "contexts/App";

import {
    useOrders
} from "contexts/Orders";

import RestaurantCardWithoutNavigation from "components/cards/restaurant";

import styles from "./reserved.module.css";

// ***************************************************************************************************************

function RESERVED_EVENT_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    const {
        get
    } = useApp();

    const {
        orders
    } = useOrders();

    const {
        restaurant_id,
        Order_Items = []
    } = orders.at(-1) ?? {};

    const restaurant = get("Restaurants")?.find(r => r.restaurant_id === restaurant_id);

    return <main className={resolveClassNames(styles.main, className)} {...props}>
        <h1>Reservado!</h1>

        <p>Reservamos os teu ingresso, quando chegares ao restaurante: </p>

        {restaurant && <RestaurantCardWithoutNavigation {...{ restaurant }} />}
    </main>
};

export default RESERVED_EVENT_FLASHER;