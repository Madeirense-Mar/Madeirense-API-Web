import {
    ComponentProps,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useInfiniteQuery
} from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    Madeirense$Types,
    resolveClassNames,
    type appPreferencesType,
    type restaurantOrderType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, {
    Queries$Types
} from "configurations/queries";

import Icon from "components/icon";
import Tag from "components/tags";

import OrderChatForm from "components/forms/orders/chat";
import OrderItemsList from "components/lists/order/items";
import OrderHistoryList from "components/lists/order/history";

import LeafletDeliveriesTracker from "components/maps/leaflet/deliveriesTracker";

import styles from "./Deliveries.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

import "./Deliveries.css";
import Button from "components/buttons";

// ***************************************************************************************************************

function BackOfficeDeliveriesPage({ className, ...props }: ComponentProps<"main">) {
    const { Storage } = useMemo(() => MXP$App, []);

    const {
        data,
        error,
        refetch,
    } = useInfiniteQuery({
        queryKey: ([
            "App$GetOngoingDeliveries",
            "orders",
            {
                statuses: ["assigned"] as $Enums.Orders_status[],
                type: "delivery"
            } as Madeirense$Types.searchQueryRecord
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ApplicationQueries.getList<restaurantOrderType>,
        getNextPageParam: (lastPage) => {
            return (lastPage.pagination?.hasNext)
                ? lastPage.pagination.page + 1
                : undefined;
        },
        initialPageParam: 1
    });

    const deliveries = useMemo(() => (data?.pages.flatMap(page => page.data) || []), [data]);

    const [toggled, setToggled] = useState(true);
    const [order, setOrder] = useState<restaurantOrderType | null>(null);

    const handleToggle = () => setToggled(t => !t);

    const pickOrder = (order: restaurantOrderType | null) => setOrder(order);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            if (!notificationId.includes("BACK_OFFICE")) return;

            switch (notificationId) {
                case "MXP$ORDER_STATUS_UPDATE":
                    refetch(); break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [refetch, Storage]);

    const $mainProps = {
        className: resolveClassNames(styles.main, className),
        ...props
    };

    switch (true) {
        case (error instanceof Error): {
            return <main {...$mainProps}>
                <section data-state="error" className="w-full min-h-[300px] flex flex-col justify-center items-center rounded-lg gap-4">
                    <Tag variant="danger">
                        <Icon name="ExclamationCircle" />

                        {error.message}

                        <Icon name="ExclamationCircle" />
                    </Tag>
                </section>
            </main>
        };

        default: {
            return <main {...$mainProps}>
                {deliveries && <LeafletDeliveriesTracker
                    className={styles.tracker}
                    orders={deliveries as restaurantOrderType[]}
                    onOrderSelect={pickOrder}
                />}

                {order && <section className={styles.info} {...{ ...(toggled) ? { "data-toggled": "" } : {} }}>
                    <Button variant={(toggled) ? "secondary" : "primary"} shape="circle" onClick={handleToggle}>
                        <Icon name={(toggled) ? "ChevronUp" : "ChevronDown"} />
                    </Button>

                    {!toggled
                        ? <h5 className="inline-flex justify-start items-center gap-4">
                            Pedido <Tag>{order.order_id}#</Tag>
                        </h5>

                        : <section>
                            <section>
                                <header>
                                    <Icon name="Chat" />

                                    <h5>Chat</h5>
                                </header>

                                <OrderChatForm order_id={order.order_id} />
                            </section>

                            <section>
                                <header>
                                    <Icon name="Product" />

                                    <h5>Lista do pedido</h5>
                                </header>

                                <OrderItemsList items={[...order.Order_Items]} />
                            </section>

                            <section>
                                <header>
                                    <Icon name="History" />

                                    <h5>Histórico</h5>
                                </header>

                                <OrderHistoryList order_id={order?.order_id} />
                            </section>
                        </section>}
                </section>}
            </main>
        }
    }
};

export default BackOfficeDeliveriesPage;