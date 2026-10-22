import {
    resolveClassNames,
    type restaurantType
} from "@Madeirense/shared";

import { useApp } from "contexts/App";

import Icon from "components/icon";
import RestaurantCard from "components/cards/restaurant";
import OrdersList from "components/lists/order";
import StaffList from "components/lists/staff";

import styles from "./Restaurant.module.css";

// ***************************************************************************************************************

function RestaurantPanel({ id }: { id: number }) {
    const {
        get,
        state
    } = useApp();

    const restaurant = get("Restaurants")?.find(({ restaurant_id }) => restaurant_id === id) as restaurantType;

    switch (state) {
        case "loading": {
            return <div className="w-full flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </div>
        }

        default: {
            return <>
                <RestaurantCard className="w-full" {...{ restaurant }} />

                <h4>Pedidos (a decorrer)</h4>

                <OrdersList
                    mode="admin"
                    className="w-full"
                    type="orders"
                    filter="delivery"
                    defaultRestaurant={restaurant.restaurant_id}
                    statusType="ongoing"
                />

                <h4>Equipa</h4>

                <StaffList
                    className={resolveClassNames(styles["staff-list"], "w-full")}
                    defaultRestaurantId={restaurant.restaurant_id}
                />
            </>
        }
    }
};

export default RestaurantPanel;