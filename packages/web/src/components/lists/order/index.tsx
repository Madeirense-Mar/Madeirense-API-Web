import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ComponentProps,
    type ChangeEvent,
    type Dispatch,
    type SetStateAction
} from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    ORDERS_PREPARATION_STATUS,
    ORDERS_STATUS,
    PAYMENT_TYPES,
    getLabel,
    resolveClassNames,
    type appPreferencesType,
    type Madeirense$Types,
    type orderType,
    type restaurantOrderType,
    type withEmptyString,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, {
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import OrderCard from "components/cards/order";
import Icon from "components/icon";

import { nextPageTriggerSetup } from "../utilities/functions";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    defaultRestaurant?: number;
    filter?: orderType;
    mode?: "default" | "admin";
    statusType?: OrderList$Types.status;
    trackAppUpdates?: boolean;
    type: OrderList$Types.list;
};

export namespace OrderList$Enumerators {
    export enum Lists {
        "my-orders" = "my-orders",
        "orders" = "orders"
    }

    export enum Statuses {
        "all" = "all",
        "delivering" = "delivering",
        "ongoing" = "ongoing"
    }
};

export namespace OrderList$Types {
    export type filter = {
        payment: withEmptyString<$Enums.Payments_payment_method>;
        restaurant: number;
        status: withEmptyString<$Enums.Orders_status>;
    };

    export type list = (keyof typeof OrderList$Enumerators.Lists);

    export type status = (keyof typeof OrderList$Enumerators.Statuses);
};

const _defaultFilter: OrderList$Types.filter = {
    payment: "",
    restaurant: 0,
    status: ""
};

const filters: Record<OrderList$Types.status, ReadonlyArray<$Enums.Orders_status>> = {
    "all": ORDERS_STATUS,
    "delivering": ["assigned"],
    "ongoing": ORDERS_PREPARATION_STATUS
};

function OrdersList(_props: IPropTypes) {
    const {
        className,
        defaultRestaurant,
        filter,
        mode = "default",
        statusType = "all",
        trackAppUpdates = false,
        type,
        ...props
    } = _props;

    const {
        Base,
        Storage
    } = useMemo(() => MXP$App, []);

    const {

    } = Base.Business.endpoints;

    const defaultFilter = {
        ..._defaultFilter,
        ...((!defaultRestaurant) ? {} : { restaurant: defaultRestaurant })
    };

    const [listFilter, setListFilter] = useState<OrderList$Types.filter>(defaultFilter);

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        refetch,
        status,
    } = useInfiniteQuery({
        queryKey: ([
            "App$GetAllOrders",
            type,
            { "type": filter } as Madeirense$Types.searchQueryRecord
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ApplicationQueries.getList<restaurantOrderType>,
        getNextPageParam: (lastPage) => {
            return lastPage.pagination?.hasNext
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

    const $liHeaderProps = {
        defaultRestaurant,
        defaultFilter: defaultFilter,
        setter: setListFilter,
        statusType
    };

    const $ulProps = {
        className: resolveClassNames(className, "flex flex-col justify-start items-start gap-3 w-full"),
        ...props
    };

    useEffect(() => {
        if ((
            !trackAppUpdates ||
            !('serviceWorker' in navigator))
        ) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            switch (true) {
                case (notificationId.includes("ORDER")):
                    await refetch();

                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [trackAppUpdates, refetch, Storage]);

    switch (status) {
        case "error": return (<ul {...$ulProps}>
            <HeaderListItem disabled {...$liHeaderProps} />

            <li data-state="error" className="rounded-md flex flex-row justify-start items-center gap-2 px-2">
                <Icon name="ExclamationCircle" />

                <p>{error?.message}</p>
            </li>
        </ul>);

        case "pending": return (<ul {...$ulProps}>
            <HeaderListItem disabled {...$liHeaderProps} />

            <li>
                <Icon name="Loading" className="animate-spin mx-auto my-4" />
            </li>
        </ul>);

        default: {
            const list = (data?.pages.flatMap(page => page.data) || [])
                .filter(item => defaultRestaurant ? (item?.restaurant_id === defaultRestaurant) : (listFilter.restaurant === 0) ? true : (item?.restaurant_id === listFilter.restaurant))
                .filter(item => listFilter.payment === "" ? true : (item?.Payments[0].payment_method === listFilter.payment))
                .filter(item => filters[statusType].includes(item?.status as $Enums.Orders_status))
                .filter(item => listFilter.status === "" ? true : (item?.status === listFilter.status))
                ;

            return <ul {...$ulProps}>
                <HeaderListItem disabled={list.length === 0} {...$liHeaderProps} />

                {list.length === 0 && <li data-empty className="w-full">
                    {(!statusType)
                        ? <>Sem pedidos registados</>
                        : <>
                            {statusType === "all" && <>Não existem pedidos registados</>}
                            {statusType === "delivering" && <>Sem pedidos a ser entregue</>}
                            {statusType === "ongoing" && <>Sem pedidos em fila</>}
                        </>
                    }

                </li>}

                {list.map((item, idx) => {
                    if (!item) return null;

                    const ref = (idx === (list.length - 1))
                        ? lastElementRef
                        : undefined
                        ;

                    return <li key={item.order_id} className="w-full" {...{ ref }}>
                        <OrderCard
                            order={item}
                            index={(statusType === "all") ? undefined : (idx + 1)}
                            className="w-full"
                            {...{ mode }}
                        />
                    </li>
                })}

                {isFetchingNextPage && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}
            </ul>
        }
    }
};

const HeaderListItem = ({
    defaultFilter,
    defaultRestaurant,
    disabled = false,
    statusType = "all",
    setter
}: {
    defaultFilter: OrderList$Types.filter,
    defaultRestaurant?: number,
    disabled?: boolean,
    statusType?: OrderList$Types.status,
    setter: Dispatch<SetStateAction<OrderList$Types.filter>>
}) => {
    const { get } = useApp();

    const headerFilters = [
        {
            id: "restaurant",
            type: "number",
            title: "Restaurante",
            options: [
                ...!defaultRestaurant ? [{ id: "Todos os restaurantes", value: 0 }] : [],
                ...(get("Restaurants") ?? []).filter(({ restaurant_id }) => !defaultRestaurant ? true : restaurant_id === defaultRestaurant).map(({ restaurant_id, name }) => ({ value: restaurant_id, id: name }))
            ]
        },
        {
            id: "payment",
            type: "string",
            title: "Tipo de pagamento",
            options: [
                { id: "Todos os tipos de pagamento", value: "" },
                ...PAYMENT_TYPES.map(payment => ({ value: payment, id: getLabel(payment) }))
            ]
        },
        {
            id: "status",
            type: "string",
            title: "Tipo de ordem",
            options: [
                { id: "Todos os tipos", value: "" },
                ...filters[statusType].map(item => ({ value: item, id: getLabel(item) }))
            ]
        }
    ];

    function clearFilters() {
        setter(defaultFilter);

        headerFilters.forEach(({ id, options }) => (document.getElementById(id) as HTMLSelectElement).value = options[0].value.toString());
    };

    function handleChange(filter: typeof headerFilters[0]) {
        return (e: ChangeEvent<HTMLSelectElement>) => setter(lf => {
            return {
                ...lf,
                [`${filter.id}`]: (filter.type === "number") ? parseInt(e.target.value as string) : e.target.value as string
            }
        });
    };

    return <li data-type="filter" className="w-full flex flex-row justify-start items-center gap-3">
        <Icon name="Filter" />

        {headerFilters.map(f => <select
            defaultValue={((f.id === "restaurant") && (defaultRestaurant !== undefined))
                ? `${defaultRestaurant}`
                : f.options[0].value
            }
            id={f.id}
            key={f.id}
            onChange={handleChange(f)}
            title={f.title}
            {...{ disabled }}
        >
            {f.options.map(item => <option key={item?.id} value={item?.value}>
                {item?.id}
            </option>)}
        </select>)}

        <Button onClick={clearFilters} variant="secondary" className="ml-auto">
            <Icon name="Close" />
        </Button>
    </li>
};

export default OrdersList;