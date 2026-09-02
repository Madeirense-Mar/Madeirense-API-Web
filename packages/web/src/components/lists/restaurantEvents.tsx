import {
    ChangeEvent,
    useCallback,
    useEffect,
    useState,
    type ComponentProps,
    type Dispatch,
    type SetStateAction
} from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";

import {
    formatNumber,
    resolveClassNames,
    type restaurantEventType,
    type withEmptyString,
} from "@Madeirense/shared";

import ApplicationQueries, { 
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import RestaurantEventCard from "components/cards/restaurantEvent";
import Icon from "components/icon";
import Tag from "components/tags";

import { nextPageTriggerSetup } from "./utilities/functions";

import styles from "./restaurantEvents.module.css";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    defaultRestaurant?: number;
    disableLink?: boolean;
    mode?: "list" | "viewport";
    selectedEvent?: number;
};

type filterType = {
    recency: withEmptyString<"upcoming" | "soon">,
    restaurant: number
};

const _defaultFilter: filterType = {
    recency: "",
    restaurant: 0
};

function RestaurantEventList(_props: IPropTypes) {
    const {
        className,
        defaultRestaurant,
        disableLink = false,
        mode = "list",
        selectedEvent = 0,
        ...props
    } = _props;

    const defaultFilter = {
        ..._defaultFilter,
        ...!defaultRestaurant ? {} : { restaurant: defaultRestaurant }
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
        queryKey: ([
            "App$GetRestaurantStaff", 
            "events", 
            !defaultRestaurant ? {} : { restaurant_id: `${defaultRestaurant}` }
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ApplicationQueries.getList<restaurantEventType>,
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
        setter: setListFilter
    };

    const $ulProps = {
        className: resolveClassNames(styles.list, styles[mode], className),
        ...props
    };

    useEffect(() => {
        if (selectedEvent === 0) return;

        const $element = document.getElementById(`event-${selectedEvent}`) as HTMLDivElement;

        if (!$element) return;

        $element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [selectedEvent]);

    switch (status) {
        case "error": return (<ul {...$ulProps}>
            {mode === "list" && <HeaderListItem disabled {...$liHeaderProps} />}

            <li data-state="error" className="rounded-md flex flex-row justify-start items-center gap-2 px-2">
                <Icon name="ExclamationCircle" />

                <p>{error?.message}</p>
            </li>
        </ul>);

        case "pending": return (<ul {...$ulProps}>
            {mode === "list" && <HeaderListItem disabled {...$liHeaderProps} />}

            <li>
                <Icon name="Loading" className="animate-spin mx-auto my-4" />
            </li>
        </ul>);

        default: {
            const _list = data?.pages.flatMap(page => page.data) || [];

            const list = (_list)
                .filter(item => (defaultRestaurant)
                    ? item?.restaurant_id === defaultRestaurant
                    : (listFilter.restaurant === 0)
                        ? true
                        : (item?.restaurant_id === listFilter.restaurant)
                );

            return <ul {...$ulProps}>
                {mode === "list" && <HeaderListItem disabled={_list.length === 0} {...$liHeaderProps} />}

                {list.length === 0 && <li data-empty>
                    {mode === "viewport" && <Icon name="Empty" />}

                    Sem eventos registados, nós iremos notificar assim que house algum marcado
                </li>}

                {list.map((item, idx) => {
                    if (!item) return null;

                    const ref = idx === list.length - 1 ? lastElementRef : undefined;

                    switch (mode) {
                        case "list": return <li id={`event-${item.event_id}`} key={item.event_id} {...{ ref }}>
                            {(disableLink)
                                ? <span className="font-extrabold">{item.name}</span>

                                : <Link className="font-extrabold" to={`/back-office/restaurants/party/${item.event_id}`}>{item.name}</Link>
                            }

                            <Tag className="italic">
                                <Icon name="Store" />

                                {item.Restaurants?.name}
                            </Tag>

                            <Tag>
                                <Icon name="Money" />

                                {Boolean(parseInt(`${item.price}`)) ? formatNumber(parseFloat(`${item.price}`)) : "Grátis"}
                            </Tag>

                            <Tag className="ml-auto">
                                <Icon name="Calendar1" />

                                {new Date(item.event_date).toLocaleDateString()}
                            </Tag>

                            <Tag>
                                <Icon name="User" />

                                {item?.spots ?? "Sem limite"}
                            </Tag>
                        </li>;

                        case "viewport": return <li key={item.event_id} {...{ ref }}>
                            <RestaurantEventCard restaurantEvent={item} />
                        </li>;

                        default: return null;
                    }
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
    setter,
}: {
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
                ...(get("Restaurants") ?? []).filter(({ restaurant_id }) => !defaultRestaurant ? true : restaurant_id === defaultRestaurant).map(({ restaurant_id, name }) => ({ value: restaurant_id, id: name }))
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
                [`${filter.id}`]: (filter.type === "number") ? parseInt(e.target.value as string) : e.target.value as string
            }
        });
    };

    return <li data-type="filter">
        <Icon name="Filter" />

        {filters.map(f => <select
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
            {f.options.map(item => <option key={item.id} value={item.value}>
                {item.id}
            </option>)}
        </select>)}

        <Button onClick={clearFilters} variant="secondary">
            <Icon name="Close" />
        </Button>
    </li>
};

export default RestaurantEventList;