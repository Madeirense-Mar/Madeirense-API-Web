//#region Imports -----------------------------------------
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer
} from "react";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_APP_SETTINGS,
    API$Enumerators,
    Madeirense$Types,
    type appPreferencesType,
    type applicationSettingsType,
    type couponPayloadType,
    type driverType,
    type restaurantType,
    type restaurantPayloadType,
    type restaurantEventType,
    type restaurantEventPayloadType,
} from "@Madeirense/shared";

import type {
    Coupons,
    Global_Settings
} from "@Madeirense/database/browser";

import type {
    statusType
} from "components/types";

import type { 
    IProviderPropTypes
} from "./interfaces";

import type {
    contextActionType
} from "./types";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
export namespace App$Types {
    export type payload = (
        | { property: "Coupons", payload: Coupons | couponPayloadType }
        | { property: "Global_Settings", payload: Omit<Global_Settings, "setting_id"> }
        | { property: "Restaurants", payload: restaurantPayloadType }
        | { property: "Restaurant_Events", payload: restaurantEventPayloadType }
    )
    
    export type batchUpdatePayload = (
        | payload
        | { property: "Coupons", payload: Partial<Omit<Coupons, "coupon_id">> }
        | { property: "Restaurants", payload: Partial<Omit<restaurantPayloadType, ("location")>> }
    )
    
    export type partialPayload = (
        | { property: "Coupons", payload: Partial<Coupons> }
        | { property: "Global_Settings", payload: Partial<Omit<Global_Settings, "setting_id">> }
        | { property: "Restaurants", payload: Partial<restaurantPayloadType> }
        | { property: "Restaurant_Events", payload: Partial<restaurantEventPayloadType> }
    )

    export type properties = {
        Coupons: Coupons[],
        Global_Settings: applicationSettingsType | null,
        Drivers: driverType[],
        Restaurants: restaurantType[],
        Restaurant_Events: restaurantEventType[],
    }
};

interface IContext {
    app: App$Types.properties;
    create: (specification: App$Types.payload) => Promise<boolean>;
    errors: Error[];
    fetch<K extends keyof App$Types.properties>(property: K, params?: Madeirense$Types.searchQueryRecord): Promise<void>;
    get<K extends keyof App$Types.properties>(property: K, params?: Madeirense$Types.searchQueryRecord): App$Types.properties[K] | null;
    remove: (property: keyof Omit<App$Types.properties, "Global_Settings">, property_id: number) => Promise<void>;
    state: contextStatusType;
    update(specification: App$Types.payload & { id: number }): Promise<boolean>;
    update_BATCH(specification: App$Types.batchUpdatePayload): Promise<boolean>;
    update_PARTIAL(specification: App$Types.partialPayload & { id: number }): Promise<boolean>;
};

interface IContextState {
    app: App$Types.properties;
    errors: Error[];
    status: contextStatusType;
};

type contextStatusType = statusType<(
    | "adding"
    | `${("adding" | "fetching" | "removing" | "syncing" | "updating")}-${keyof App$Types.properties}`
)>;

type notificationPayloadType = (
    | Coupons
    | driverType
    | restaurantType
    | restaurantEventType
);
//#endregion

//#region Default declarations ----------------------------
const DEFAULT_APP_PROPERTIES = {
    Coupons: [],
    Drivers: [],
    Global_Settings: null,
    Restaurants: [],
    Restaurant_Events: []
} as App$Types.properties;

const DEFAULT_MIN_LIMIT = "100";
//#endregion

//#region Scoped procedures -------------------------------
function getPropertyIndexKey(p: keyof App$Types.properties) {
    switch (p) {
        case "Coupons": return "coupon_id" as keyof Coupons;
        case "Drivers": return "user_id" as keyof driverType;
        case "Global_Settings": return "setting_id" as keyof applicationSettingsType;
        case "Restaurant_Events": return "event_id" as keyof restaurantEventType;
        case "Restaurants": return "restaurant_id" as keyof restaurantType;

        default: return null
    };
};
//#endregion

//#region Context declarations ----------------------------
function reducer(
    state: IContextState,
    action: (
        | contextActionType<contextStatusType>
        | { type: 'SET_APP', payload: App$Types.properties }
        | { type: 'SET_RESTAURANTS', payload: restaurantType[] }
        | { type: 'SYNC_PROPERTY', payload: { property: keyof Omit<App$Types.properties, "Global_Settings">, syncActionType: keyof typeof API$Enumerators.Actions, data: Madeirense$Types.pushNotification<Partial<notificationPayloadType>>["data"] } }
        | { type: 'SYNC_GLOBAL_SETTINGS', payload: { syncActionType: keyof typeof API$Enumerators.Actions, data: Partial<applicationSettingsType> } }
    )
): IContextState {
    switch (action.type) {
        case 'ADD_ERROR':
            return { ...state, errors: [action.payload, ...state.errors] };

        case 'CLEAR_ERRORS':
            return { ...state, errors: [] };

        case 'RESET':
            return { status: 'idle', app: DEFAULT_APP_PROPERTIES, errors: [] };

        case 'SET_APP':
            return { status: 'idle', app: action.payload, errors: [] };

        case 'SET_RESTAURANTS':
            return { status: 'idle', app: { ...state.app, Restaurants: action.payload }, errors: [] };

        case 'SET_STATUS':
            return { ...state, status: action.payload };

        case 'SYNC_GLOBAL_SETTINGS':
            switch (action.payload.syncActionType) {
                case API$Enumerators.Actions.UPDATE:
                    return {
                        ...state, status: "idle",
                        app: {
                            ...state.app,
                            Global_Settings: { ...(state.app.Global_Settings ?? DEFAULT_APP_SETTINGS), ...action.payload.data }
                        }
                    };

                default:
                    return { ...state, status: "idle" };
            }

        case 'SYNC_PROPERTY':
            const { data, property, syncActionType } = action.payload;

            switch (syncActionType) {
                case API$Enumerators.Actions.DELETE:
                    return {
                        ...state, status: "idle",
                        app: {
                            ...state.app,
                            [property]: (state.app[property] ?? []).filter((item) => {
                                const idKey = getPropertyIndexKey(property);

                                if (!idKey)
                                    return true;

                                if ((item as any)[idKey] === data.property_id)
                                    return false;

                                return true;
                            })
                        }
                    };

                case API$Enumerators.Actions.INSERT:
                    return {
                        ...state, status: "idle",
                        app: {
                            ...state.app,
                            [property]: [
                                ...state.app[property],
                                ...([data].map(({ property_id, ...rest }) => rest))
                            ]
                        }
                    };

                case API$Enumerators.Actions.UPDATE:
                    return {
                        ...state, status: "idle",
                        app: {
                            ...state.app,
                            [property]: state.app[property].map(item => {
                                const { property_id, ...rest } = data;

                                const idKey = getPropertyIndexKey(property);

                                if (!idKey)
                                    return item;

                                if ((item as any)[idKey] === property_id)
                                    return { ...item, ...rest };

                                return item;
                            })
                        }
                    };

                default:
                    return { ...state, status: "idle" };
            }

        default:
            return state;
    }
};

const AppContext = createContext<IContext>({
    app: DEFAULT_APP_PROPERTIES,
    errors: [],
    state: "idle",
    create: () => Promise.resolve(false),
    fetch: () => Promise.resolve(),
    get: () => null,
    remove: () => Promise.resolve(),
    update: () => Promise.resolve(false),
    update_BATCH: () => Promise.resolve(false),
    update_PARTIAL: () => Promise.resolve(false)
});
//#endregion

const AppProvider = ({ children, clients, storageManager }: IProviderPropTypes) => {
    //#region Hooks and state declarations ----------------
    const [state, dispatch] = useReducer(reducer, {
        errors: [],
        status: "loading",
        app: DEFAULT_APP_PROPERTIES
    });
    //#endregion

    //#region Functions -----------------------------------
    const handleError = useCallback((error: unknown, fallbackStatus: contextStatusType = 'idle') => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        dispatch({ type: 'ADD_ERROR', payload: new Error(errorMessage) });
        dispatch({ type: 'SET_STATUS', payload: fallbackStatus });
    }, []);

    const create = useCallback(async ({
        property,
        payload
    }: App$Types.payload) => {
        dispatch({ type: "SET_STATUS", payload: `adding-${property}` });

        try {
            let app = { ...state.app };

            switch (property) {
                case "Coupons":
                    const Coupon = await clients.coupons.create(payload as couponPayloadType);

                    if (Coupon) app.Coupons.push(Coupon);

                    break;

                case "Restaurants":
                    const Restaurant = await clients.restaurants.create(payload);

                    if (Restaurant) app.Restaurants.push(Restaurant);

                    break;

                case "Restaurant_Events":
                    const Restaurant_Event = await clients["restaurant-events"].create(payload);

                    if (Restaurant_Event) app.Restaurant_Events.push(Restaurant_Event);

                    break;

                default: return false;
            }

            dispatch({ type: "SET_APP", payload: app });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients, state.app, handleError]);

    const fetch = useCallback(async <K extends keyof App$Types.properties>(
        property: K,
        params: Madeirense$Types.searchQueryRecord = { limit: DEFAULT_MIN_LIMIT }
    ) => {
        dispatch({ type: "SET_STATUS", payload: `fetching-${property}` });

        try {
            let app = { ...state.app };

            switch (property) {
                case "Coupons":
                    try { app.Coupons = (await clients.coupons.getAll(params)).data ?? []; } catch (error) { } finally { break; };

                case "Drivers":
                    try { app.Drivers = [...((await clients.restaurants.getAllAvailableDrivers(params)).data ?? [])]; } catch (error) { } finally { break; };

                case "Global_Settings":
                    try { app.Global_Settings = (await clients["global-settings"].get()); } catch (error) { } finally { break; };

                case "Restaurants":
                    try { app.Restaurants = [...((await clients.restaurants.getAll(params)).data ?? [])]; } catch (error) { } finally { break; };

                case "Restaurant_Events":
                    try { app.Restaurant_Events = (await clients["restaurant-events"].getAll(params)).data ?? []; } catch (error) { } finally { break; };

                default: break;
            }

            dispatch({ type: "SET_APP", payload: app });
        } catch (error) {
            handleError(error);
        }
    }, [clients, state.app, handleError]);

    const get = useCallback(<K extends keyof App$Types.properties>(property: K) => {
        return state.app[property] || null;
    }, [state.app]);

    const remove = useCallback(async <K extends keyof Omit<App$Types.properties, "Global_Settings">>(
        property: K,
        property_id: number
    ) => {
        dispatch({ type: "SET_STATUS", payload: `removing-${property}` });

        try {
            let app = { ...state.app };

            switch (property) {
                case "Coupons":
                    await clients.coupons.delete(property_id);

                    app.Coupons = app.Coupons.filter(p => p.coupon_id === property_id);

                    break;

                default: break;
            }

            dispatch({ type: "SET_APP", payload: app });
        } catch (error) {
            handleError(error);
        }
    }, [clients.coupons, handleError, state.app]);

    //#region > Application property updates
    const update = useCallback(async ({
        id,
        property,
        payload
    }: App$Types.payload & { id: number }) => {
        dispatch({ type: "SET_STATUS", payload: `updating-${property}` });

        let app = { ...state.app };
        let index = 0;

        try {
            switch (property) {
                case "Coupons":
                    const coupon = await clients.coupons.update(payload as Coupons);

                    index = app.Coupons.findIndex(({ coupon_id }) => id === coupon_id);

                    app.Coupons[index] = { ...app.Coupons[index], ...coupon };

                    break;

                case "Restaurants":
                    const restaurant = await clients.restaurants.update(id, payload);

                    index = app.Restaurants.findIndex(({ restaurant_id }) => id === restaurant_id);

                    app.Restaurants[index] = { ...app.Restaurants[index], ...restaurant };

                    break;

                case "Restaurant_Events":
                    const event = await clients["restaurant-events"].update(id, payload);

                    index = app.Restaurants.findIndex(({ restaurant_id }) => id === restaurant_id);

                    app.Restaurant_Events[index] = { ...app.Restaurant_Events[index], ...event };

                    break;

                default: return false;
            };

            dispatch({ type: "SET_APP", payload: app });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients, state.app, handleError]);

    const update_BATCH = useCallback(async ({
        payload,
        property
    }: App$Types.batchUpdatePayload) => {
        if (property) dispatch({ type: "SET_STATUS", payload: `updating-${property}` });

        try {
            switch (property) {
                case "Restaurants":
                    const restaurants = (await clients.restaurants.batchOperations(
                        API$Enumerators.BatchActions.update,
                        {
                            body: payload
                        }
                    ));

                    if (!restaurants) throw new Error("Unable to run batch operations on existing restaurants");

                    dispatch({
                        type: "SET_RESTAURANTS",
                        payload: [...restaurants]
                    });

                    break;

                default: return false;
            };

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients.restaurants, handleError]);

    const update_PARTIAL = useCallback(async ({
        id,
        payload,
        property
    }: App$Types.partialPayload & {
        id: number,
    }) => {
        dispatch({
            type: "SET_STATUS",
            payload: `updating-${property}`
        });

        if (!payload) return false;

        let app = { ...state.app };
        let index = 0;

        try {
            switch (property) {
                case "Coupons":
                    const coupon = await clients.coupons.update_PARTIAL({
                        ...payload,
                        coupon_id: id
                    });

                    index = app.Coupons.findIndex(({ coupon_id }) => id === coupon_id);

                    app.Coupons[index] = { ...app.Coupons[index], ...coupon };

                    break;

                case "Global_Settings":
                    app.Global_Settings = {
                        ...app.Global_Settings,
                        ...(await clients["global-settings"].update_PARTIAL({ ...payload, setting_id: id }))
                    } as applicationSettingsType;

                    break;

                case "Restaurants":
                    const restaurant = await clients.restaurants.update_PARTIAL(id, payload);

                    index = app.Restaurants.findIndex(({ restaurant_id }) => id === restaurant_id);

                    app.Restaurants[index] = { ...app.Restaurants[index], ...restaurant };

                    break;

                case "Restaurant_Events":
                    const event = await clients["restaurant-events"].update_PARTIAL(id, payload);

                    index = app.Restaurants.findIndex(({ restaurant_id }) => id === restaurant_id);

                    app.Restaurant_Events[index] = { ...app.Restaurant_Events[index], ...event };

                    break;

                default: return false;
            };

            dispatch({ type: "SET_APP", payload: app });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients, state.app, handleError]);
    //#endregion
    //#endregion

    //#region Effects -------------------------------------
    //#region > Application start-up
    useEffect(() => {
        async function load() {
            dispatch({ type: "SET_STATUS", payload: "loading" });

            let Coupons: Coupons[] = [];
            let Drivers: driverType[] = [];
            let Global_Settings: applicationSettingsType | null = null;
            let Restaurants: restaurantType[] = [];
            let Restaurant_Events: restaurantEventType[] = [];

            try {
                try { Coupons = [...((await clients.coupons.getAll({ limit: DEFAULT_MIN_LIMIT, valid: "true" })).data ?? [])]; } catch (error) { }
                try { Global_Settings = (await clients["global-settings"].get()); } catch (error) { }
                try { Drivers = [...((await clients.restaurants.getAllAvailableDrivers({ limit: DEFAULT_MIN_LIMIT })).data ?? [])]; } catch (error) { }
                try { Restaurants = [...((await clients.restaurants.getAll()).data ?? [])]; } catch (error) { }
                try { Restaurant_Events = (await clients["restaurant-events"].getAll({ limit: DEFAULT_MIN_LIMIT, upcoming: "true" })).data ?? []; } catch (error) { }

                dispatch({
                    type: "SET_APP", payload: {
                        Coupons,
                        Global_Settings,
                        Drivers,
                        Restaurants,
                        Restaurant_Events,
                    }
                });
            } catch (error) {
                handleError(error);
            }
        };

        load();
    }, [clients, handleError]);
    //#endregion

    //#region > Push notification handler
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function handlePushNotification(event: MessageEvent) {
            const preferences = (await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data
            } = event.data as Madeirense$Types.pushNotification<Partial<notificationPayloadType>>;

            if (!notificationId.includes("APP_PROPERTY")) return;

            const meta = (notificationId.split("$") as [
                string,
                string,
                keyof App$Types.properties,
                keyof typeof API$Enumerators.Actions
            ]);

            const property = meta[2];
            const action = meta[3];

            dispatch({ type: "SET_STATUS", payload: `syncing-${property}` });

            switch (action) {
                case API$Enumerators.Actions.FETCH:
                    fetch(property);
                    break;

                default: switch (property) {
                    case "Global_Settings":
                        dispatch({
                            type: "SYNC_GLOBAL_SETTINGS",
                            payload: {
                                data: data as Partial<applicationSettingsType>,
                                syncActionType: action
                            }
                        });
                        break;

                    default:
                        dispatch({
                            type: "SYNC_PROPERTY", payload: {
                                data,
                                property,
                                syncActionType: action
                            }
                        });
                        break;
                };
            };
        };

        navigator.serviceWorker.addEventListener('message', handlePushNotification);

        return () => {
            navigator.serviceWorker.removeEventListener('message', handlePushNotification);
        }
    }, [fetch, storageManager]);
    //#endregion
    //#endregion

    const contextValue = useMemo(() => ({
        app: state.app,
        create,
        errors: state.errors,
        fetch,
        get,
        remove,
        state: state.status,
        update,
        update_BATCH,
        update_PARTIAL
    }), [
        create,
        fetch,
        get,
        remove,
        state,
        update,
        update_BATCH,
        update_PARTIAL
    ]);

    return <AppContext.Provider value={contextValue}>
        {children}
    </AppContext.Provider>
};

//#region Hooks -------------------------------------------
const useApp = () => {
    let context = useContext(AppContext);

    if (!context) throw new Error(`'useApp' was used outside of its context.`);

    return context;
};
//#endregion

export {
    AppProvider,
    useApp
};