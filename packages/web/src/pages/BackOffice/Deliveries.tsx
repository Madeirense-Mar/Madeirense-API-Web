import {
    ComponentProps,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type MouseEvent
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

import Button from "components/buttons";

import OrderCard from "components/cards/order";
import OrderChatForm from "components/forms/orders/chat";

import Icon from "components/icon";

import {
    nextPageTriggerSetup
} from "components/lists/utilities/functions";

import OrderHistoryList from "components/lists/order/history";
import OrderItemsList from "components/lists/order/items";

import GoogleMapDeliveryTracker from "components/maps/google/deliveryTracker";

import Tag from "components/tags";

import xScrollSectionStyles from "styles/xScrollSection.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface ISectionPropTypes extends ComponentProps<"section"> {
    isFetching?: boolean;
    order: restaurantOrderType;
};

type sectionType = (
    | "chat"
    | "map"
);

const ScrollSection = (
    {
        className,
        order,
        isFetching = false,
        ...props
    }: ISectionPropTypes
) => {
    const [pickedSection, setPickedSection] = useState<sectionType>("map");

    const sections = [
        { key: `Entrega`, value: "map", icon: <Icon name="MapMarked" /> },
        { key: `Chat`, value: "chat", icon: <Icon name="Chat" /> }
    ];

    function pickSection(value: string) {
        return (e: MouseEvent<HTMLButtonElement>) => {
            setPickedSection(value as any);
        }
    };

    useEffect(() => {
        const $section = document.getElementById(pickedSection);

        if (!$section) return;

        $section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [pickedSection]);

    return <section className={resolveClassNames(xScrollSectionStyles["x-scroll-section"], "HORIZONTAL_SCROLLTO_SECTION", className)} {...props}>
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection(kvp.value)} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                {(kvp.value === pickedSection && isFetching) ? <Icon name="Loading" className="animate-spin" /> : kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div>
            <section id="map" className="gap-2 w-full">
                <GoogleMapDeliveryTracker {...{ order }} />
            </section>

            <section id="chat" className="gap-2 w-full">
                <OrderChatForm order_id={order.order_id} className="w-full" />
            </section>
        </div>
    </section>;
};

function BackOfficeDeliveriesPage(props: ComponentProps<"main">) {
    const { Storage } = useMemo(() => MXP$App, []);

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
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

    const lastElementRef = useCallback(
        nextPageTriggerSetup({
            fetchNextPage,
            hasNextPage,
            isFetchingNextPage,
            isFetching
        }),
        [fetchNextPage, hasNextPage, isFetchingNextPage, isFetching]
    );

    const deliveries = useMemo(() => (data?.pages.flatMap(page => page.data) || []), [data]);

    const [order, setOrder] = useState<restaurantOrderType | null>(null);

    const pickOrder = ({ target }: MouseEvent<HTMLButtonElement>) => {
        let index = deliveries.findIndex(d => d?.order_id === order?.order_id);

        switch ((target as HTMLButtonElement).value as ("next" | "prev")) {
            case "next":
                index += 1
                break;

            case "prev":
                index -= 1

                break;

            default:
                break;
        }

        setOrder(deliveries[index]);
    };

    useEffect(() => {
        if (order || !deliveries.length) return;

        setOrder(deliveries[0]);
    }, [deliveries, order]);

    useEffect(() => {
        if (!order) return;

        const index = deliveries.findIndex(d => d?.order_id === order?.order_id);

        const $prevButton = document.getElementById("prev") as (HTMLButtonElement | null);
        const $nextButton = document.getElementById("next") as (HTMLButtonElement | null);

        if ([$prevButton, $nextButton].includes(null)) return;

        ($prevButton as HTMLButtonElement).disabled = index === 0;
        ($nextButton as HTMLButtonElement).disabled = index === (deliveries.length - 1);

        const $section = document.getElementById(`delivery-${order.order_id}`);

        if (!$section) return;

        $section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [
        deliveries,
        order
    ]);

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
    }, [
        refetch,
        Storage
    ]);

    switch (true) {
        case (error instanceof Error): {
            return <main {...props}>
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
            return <main {...props}>
                <header>
                    <h1>Entregas</h1>
                </header>

                <section className="w-full flex flex-row justify-center items-center gap-2 mb-5">
                    {order && <Button id="prev" variant="secondary" onClick={pickOrder} value="prev">
                        <Icon name="ChevronLeft" />
                    </Button>}

                    <ul className="w-full flex flex-row justify-start items-center gap-1 overflow-hidden">
                        {deliveries.map((d, idx) => {
                            if (!d) return null;

                            return <li
                                key={d.order_id}
                                className={`w-full min-w-full${order?.order_id === d.order_id ? "" : " pointer-events-none"}`}
                                id={`delivery-${d.order_id.toString()}`}
                                ref={(idx === (deliveries.length - 1)) ? lastElementRef : undefined}
                            >
                                <OrderCard order={d} className="w-full" />
                            </li>
                        })}
                    </ul>

                    {order && <Button id="next" variant="secondary" onClick={pickOrder} value="next">
                        <Icon name="ChevronRight" />
                    </Button>}
                </section>
                
                <section className={resolveClassNames(
                    "w-full min-h-[300px] flex flex-col justify-center items-center rounded-lg gap-4",
                    (isFetching && !data) ? "bg-gray-300 animate-pulse" : ""
                )}>
                    {(isFetching && !data)
                        ? null
                        : (deliveries.length === 0)
                            ? <>
                                <Icon name="Delivery" className="text-6xl opacity-45" />

                                <h2 className="opacity-45">Sem entregas de momento</h2>
                            </>
                            : order && <ScrollSection className="w-full" isFetching={isFetching || isFetchingNextPage} {...{ order }} />
                    }
                </section>

                <section>
                    {order && <OrderItemsList items={[...order?.Order_Items]} />}
                </section>

                <section>
                    {order && <OrderHistoryList order_id={order?.order_id} />}
                </section>
            </main>
        }
    }
};

export default BackOfficeDeliveriesPage;