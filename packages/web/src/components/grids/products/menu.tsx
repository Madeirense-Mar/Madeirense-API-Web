import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useRef,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEvent
} from "react";

import {
    useSearchParams
} from "react-router-dom";

import {
    DEFAULT_APP_PREFERENCES,
    getLabel,
    resolveClassNames,
    API$Enumerators,
    Madeirense$Types,
    type appPreferencesType,
    type keyValuePair,
    type productGroupType,
} from "@Madeirense/shared";

import {
    useInfiniteQuery
} from "@tanstack/react-query";

import SliderPicker from "../../pickers/slider";

import MXP$App from "configurations";

import ApplicationQueries from "configurations/queries";

import {
    useApp,
    type App$Types
} from "contexts/App";

import SearchBar from "components/forms/searchBar";
import ProductCard from "components/cards/product";
import Icon from "components/icon";
import Tag from "components/tags";

import {
    nextPageTriggerSetup
} from "components/lists/utilities/functions";

import styles from "./menu.module.css";

import type {
    $Enums,
    Products
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    defaultRestaurant?: number;
    disableSearch?: boolean;
    productType?: `${$Enums.Products_product_type}`;
    mode?: "default" | "admin";
    group?: productGroupType;
    trackAppUpdates?: boolean;
    type?: "products" | "delisted-products",
};

type filterType = "all" | $Enums.Products_product_type;

const defaultCompositionFilters = {
    alcoholic: false,
    fish: false,
    liquid: false,
    meat: false,
    merchandise: false,
    mixed: false,
    non_alcoholic: false,
    vegetable: false,
    wheat: false
};

function ProductsMenuGrid(_props: IPropTypes) {
    const {
        className,
        defaultRestaurant,
        disableSearch = false,
        group,
        mode = "default",
        productType,
        trackAppUpdates = false,
        type = "products",
        ...props
    } = _props;

    const { Storage } = useMemo(() => MXP$App, []);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [searchParams, updateSearchParams] = useSearchParams();

    const [search, setSearch] = useState("");
    const [listFilter, setListFilter] = useState<filterType>(productType ?? "all");
    const [compositionFilters, setCompositionFilters] = useState<Record<$Enums.Products_product_composition, boolean>>(defaultCompositionFilters);

    const { get } = useApp();

    const restaurants = get("Restaurants") ?? [];

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
        refetch,
    } = useInfiniteQuery({
        queryKey: ([
            "App$GetAllProducts",
            type,
            !group ? undefined : ({ group } as Madeirense$Types.searchQueryRecord)
        ]),
        queryFn: ApplicationQueries.getList<Products>,
        getNextPageParam: (lastPage) => {
            return lastPage.pagination?.hasNext
                ? lastPage.pagination.page + 1
                : undefined;
        },
        initialPageParam: 1
    });

    const lastElementRef = useCallback(
        nextPageTriggerSetup<HTMLDivElement>({
            fetchNextPage,
            hasNextPage,
            isFetchingNextPage,
            isFetching
        }),
        [fetchNextPage, hasNextPage, isFetchingNextPage, isFetching]
    );

    function applySearch({ target, key }: KeyboardEvent<HTMLInputElement>) {
        if (key.toLowerCase() !== "enter") return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setSearch((target as HTMLInputElement).value);
    };

    function handleSearch({ target }: ChangeEvent<HTMLInputElement>) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const inputValue = (target as HTMLInputElement).value;

        timeoutRef.current = setTimeout((value) => {
            setSearch(value);
        }, (inputValue === "") ? 0 : 5000, inputValue);
    };

    function handleCompositionPick(values: string[]) {
        const _compositionFilters = { ...defaultCompositionFilters };

        values.forEach(v => {
            _compositionFilters[v as $Enums.Products_product_composition] = true;
        });

        setCompositionFilters(_compositionFilters);
    };

    function handleTypeChange(type: string) {
        setListFilter(type as filterType);

        searchParams.delete("product_type");

        updateSearchParams(searchParams);
    };

    const $divProps = {
        className: resolveClassNames(className),
        ...props
    };

    useEffect(() => {
        const timeoutId = timeoutRef.current;

        return () => { if (timeoutId) clearTimeout(timeoutId); }
    }, []);

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

            if (!notificationId.includes("APP_PROPERTY")) return;

            const property = (notificationId.split("$") as [string, string, keyof App$Types.properties, keyof typeof API$Enumerators.Actions])[2];

            switch (property) {
                case "Products": refetch(); break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [trackAppUpdates, refetch, Storage]);

    switch (status) {
        case "pending": return <div {...$divProps}>
            <div className="flex flex-row justify-center items-center w-full h-full">
                <Icon name="Loading" className="animate-spin mx-auto my-4" />
            </div>
        </div>;

        case "error": return <div {...$divProps}>
            <div className="w-full h-full flex flex-row justify-center items-center">
                <div data-state="error" className="flex flex-row justify-center items-center gap-2 px-2 rounded-md">
                    <Icon name="ExclamationCircle" />

                    <p>{error?.message}</p>
                </div>
            </div>
        </div>;

        default:

            const fullList = (data?.pages.flatMap(page => page.data) || []);
            const list = fullList
                .filter(item => search === "" ? true : item?.name.toLowerCase().includes(search.toLowerCase()))
                .filter(item => listFilter === "all" ? true : item?.product_type === listFilter)
                .filter(item => Object.values(compositionFilters).every(v => !v) ? true : (!item?.product_composition) ? false : Object.entries(compositionFilters).filter(e => e[1]).map(e => e[0] as $Enums.Products_product_composition).includes(item.product_composition))
                .filter(item => (!defaultRestaurant || item?.restaurant_id === null) ? true : item?.restaurant_id === defaultRestaurant)
                ;

            const $typeSliderPickerProps = {
                defaultValue: listFilter,
                list: [
                    { key: "Todos", value: { value: "all", icon: (trackAppUpdates && isFetching) ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Restaurant" /> } },
                    ...(
                        [
                            { key: "Entradas", value: { value: "starter", icon: <Icon name="Circle" /> } },
                            { key: "Guarnições", value: { value: "garnish", icon: <Icon name="Salad" /> } },
                            { key: "Principais", value: { value: "main", icon: <Icon name="Food" /> } },
                            { key: "Sobremesas", value: { value: "dessert", icon: <Icon name="Dessert" /> } },
                            { key: "Bebidas", value: { value: "beverage", icon: <Icon name="Drink" /> } },
                        ] as keyValuePair<string, { value: filterType, icon: any }>[]
                    ).filter(({ value }) => fullList.map(p => p?.product_type).includes(value.value as $Enums.Products_product_type))
                ],
                onPick: handleTypeChange
            };

            const $compositionSliderPickerProps = {
                list: (
                    [
                        { key: "Não-Alcoolicas", value: { value: "non_alcoholic", icon: <Icon name="NoDrinks" /> } },
                        { key: "Alcoolicas", value: { value: "alcoholic", icon: <Icon name="SolidDrink" /> } },
                        { key: "Peixe", value: { value: "fish", icon: <Icon name="FishSharp" /> } },
                        { key: "Carne", value: { value: "meat", icon: <Icon name="Meat" /> } },
                        { key: "Mistura", value: { value: "mixed", icon: <Icon name="Salad" /> } },
                        { key: "Vegano", value: { value: "vegetable", icon: <Icon name="Vegan" /> } },
                        { key: "Farináceos", value: { value: "wheat", icon: <Icon name="Wheat" /> } },
                    ] as keyValuePair<string, { value: $Enums.Products_product_composition, icon: any }>[]
                )
                .filter(({ value }) => fullList.map(p => p?.product_composition).includes(value.value))
                .filter(({ value }) => {
                    switch (listFilter) {
                        case 'beverage':
                            return ['alcoholic', 'non_alcoholic'].includes(value.value);
                            
                        default:
                            return !['alcoholic', 'non_alcoholic'].includes(value.value);
                    }
                }),
                onMultiplePick: handleCompositionPick
            };

            return <div {...$divProps}>
                <div className={styles["filter-bar"]}>
                    <SliderPicker {...$typeSliderPickerProps} />

                    {(listFilter !== 'all') && <SliderPicker element="Tag" {...$compositionSliderPickerProps} multiple />}

                    <hr />

                    {!disableSearch && <SearchBar
                        className={styles["search-filter"]}
                        inputProps={{
                            placeholder: "Pesquise pelo nome do prato",
                            onKeyDown: applySearch,
                            onChange: handleSearch
                        }}
                    />}
                </div>

                <div className={resolveClassNames(styles.grid, "w-full")}>
                    {list.map((item, idx) => {
                        if (!item) return null;

                        const ref = idx === list.length - 1 ? lastElementRef : undefined;

                        return <ProductCard
                            key={item.product_id}
                            product={item}
                            disableActions={mode === "admin"}
                            {...{
                                ref,
                                mode
                            }}
                        />
                    })}
                </div>

                {isFetchingNextPage && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}
            </div>;
    }
};

export default ProductsMenuGrid;