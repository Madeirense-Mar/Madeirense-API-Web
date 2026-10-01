import {
    useCallback,
    useState,
    type ChangeEvent,
    type Dispatch,
    type ComponentProps,
    type SetStateAction
} from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";

import {
    USER_ROLES,
    getLabel,
    resolveClassNames,
    type staffMemberType,
    type withEmptyString
} from "@Madeirense/shared";

import ApplicationQueries, { 
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";
import Tag from "components/tags";

import { nextPageTriggerSetup } from "./utilities/functions";

import defaultStyles from "./list.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    defaultRestaurantId?: number;
    mode?: "default" | "admin";
};

type filterType = {
    user_role: withEmptyString<$Enums.Users_user_role>,
    restaurant: number
};

const _defaultFilter: filterType = {
    user_role: "",
    restaurant: 0
};

function StaffList(_props: IPropTypes) {
    const {
        className,
        mode = "default",
        defaultRestaurantId,
        ...props
    } = _props;

    const defaultFilter = {
        ..._defaultFilter,
        ...!defaultRestaurantId ? {} : { restaurant: defaultRestaurantId }
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
            "staff", 
            { restaurant_id: `${defaultRestaurantId}` }
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ApplicationQueries.getList<staffMemberType>,
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
        defaultRestaurantId,
        defaultFilter: defaultFilter,
        setter: setListFilter
    };

    const $ulProps = {
        className: resolveClassNames(defaultStyles.list, className),
        ...props
    };

    switch (status) {
        case "pending": return <ul {...$ulProps}>
            <HeaderListItem disabled {...$liHeaderProps} />

            <li>
                <Icon name="Loading" className="animate-spin mx-auto my-4" />
            </li>
        </ul>;

        case "error": return <ul {...$ulProps}>
            <HeaderListItem disabled {...$liHeaderProps} />

            <li data-state="error" className="rounded-md flex flex-row justify-start items-center gap-2 px-2">
                <Icon name="ExclamationCircle" />

                <p>{error?.message}</p>
            </li>
        </ul>;

        default:
            const list = (data?.pages.flatMap(page => page.data) || [])
                .filter(item => defaultRestaurantId ? item?.restaurant_id === defaultRestaurantId : listFilter.restaurant === 0 ? true : item?.restaurant_id === listFilter.restaurant)
                .filter(item => listFilter.user_role === "" ? true : item?.Users.user_role === listFilter.user_role);

            return <ul {...$ulProps}>
                <HeaderListItem disabled={list.length === 0} {...$liHeaderProps} />

                {list.length === 0 && <li data-empty>
                    Sem pessoal registado
                </li>}

                {list.map((item, idx) => {
                    if (!item) return null;

                    const ref = idx === list.length - 1 ? lastElementRef : undefined;

                    return <li key={item.workstation_id} {...{ ref }}>
                        <ProfilePictureButton src={item.Users.profile_photo ?? "#"} size="xs" />

                        <Link to={`/back-office/staff/${item.Users.user_id}`}>{item.Users.name}</Link>

                        <span className="italic opacity-40">{item.Users.email}</span>

                        <Tag className="ml-auto">
                            {(item.Users.user_role === "Admin") && <Icon name="UserAdmin" />}
                            {(item.Users.user_role === "Staff") && <Icon name="UserStaff" />}
                            {(item.Users.user_role === "Driver") && <Icon name="Delivery" />}

                            {getLabel(item.Users.user_role)}
                        </Tag>
                    </li>
                })
                }

                {isFetchingNextPage && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}
            </ul>;
    }
};

const HeaderListItem = ({
    defaultFilter,
    defaultRestaurantId,
    disabled = false,
    setter,
}: {
    defaultFilter: filterType, 
    defaultRestaurantId?: number, 
    disabled?: boolean, 
    setter: Dispatch<SetStateAction<filterType>>
}) => {
    const { get } = useApp();

    const headerFilters = [
        {
            id: "restaurant",
            type: "number",
            title: "Restaurante",
            options: [
                ...!defaultRestaurantId ? [{ id: "Todos os restaurantes", value: 0 }] : [],
                ...(get("Restaurants") ?? []).filter(({ restaurant_id }) => !defaultRestaurantId ? true : restaurant_id === defaultRestaurantId).map(({ restaurant_id, name }) => ({ value: restaurant_id, id: name }))
            ]
        },
        {
            id: "user_role",
            type: "string",
            title: "Tipo de utilizador",
            options: [
                { id: "Todos os tipos", value: "" },
                ...USER_ROLES.map(item => ({ value: item, id: getLabel(item) }))
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
                [`${filter.id}`]: filter.type === "number" ? parseInt(e.target.value as string) : e.target.value as string
            }
        });
    }

    return <li data-type="filter">
        <Icon name="Filter" />

        {headerFilters.map(f => <select
            key={f.id}
            id={f.id}
            title={f.title}
            defaultValue={f.id === "restaurant" && defaultRestaurantId !== undefined ? `${defaultRestaurantId}` : f.options[0].value}
            onChange={handleChange(f)}
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

export default StaffList;