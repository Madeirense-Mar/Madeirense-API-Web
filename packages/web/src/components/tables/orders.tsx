import {
    Fragment,
    useMemo,
    useState,
    type ComponentProps
} from "react";

import {
    ORDERS_FINISHED_STATUS,
    ORDERS_PREPARATION_STATUS,
    resolveClassNames,
    type restaurantType,
    type restaurantOrderType,
} from "@Madeirense/shared";

import { useApp } from "contexts/App";
import { useOrders } from "contexts/Orders";

import Button from "components/buttons";
import Icon from "components/icon";

import OrderCard from "components/cards/order";
import OrderCardLoader from "components/cards/order/loader";
import OrderChatForm from "components/forms/orders/chat";
import OrderHistoryList from "components/lists/order/history";
import OrderSummaryView from "components/views/orders/summary";

import styles from "./orders.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"table"> {
    mode?: "order" | "summary";
    order_id?: number;
};

function Orders({
    mode = "order",
    order_id,
    ..._props
}: IPropTypes) {
    const { get } = useApp();

    const {
        orders,
        state,
    } = useOrders();

    const [currentSection, setSection] = useState<"summary" | "history" | "chat">("summary");
    const [error, setError] = useState<Error | null>(null);
    const [show, toggle] = useState<boolean>(false);

    const byType = (order: restaurantOrderType) => {
        if (
            ORDERS_FINISHED_STATUS.includes(order.status as $Enums.Orders_status) ||
            order.Order_Items.some(i => ["ticket"].includes(i.Products?.product_type as $Enums.Products_product_type))
        ) return false;

        return true;
    };

    const restaurants = get("Restaurants") as restaurantType[];

    const ordersByRestaurants: [number, restaurantOrderType[]][] = useMemo(() => {
        const entries: [number, restaurantOrderType[]][] = [];

        orders.filter(byType).forEach(order => {
            const index = entries.findIndex(([restaurant_id]) => restaurant_id === order.restaurant_id);

            if (index === -1) entries.push([order.restaurant_id, [order]]);
            else entries[index][1].push(order);
        });

        return entries;
    }, [orders]);

    const selectedOrder = useMemo(() => (!order_id) ? null : orders.find((o) => o.order_id === order_id), [orders, order_id]);

    const ROWS = useMemo(() => ordersByRestaurants
        .map(entry => {
            const [
                restaurant_id,
                __orders
            ] = entry;

            return <Fragment key={restaurant_id}>
                <tr data-row="restaurant">
                    <td colSpan={mode === "summary" ? 3 : undefined}>
                        <span>{restaurants.find(({ restaurant_id: rId }) => rId === restaurant_id)?.name}</span>
                    </td>
                </tr>

                {__orders
                    .filter(({ status }) => ORDERS_PREPARATION_STATUS.includes(status as $Enums.Orders_status))
                    .map(_order => <tr key={_order.order_id}><td>
                        <OrderCard order={_order} className="w-full" />
                    </td>
                    </tr>)
                }
            </Fragment>;
        }), [ordersByRestaurants, restaurants, mode]
    );

    const TABLE_ERROR_ROW = (!error) ? null : <tr data-type="error">
        <td colSpan={mode === "summary" ? 3 : undefined}>
            <div>
                <Icon name="ExclamationCircle" />

                <span>{error.message}</span>

                <Icon name="Close" className="ml-auto cursor-pointer" onClick={() => setError(null)} />
            </div>
        </td>
    </tr>;

    const {
        className,
        ...props
    } = _props;

    const $tableProps = {
        "className": resolveClassNames(styles[mode], className),
        ...props
    };

    switch (mode) {
        case "order": {
            return <div
                className={styles.wrapper}
                onClick={show ? undefined : () => toggle(true)}
                onMouseLeave={() => toggle(false)}
                {...{
                    ...(Boolean(ordersByRestaurants.length) ? { ["data-visible"]: "" } : {}),
                    ...(show ? { ["data-expanded"]: "" } : {})
                }}
            >
                {show && <Button shape="circle" onClick={() => toggle(false)}>
                    <Icon name="Close" />
                </Button>}

                <table
                    data-state={state}
                    {...$tableProps}
                >
                    <tfoot>
                        <tr>
                            <td>
                                <div className="flex flex-row items-center justify-start gap-2 w-full">
                                    <Icon name="Order" />

                                    <span className="mr-auto">Pedidos</span>

                                    <span className={`font-black text-2xl ml-auto${!show ? " opacity-100" : " opacity-0"}`}>
                                        {orders.filter(byType).filter(({ status }) => ORDERS_PREPARATION_STATUS.includes(status as $Enums.Orders_status)).length}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tfoot>

                    <tbody>
                        {TABLE_ERROR_ROW}

                        {ROWS}
                    </tbody>
                </table>
            </div>
        };

        case "summary": {
            if (!selectedOrder || !order_id) return null;

            const asseritions = {
                "isFinalized": [
                    "cancelled",
                    "delivered"
                ].includes(selectedOrder.status ?? "cancelled")
            }

            const sections = [
                { key: "Sumário", value: "summary", icon: <Icon name="Notes" /> },
                ...(asseritions.isFinalized ? [] : [{ key: `Chat`, value: "chat", icon: <Icon name="Chat" /> }]),
                { key: "Histórico", value: "history", icon: <Icon name="History" /> },
            ];

            return <table {...$tableProps}>
                <tfoot>
                    <tr>
                        {sections.map(kvp => <td key={kvp.key}>
                            <Button className="w-full" onClick={() => setSection(kvp.value as any)} variant={`text${(currentSection === kvp.value) ? "-selected" : ""}`}>
                                {kvp.key}

                                {kvp.icon}
                            </Button>
                        </td>)}
                    </tr>

                    <tr>
                        {(currentSection === "summary") && <td colSpan={sections.length} data-section={currentSection}>
                            <OrderSummaryView className="flex flex-col justify-start items-start gap-3 w-full" {...{ order_id }} />
                        </td>}

                        {(currentSection === "chat") && <td colSpan={sections.length} data-section={currentSection}>
                            <OrderChatForm {...{ order_id }} />
                        </td>}

                        {(currentSection === "history") && <td colSpan={sections.length} data-section={currentSection}>
                            <OrderHistoryList {...{ order_id }} />
                        </td>}
                    </tr>
                </tfoot>

                <tbody>
                    {TABLE_ERROR_ROW}

                    <tr>
                        <td colSpan={3}>
                            {(state === "cancelling")
                                ? <OrderCardLoader className="w-full" />

                                : <OrderCard className="w-full" order={selectedOrder} disableLink />
                            }
                        </td>
                    </tr>
                </tbody>
            </table>
        };

        default: return null;
    }
};

export default Orders;