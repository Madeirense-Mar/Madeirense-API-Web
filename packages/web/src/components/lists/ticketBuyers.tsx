import {
    useCallback,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type Dispatch,
    type SetStateAction
} from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
    formatNumber,
    getLabel,
    resolveClassNames,
    type boughtTicketType,
    type Madeirense$Types,
    type withEmptyString
} from "@Madeirense/shared";

import ApplicationQueries from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import { nextPageTriggerSetup } from "./utilities/functions";

import defaultStyles from "./list.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    defaultEvent?: number;
    defaultRestaurant?: number;
    mode?: "default" | "admin";
};

type filterType = {
    event_id: number;
    payment_status: withEmptyString<$Enums.Payments_status>;
    restaurant: number;
};

const _defaultFilter: filterType = {
    event_id: 0,
    payment_status: "",
    restaurant: 0
};

function TicketBuyersList(_props: IPropTypes) {
    const {
        className,
        defaultEvent,
        defaultRestaurant,
        mode = "default",
        ...props
    } = _props;

    const defaultFilter = {
        ..._defaultFilter,
        ...!defaultEvent ? {} : { event_id: defaultEvent }
    };

    const [listFilter, setListFilter] = useState<filterType>(defaultFilter);

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ["App$EventTicketBuyers", "tickets", !defaultEvent ? undefined : { event_id: `${defaultEvent}` } as Madeirense$Types.searchQueryRecord],
        queryFn: ({ queryKey }) => ApplicationQueries.getList<boughtTicketType>({ queryKey }),
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
        defaultEvent,
        defaultFilter: defaultFilter,
        setter: setListFilter
    };

    const $ulProps = {
        className: resolveClassNames(defaultStyles.list, className),
        ...props
    };

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
                .filter(item => defaultRestaurant ? item?.restaurant_id === defaultRestaurant : listFilter.restaurant === 0 ? true : item?.restaurant_id === listFilter.restaurant)
                .filter(item => defaultEvent ? item?.event_id === defaultEvent : listFilter.event_id === 0 ? true : item?.event_id === listFilter.event_id);

            return <ul {...$ulProps}>
                <HeaderListItem disabled={list.length === 0} {...$liHeaderProps} />

                {list.length === 0 && <li data-empty>
                    Sem bilhetes comprados
                </li>}

                {list.map((item, idx) => {
                    if (!item) return null;

                    const ref = idx === list.length - 1 ? lastElementRef : undefined;

                    return <li key={item.ticket_id} {...{ ref }}>
                        <Tag className="mr-auto">
                            <Icon name="User" className="inline-block mr-1" />

                            {`${item.Users_Tickets_Purchased_user_idToUsers?.name} (${item.Users_Tickets_Purchased_user_idToUsers?.phone})`}
                        </Tag>

                        {!parseFloat(`${item.Orders?.total_amount}`) ? null : <Tag>
                            <Icon name="Money" className="inline-block mr-1" />

                            {formatNumber(parseFloat(`${item.Orders?.total_amount}`))}
                        </Tag>}

                        <Tag>
                            <Icon name="CashRegister" className="inline-block mr-1" />

                            {getLabel(item.Orders?.Payments[0].payment_method)}

                            {item.Orders?.Payments[0].payment_method === "Offer" ? null : <>
                                <Icon name="ArrowRight" />

                                {getLabel(item.Orders?.Payments[0].status)}
                            </>}
                        </Tag>

                        <Tag>
                            {(item.validator_id)
                                ? mode === "default" ? "Validado" : <>Validador <Icon name="ArrowRight" /> {item.Users_Tickets_Purchased_validator_idToUsers?.name}</>
                                : "Por validar"
                            }
                        </Tag>
                    </li>
                })
                }

                {isFetchingNextPage && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}
            </ul>
        }
    }
};

const HeaderListItem = ({
    defaultEvent,
    defaultFilter,
    defaultRestaurant,
    disabled = false,
    setter,
}: {
    defaultEvent?: number,
    defaultFilter: filterType,
    defaultRestaurant?: number,
    disabled?: boolean,
    setter: Dispatch<SetStateAction<filterType>>
}) => {
    const { get } = useApp();

    const filters = [
        {
            id: "restaurant",
            type: "number",
            title: "Restaurante",
            options: [
                ...!defaultRestaurant ? [{ id: "Todos os restaurantes", value: 0 }] : [],
                ...(get("Restaurants") ?? []).filter(({ restaurant_id }) => !defaultEvent ? true : restaurant_id === defaultEvent).map(({ restaurant_id, name }) => ({ value: restaurant_id, id: name }))
            ]
        },
        {
            id: "event_id",
            type: "number",
            title: "Evento",
            options: [
                ...!defaultEvent ? [{ id: "Todos os eventos", value: 0 }] : [],
                ...(get("Restaurant_Events") ?? []).filter(({ event_id }) => !defaultEvent ? true : event_id === defaultEvent).map(({ event_id, name }) => ({ value: event_id, id: name }))
            ]
        }
    ];

    function clearFilters() {
        setter(defaultFilter);

        filters.forEach(({ id, options }) => (document.getElementById(id) as HTMLSelectElement).value = options[0].value.toString());
    };

    function handleChange(filter: typeof filters[0]) {
        return (e: ChangeEvent<HTMLSelectElement>) => setter(lf => {
            return {
                ...lf,
                [`${filter.id}`]: filter.type === "number" ? parseInt(e.target.value as string) : e.target.value as string
            }
        });
    }

    return <li data-type="filter">
        <Icon name="Filter" />

        {filters.map(f => <select
            key={f.id}
            id={f.id}
            title={f.title}
            defaultValue={f.id === "restaurant" && defaultEvent !== undefined ? `${defaultEvent}` : f.options[0].value}
            onChange={handleChange(f)}
            {...{ disabled }}
        >
            {f.options.map(item => <option key={item?.id} value={item?.value}>
                {item?.id}
            </option>)}
        </select>)}

        <Button onClick={clearFilters} variant="secondary">
            <Icon name="Close" />
        </Button>
    </li>;
};

export default TicketBuyersList;