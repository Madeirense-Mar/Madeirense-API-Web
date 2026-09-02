import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEvent,
    type MouseEvent
} from "react";

import { useQueries } from "@tanstack/react-query";

import {
    DB$Enumerators,
    type $Enums,
    type Coupons,
    type Delivery_Locations,
    type Orders,
    type Products,
    type Users
} from '@Madeirense/database/browser';

import {
    DATE_INTERVALS,
    DAYS_OF_THE_MONTH,
    DEFAULT_API_LIST_LIMIT,
    DEFAULT_APP_PREFERENCES,
    formatNumber,
    getLabel,
    locales,
    Madeirense$Enumerators,
    type Madeirense$Types,
    type appPreferencesType,
    type countEntryType,
    type dateIntervalsType,
    type orderRevenueType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";

import { getLabelIcon } from "components/utilities/getters";

import { CHART_COLOR_MAP } from "components/charts/utilities/constants";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import DoughnutChart from "components/charts/doughnut";
import LineChart from "components/charts/line";
import Icon from "components/icon";
import Tag from "components/tags";

import type { IPageState } from "components/interface";

import './index.css';

// ***************************************************************************************************************

type fetchOptionsType = Partial<{
    query: Madeirense$Types.searchQueryRecord
}>;

type queryType = (
    | "CouponsUseCount"
    | "OrderCountPerRestaurant"
    | "OrdersPerInterval"
    | "TopCouriers"
    | "TopOrderAreas"
    | "TopSellingProducts"
);

type stateType = Record<queryType, fetchOptionsType>;

const defaultFetchOptions = {
    query: undefined,
};

const defaultLoadShadowNumber = 1;

function BackOfficeDashboardPage() {
    const {
        Base,
        Storage
    } = useMemo(() => MXP$App, []);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { get } = useApp();

    const availableRestaurants = get("Restaurants");

    const {
        statistics
    } = Base.Business.endpoints;

    const [page, updatePage] = useState<IPageState<stateType>>({
        data: {
            "OrderCountPerRestaurant": defaultFetchOptions,
            "OrdersPerInterval": {
                ...defaultFetchOptions,
                query: {
                    ...(defaultFetchOptions.query ?? {}),
                    interval: "monthly",
                    month: (new Date().getMonth()).toString(),
                    year: (new Date().getFullYear()).toString()
                }
            },
            "TopSellingProducts": {
                ...defaultFetchOptions,
                query: {
                    ...(defaultFetchOptions.query ?? {}),
                    quantity: DEFAULT_API_LIST_LIMIT.toString()
                }
            },
            "TopOrderAreas": {
                ...defaultFetchOptions,
                query: {
                    ...(defaultFetchOptions.query ?? {}),
                    group_by: "neighborhood",
                    quantity: DEFAULT_API_LIST_LIMIT.toString()
                }
            },
            "TopCouriers": {
                ...defaultFetchOptions,
                query: {
                    ...(defaultFetchOptions.query ?? {}),
                    quantity: DEFAULT_API_LIST_LIMIT.toString()
                }
            },
            "CouponsUseCount": defaultFetchOptions,
        },
        error: null,
        status: "idle",
    });

    const { query: OPI$Query } = page.data?.OrdersPerInterval ?? {};
    const { query: TSP$Query } = page.data?.TopSellingProducts ?? {};
    const { query: TOA$Query } = page.data?.TopOrderAreas ?? {};
    const { query: TC$Query } = page.data?.TopCouriers ?? {};

    const [
        { data: data1 = [], isFetching: isFetching1, error: error1 = null, refetch: refetch1 },
        { data: data2 = [], isFetching: isFetching2, error: error2 = null, refetch: refetch2 },
        { data: data3 = [], isFetching: isFetching3, error: error3 = null, refetch: refetch3 },
        { data: data4 = [], isFetching: isFetching4, error: error4 = null, refetch: refetch4 },
        { data: data5 = [], isFetching: isFetching5, error: error5 = null, refetch: refetch5 },
        { data: data6 = [], isFetching: isFetching6, error: error6 = null, refetch: refetch6 },
        { data: data7 = [], isFetching: isFetching7, error: error7 = null, refetch: refetch7 },
        { data: data8 = [], isFetching: isFetching8, error: error8 = null, refetch: refetch8 },
    ] = useQueries({
        queries: [
            {
                queryKey: [
                    "App$OrderCountPerRestaurant",
                    DB$Enumerators.Tables.Restaurants,
                    DB$Enumerators.Tables.Orders,
                    page.data?.OrderCountPerRestaurant.query
                ],
                queryFn: ({ queryKey }) => statistics.countTableRelation(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[3] as fetchOptionsType,
                ),
                enabled: (availableRestaurants !== null && availableRestaurants.length > 0)
            },
            {
                queryKey: [
                    "App$OrdersPerInterval",
                    DB$Enumerators.Tables.Orders,
                    Madeirense$Enumerators.StatisticsParameters.Fact.revenue,
                    page.data?.OrdersPerInterval
                ],
                queryFn: ({ queryKey }) => statistics.reportTableFact<orderRevenueType[]>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof Madeirense$Enumerators.StatisticsParameters.Fact),
                    queryKey[3] as fetchOptionsType,
                )
            },
            {
                queryKey: [
                    "App$OrderCountPerState",
                    DB$Enumerators.Tables.Orders
                ],
                queryFn: ({ queryKey }) => statistics.countTablePerColumn<keyof Orders>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    "status"
                )
            },
            {
                queryKey: [
                    "App$ProductCountPerState",
                    DB$Enumerators.Tables.Products
                ],
                queryFn: ({ queryKey }) => statistics.countTablePerColumn<keyof Products>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    "product_type"
                )
            },
            {
                queryKey: [
                    "App$TopSellingProducts",
                    DB$Enumerators.Tables.Products,
                    DB$Enumerators.Tables.Orders,
                    page.data?.TopSellingProducts
                ],
                queryFn: ({ queryKey }) => statistics.topTableRelation<(Products & { orders: number })[]>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[3] as fetchOptionsType
                )
            },
            {
                queryKey: [
                    "App$TopOrderAreas",
                    DB$Enumerators.Tables.Delivery_Locations,
                    DB$Enumerators.Tables.Orders,
                    page.data?.TopOrderAreas
                ],
                queryFn: ({ queryKey }) => statistics.topTableRelation<(Delivery_Locations & { orders: number })[]>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[3] as fetchOptionsType
                )
            },
            {
                queryKey: [
                    "App$TopCouriers",
                    DB$Enumerators.Tables.Users,
                    DB$Enumerators.Tables.Orders,
                    page.data?.TopCouriers
                ],
                queryFn: ({ queryKey }) => statistics.topTableRelation<(Users & { orders: number })[]>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[3] as fetchOptionsType
                )
            },
            {
                queryKey: [
                    "App$CouponsUseCount",
                    DB$Enumerators.Tables.Coupons,
                    DB$Enumerators.Tables.Orders,
                    Madeirense$Enumerators.StatisticsParameters.Actions.use,
                    page.data?.CouponsUseCount
                ],
                queryFn: ({ queryKey }) => statistics.countTableRelationByAction<(Coupons & { orders: number })[]>(
                    queryKey[1] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[2] as (keyof typeof DB$Enumerators.Tables),
                    queryKey[3] as (keyof typeof Madeirense$Enumerators.StatisticsParameters.Actions),
                    queryKey[4] as fetchOptionsType
                )
            }
        ]
    });

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            let refetchChain = [];

            switch (notificationId) {
                case "MXP$ORDER_DELETE":
                case "MXP$ORDER_FETCH":
                case "MXP$ORDER_INSERT":
                case "MXP$ORDER_UPDATE":
                    refetchChain.push(refetch1);
                    refetchChain.push(refetch2);
                    refetchChain.push(refetch3);
                    refetchChain.push(refetch6);
                    break;

                case "MXP$ORDER_COUPON_USE":
                    refetchChain.push(refetch8);
                    break;

                case "MXP$ORDER_STATUS_UPDATE":
                    if ((data as { order_id: number, status: $Enums.Orders_status }).status === "delivered") {
                        refetchChain.push(refetch7);
                    }

                    break;

                case "MXP$PRODUCT_DELETE":
                case "MXP$PRODUCT_FETCH":
                case "MXP$PRODUCT_INSERT":
                case "MXP$PRODUCT_UPDATE":
                    refetchChain.push(refetch4);
                    refetchChain.push(refetch5);
                    break;

                default: break;
            }

            refetchChain.forEach(r => r());
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [
        refetch1,
        refetch2,
        refetch3,
        refetch4,
        refetch5,
        refetch6,
        refetch7,
        refetch8,
        Storage
    ]);

    function applySearch(e: KeyboardEvent<HTMLInputElement>) {
        const { key, target } = e;

        if (key.toLowerCase() !== "enter") return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        handlePageStateUpdate(target as HTMLInputElement);
    };

    function handleChange$Debounced(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(
            ($element) => handlePageStateUpdate($element),
            (e.target.value === "") ? 0 : 3000,
            e.target as (HTMLInputElement | HTMLSelectElement)
        );
    };

    function handlePageStateUpdate($element: (HTMLInputElement | HTMLSelectElement)) {
        const [
            property,
            type
        ] = $element.dataset.property?.split('$') as [queryType, keyof (typeof defaultFetchOptions)];

        const parameter = $element.name;

        updatePage(p => {
            return {
                ...p,
                data: {
                    ...p.data,
                    [property]: {
                        ...((p.data ?? {})[property]),
                        [type]: {
                            ...((p.data ?? {})[property])?.[type],
                            [parameter]: $element.value
                        }
                    }
                } as stateType
            }
        });
    }

    return <main>
        <h1 className="mb-7">Dashboard</h1>

        <KPISection
            id="kpi-statistics"
            className="w-full"
            kpi={{
                "orders": { isFetching: isFetching3, error: error3, data: (data3 ?? []) },
                "products": { isFetching: isFetching4, error: error4, data: (data4 ?? []) }
            }}
        />

        <section id="order-statistics" className='w-full'>
            <RevenueSection
                data-area="line"
                array={data2 ?? []}
                error={error2}
                isFetching={isFetching2}
                interval={OPI$Query?.interval as dateIntervalsType}
                month={parseInt(OPI$Query?.month as string)}
                year={parseInt(OPI$Query?.year as string)}
                onFilterChange={handlePageStateUpdate}
            />

            <div data-area="dough" data-state={error1 ? "error" : "idle"}>
                {(error1 || isFetching1)
                    ? <>
                        {error1 && <span data-text="tag" className="m-auto">
                            <Icon name="ExclamationCircle" />

                            {error1.message}
                        </span>}

                        {isFetching1 && <Icon name="Loading" className="animate-spin m-auto" />}
                    </>

                    : <DoughnutChart
                        data={(data1 ?? []).map(({ data }) => data as number)}
                        label="Quantidade de pedidos por restaurante"
                        labels={(data1 ?? []).map(({ id }) => availableRestaurants?.find(({ restaurant_id }) => restaurant_id === id)?.name ?? `Restaurante #${id}`)}
                    />
                }
            </div>
        </section>

        <section id="top-statistics">
            <section className="flex flex-col justify-start items-start">
                <section id="top-areas-statistics">
                    <header className='w-full flex flex-row justify-start gap-2 items-center'>
                        <Icon name="MapMarker" />

                        <h2 className='mr-auto'>Localizações com mais pedidos</h2>

                        <input
                            onKeyDown={applySearch}
                            onChange={handleChange$Debounced}
                            className='text-center'
                            data-property="TopOrderAreas$query"
                            name="quantity"
                            type='number'
                            min={1}
                            max={100}
                            defaultValue={TOA$Query?.quantity}
                            data-element="h2"
                            disabled={isFetching5 || error5 !== null}
                        />
                    </header>

                    <ul>{(error6 || isFetching6)
                        ? <>
                            {error6 && <li data-state="error">
                                <Icon name="ExclamationCircle" />

                                {error6.message}
                            </li>}

                            {isFetching6 && <>{Array.from(Array(defaultLoadShadowNumber), (_, idx) => (idx + 1)).map(num => <li key={num} className='bg-gray-50/20 animate-pulse'>
                                <span data-text="tag" className='bg-gray-100/20 animate-pulse'>
                                    <span className='opacity-0'>#{num}</span>

                                    <Icon name="MapMarker" />
                                </span>

                                <p className='opacity-0'>loading</p>

                                <span data-text="tag" className='bg-gray-100/20 animate-pulse ml-auto'>
                                    <Icon name="Order" />

                                    <span className='opacity-0'>0</span>
                                </span>
                            </li>)}</>}
                        </>

                        : (data6?.length === 0)
                            ? <li className='border border-dotted py-1 opacity-20 w-full flex'>
                                <span className='mx-auto'>Sem pedidos</span>
                            </li>

                            : (data6 ?? []).map(({ orders, ...delivery_location }, idx) => <li key={delivery_location.location_id}>
                                <span data-text="tag" data-type="counter">
                                    <span className='font-black'>{`#${idx + 1}`}</span>

                                    <Icon name="MapMarker" />
                                </span>

                                <p className='font-bold italic'>
                                    {Boolean(delivery_location.neighborhood) ? delivery_location.neighborhood : "Diversas"}
                                </p>

                                <span data-text="tag" className='ml-auto'>
                                    <Icon name="Order" />

                                    {orders}
                                </span>
                            </li>)
                    }</ul>
                </section>

                <section id="top-couriers-statistics">
                    <header className='w-full flex flex-row justify-start items-center gap-2'>
                        <Icon name="Delivery" />

                        <h2 className='mr-auto'>Motoristas com mais entregas</h2>

                        <input onKeyDown={applySearch} onChange={handleChange$Debounced} className='text-center' data-property="TopCouriers$query" name="quantity" type='number' min={1} max={100} defaultValue={TC$Query?.quantity} data-element="h2" disabled={isFetching7} />
                    </header>

                    <ul>{(error7 || isFetching7)
                        ? <>
                            {error7 && <li data-state="error">
                                <Icon name="ExclamationCircle" />

                                {error7.message}
                            </li>}

                            {isFetching7 && <>{Array.from(Array(defaultLoadShadowNumber), (_, idx) => (idx + 1)).map(num => <li key={num} className='bg-gray-50/20 animate-pulse'>
                                <span data-text="tag" className='bg-gray-100/20 animate-pulse'>
                                    <span className='opacity-0'>#{num}</span>

                                    <Icon name="MapMarker" />
                                </span>

                                <p className='opacity-0'>loading</p>

                                <span data-text="tag" className='bg-gray-100/20 animate-pulse ml-auto'>
                                    <Icon name="Order" />

                                    <span className='opacity-0'>0</span>
                                </span>
                            </li>)}</>}
                        </>

                        : (data7?.length === 0)
                            ? <li className='border border-dotted py-1 opacity-20 w-full flex'>
                                <span className='mx-auto'>Sem pedidos relacionados com motoristas</span>
                            </li>

                            : (data7 ?? []).map(({ orders, ...user }, idx) => <li key={user.user_id}>
                                <ProfilePictureButton src={user.profile_photo ?? "#"} size='s' />

                                <p className='font-bold'>
                                    {user.name}

                                    <span className='ml-2 italic opacity-45'>
                                        ({user.phone})
                                    </span>
                                </p>

                                <span data-text="tag" className='ml-auto'>
                                    <Icon name="Order" />

                                    {orders}
                                </span>
                            </li>)
                    }</ul>
                </section>

                <section id="coupon-count-statistics">
                    <header className='w-full flex flex-row justify-start items-center gap-2'>
                        <Icon name="Coupon" />

                        <h2>Uso de cupons</h2>
                    </header>

                    <ul>{(error8 || isFetching8)
                        ? <>
                            {error8 && <li data-state="error">
                                <Icon name="ExclamationCircle" />

                                {error8.message}
                            </li>}

                            {isFetching8 && <>{Array.from(Array(defaultLoadShadowNumber), (_, idx) => (idx + 1)).map(num => <li key={num} className='bg-gray-50/20 animate-pulse'>
                                <span data-text="tag" className='bg-gray-100/20 animate-pulse'>
                                    <span className='opacity-0'>#{num}</span>

                                    <Icon name="MapMarker" />
                                </span>

                                <p className='opacity-0'>loading</p>

                                <span data-text="tag" className='bg-gray-100/20 animate-pulse ml-auto'>
                                    <Icon name="Order" />

                                    <span className='opacity-0'>0</span>
                                </span>
                            </li>)}</>}
                        </>

                        : (data8?.length === 0)
                            ? <li className='border border-dotted py-1 opacity-20 w-full flex'>
                                <span className='mx-auto'>Sem cupons usados</span>
                            </li>

                            : (data8 ?? []).map(({ orders, ...coupon }, idx) => <li key={coupon.coupon_id}>
                                <span data-text="tag" data-type="counter">
                                    <span className='font-black'>{`#${idx + 1}`}</span>
                                </span>

                                <Tag>
                                    <Icon name="Coupon" />

                                    {coupon.code}
                                </Tag>

                                <Tag>
                                    <Icon name="Discount" />

                                    {`${coupon.discount}%`}
                                </Tag>

                                <span data-text="tag" className='ml-auto'>
                                    <Icon name="Order" />

                                    {orders}
                                </span>
                            </li>)
                    }</ul>
                </section>
            </section>

            <section id="top-selling-statistics">
                <header className='w-full flex flex-row justify-between items-center'>
                    <h2>Produtos mais vendidos</h2>

                    <input onKeyDown={applySearch} onChange={handleChange$Debounced} className='text-center' data-property="TopSellingProducts$query" name="quantity" type='number' min={1} max={100} defaultValue={TSP$Query?.quantity} data-element="h2" disabled={isFetching5} />
                </header>

                <ul>{(error5 || isFetching5)
                    ? <>
                        {error5 && <li data-state="error">
                            <Icon name="ExclamationCircle" />

                            {error5.message}
                        </li>}

                        {isFetching5 && <li data-loading>
                            <Icon name="Loading" className='animate-spin' />
                        </li>}
                    </>

                    : (data5?.length === 0)
                        ? <li className='border border-dotted opacity-20'>
                            <span className='mx-auto'>Sem produtos</span>
                        </li>

                        : (data5 ?? []).map(({ orders, ...product }, idx) => <li key={product.product_id}>
                            <div data-type="counter">
                                <span className='font-black'>{`#${idx + 1}`}</span>

                                <Icon name="Food" />
                            </div>

                            <div style={{ backgroundImage: `url(${product.thumbnail ?? "#"})` }} data-type="thumbnail"></div>

                            <p className='font-bold italic'>{product.name}</p>

                            <span data-text="tag" className='w-full'>
                                <Icon name="Order" />

                                {orders}

                                <span className='ml-auto'>
                                    {Boolean(parseInt(`${product.price}`))
                                        ? `${formatNumber(orders * parseFloat(`${product.price}`))}${orders > 1 ? ` (${formatNumber(parseFloat(`${product.price}`))})` : ""}`
                                        : "Grátis"
                                    }
                                </span>
                            </span>
                        </li>)
                }</ul>
            </section>
        </section>
    </main>
};

interface IKPISectionPropTypes extends ComponentProps<"section"> {
    kpi: Record<
        KPISectionType,
        {
            isFetching?: boolean,
            error?: Error | null,
            data: countEntryType[]
        }
    >;
};

type KPISectionType = (
    | "orders"
    | "products"
);

const KPISection = (
    {
        kpi,
        ...props
    }: IKPISectionPropTypes
) => {
    const [pickedSection, setPickedSection] = useState<`kpi-${KPISectionType}`>("kpi-orders");

    const sections = [
        { key: `Pedidos #`, value: "kpi-orders", icon: <Icon name="Order" /> },
        { key: `Produtos #`, value: "kpi-products", icon: <Icon name="Food" /> },
    ];

    function pickSection(value: string) {
        return (e: MouseEvent<HTMLButtonElement>) => {
            setPickedSection(value as any);
        }
    };

    const LIST_ITEM_LOADER = () => Array.from(Array(3), (_, idx) => (idx + 1)).map(num => <li key={num} className='bg-gray-50/20 animate-pulse'>
        <span data-text="tag" className='w-full bg-gray-100/20 animate-pulse'>
            <span className='opacity-0'>loading</span>
        </span>

        <span className='opacity-0'>loading</span>
    </li>);

    useEffect(() => {
        const $section = document.getElementById(pickedSection);

        if (!$section) return;

        $section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [pickedSection]);

    return <section className="HORIZONTAL_SCROLLTO_SECTION" {...props}>
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection(kvp.value)} value={kvp.value} variant="text" data-selected={pickedSection === kvp.value}>
                {kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div data-type="container">
            <section id="kpi-orders" className="gap-2">{
                kpi["orders"].error
                    ? <div data-state="error" className='w-full flex flex-row justify-start items-center gap-2'>
                        <Icon name="ExclamationCircle" />

                        {kpi["orders"].error.message}
                    </div>

                    : <ul>{
                        kpi["orders"].isFetching
                            ? <LIST_ITEM_LOADER />

                            : kpi["orders"].data.map(({ data, id }) => <li key={id}>
                                <span data-text="tag" className='w-full'>
                                    {getLabelIcon(id as $Enums.Orders_status)}

                                    {getLabel(id as $Enums.Orders_status)}
                                </span>

                                <span>{data}</span>
                            </li>)
                    }</ul>
            }
            </section>

            <section id="kpi-products" className="gap-2">{
                kpi["orders"].error
                    ? <div data-state="error" className='w-full flex flex-row justify-start items-center gap-2'>
                        <Icon name="ExclamationCircle" />

                        {kpi["orders"].error.message}
                    </div>

                    : <ul>{
                        kpi["products"].isFetching
                            ? <LIST_ITEM_LOADER />

                            : kpi["products"].data.map(({ data, id }) => <li key={id}>
                                <span data-text="tag" className='w-full'>
                                    {getLabelIcon(id as $Enums.Orders_status)}

                                    {getLabel(id as $Enums.Products_product_type)}
                                </span>

                                <span>{data}</span>
                            </li>)
                    }</ul>
            }
            </section>
        </div>
    </section>;
};

type revenueSectionType = (
    | "factual"
    | "total"
    | "orders"
);

interface IRevenueSectionPropTypes extends ComponentProps<"section"> {
    array: orderRevenueType[];
    interval: dateIntervalsType;
    error?: Error | null,
    month?: number;
    year?: number;
    isFetching?: boolean;
    onFilterChange: ($element: (HTMLInputElement | HTMLSelectElement)) => void;
};

const RevenueSection = (
    {
        array,
        interval,
        error,
        month: currentMonth = (new Date().getMonth()),
        year: currentYear = (new Date().getFullYear()),
        isFetching = false,
        onFilterChange,
        ...props
    }: IRevenueSectionPropTypes
) => {
    const [pickedSection, setPickedSection] = useState<revenueSectionType>("total");

    const affix = `${locales.get("pt")?.strings[`Interval$${interval}`]}`;
    const days = Array.from(Array(DAYS_OF_THE_MONTH[currentMonth]), (i, idx) => `${idx + 1}`);
    const months = Array.from(Array(12), (i, idx) => locales.get("pt")?.months.at(idx) as string);
    const years = Array.from(Array(5), (i, idx) => idx).reverse().map(i => `${new Date().getFullYear() - i}`);

    const sections = [
        { key: `Total`, value: "total", icon: <Icon name="Store" /> },
        { key: `Entregas`, value: "factual", icon: <Icon name="Delivery" /> },
        { key: `Pedidos`, value: "orders", icon: <Icon name="Order" /> },
    ];

    const datasets = (property: revenueSectionType): Record<
        dateIntervalsType,
        {
            data: number[],
            labels: string[]
        }
    > => ({
        "daily": {
            data: Array.from(Array(DAYS_OF_THE_MONTH[currentMonth]), (i, idx) => array.find(({ day }) => (idx + 1) === (day as number))?.[property] ?? 0),
            labels: days
        },
        "monthly": {
            data: Array.from(Array(12), (i, idx) => array.find(({ month }) => idx === ((month as number) - 1))?.[property] ?? 0),
            labels: months
        },
        "yearly": {
            data: years.map(y => array.find(({ year }) => y === year?.toString())?.[property] ?? 0),
            labels: years
        },
    });

    function handleChange({ target }: ChangeEvent<HTMLSelectElement>) {
        onFilterChange(target);
    };

    function pickSection(value: string) {
        return (e: MouseEvent<HTMLButtonElement>) => {
            setPickedSection(value as any);
        }
    };

    useEffect(() => {
        const $section = document.getElementById(pickedSection);

        if (!$section) return;

        $section.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }, [pickedSection]);

    const $selectProps = {
        "className": "text-center",
        "data-element": "p",
        "data-property": "OrdersPerInterval$query",
        onChange: handleChange
    };

    return <section className="HORIZONTAL_SCROLLTO_SECTION" {...props}>
        <header className='overflow-x-auto flex-nowrap'>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection(kvp.value)} value={kvp.value} variant="text" data-selected={pickedSection === kvp.value} disabled={isFetching}>
                {kvp.icon}

                {kvp.key}
            </Button>)}

            <div className='ml-auto flex flex-row justify-start items-start gap-1' data-state={(isFetching || error) ? "disabled" : "idle"}>
                <select name="interval" defaultValue={interval} {...$selectProps}>
                    {DATE_INTERVALS.map(_interval => <option key={_interval} value={_interval}>
                        {locales.get("pt")?.strings[`Interval$${_interval}`]}
                    </option>)}
                </select>

                <select name="month" defaultValue={currentMonth} disabled={interval !== "daily"} {...$selectProps}>
                    {months.map((month, idx) => <option key={month} value={idx}>
                        {month}
                    </option>)}
                </select>

                <select name="year" defaultValue={currentYear} disabled={interval === "yearly"} {...$selectProps}>
                    {years.map(year => <option key={year} value={year}>
                        {year}
                    </option>)}
                </select>
            </div>
        </header>

        <div data-type="container">
            {(isFetching || error)
                ? <section id={pickedSection} className="gap-2">
                    {error && <div data-state="error" className='flex flex-row justify-start items-center gap-2'>
                        <Icon name="ExclamationCircle" />

                        {error.message}
                    </div>}

                    {isFetching && <Icon name="Loading" className="animate-spin m-auto" />}
                </section>

                : <>
                    <section id="total" className="gap-2">
                        <LineChart
                            data={datasets("total")[interval].data}
                            label={`Rendimento total / ${affix}`}
                            labels={datasets("total")[interval].labels}
                            options={{
                                borderColor: CHART_COLOR_MAP.at(24)
                            }}
                            showAllTicksOnXAxis
                            showWholeNumbersOnYAxis
                        />
                    </section>

                    <section id="factual" className="gap-2">
                        <LineChart
                            data={datasets("factual")[interval].data}
                            label={`Rendimento de todos pedidos entregues / ${affix}`}
                            labels={datasets("factual")[interval].labels}
                            options={{
                                borderColor: CHART_COLOR_MAP.at(4)
                            }}
                            showAllTicksOnXAxis
                            showWholeNumbersOnYAxis
                        />
                    </section>

                    <section id="orders" className="gap-2">
                        <LineChart
                            data={datasets("orders")[interval].data}
                            label={`Nº de pedidos / ${affix}`}
                            labels={datasets("orders")[interval].labels}
                            options={{
                                borderColor: CHART_COLOR_MAP.at(11)
                            }}
                            showAllTicksOnXAxis
                            showWholeNumbersOnYAxis
                        />
                    </section>
                </>
            }
        </div>
    </section>
};

export default BackOfficeDashboardPage;