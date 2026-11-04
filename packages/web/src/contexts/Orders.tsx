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
    API$Types,
    Madeirense$Types,
    type appPreferencesType,
    type restaurantOrderType,
    type orderPayloadType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import {
    useProfile
} from "./Profile";

import type {
    $Enums,
    Orders
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
interface IContext {
    cancel: (order_id: number, notes: string) => Promise<boolean>;
    create: (payload: orderPayloadType) => Promise<boolean>;
    clear$Dry: () => void;
    errors: Error[];
    fetch: (params?: Madeirense$Types.searchQueryRecord) => Promise<API$Types.response<restaurantOrderType[], "">>;
    orders: restaurantOrderType[];
    state: contextStatusType;
    update: (order_id: number, status: $Enums.Orders_status, notes?: string) => Promise<void>;
};

interface IContextState {
    status: contextStatusType;
    orders: restaurantOrderType[];
    errors: Error[];
};

type actionType = (
    | contextActionType<contextStatusType>
    | { type: 'CREATE_ORDER'; payload: restaurantOrderType }
    | { type: 'SET_ORDERS'; payload: restaurantOrderType[] }
    | { type: 'SYNC_ORDERS'; payload: notificationPayloadType }
);

type contextStatusType = statusType<
    | "cancelling"
    | "creating"
    | "updating-status"
>;

type notificationPayloadType = {
    order_id: number
} & Partial<Omit<Orders, "order_id">>;
//#endregion

//#region Context declarations ----------------------------
function reducer(
    state: IContextState,
    action: actionType
): IContextState {
    switch (action.type) {
        case 'ADD_ERROR':
            return { ...state, errors: [action.payload, ...state.errors] };

        case 'CLEAR_ERRORS':
            return { ...state, errors: [] };

        case 'CREATE_ORDER':
            return { ...state, status: 'idle', orders: [...state.orders, action.payload], errors: [] };

        case 'RESET':
            return { status: 'idle', orders: [], errors: [] };

        case 'SET_ORDERS':
            return { ...state, status: 'idle', orders: action.payload, errors: [] };

        case 'SET_STATUS':
            return { ...state, status: action.payload };

        case 'SYNC_ORDERS':
            return {
                ...state, status: "idle", orders: state.orders.map(o => {
                    if (o.order_id === action.payload.order_id) return { ...o, ...action.payload };

                    return o;
                })
            };

        default:
            return state;
    }
};

const OrdersContext = createContext<IContext>({
    errors: [],
    orders: [],
    state: "idle",
    create: () => Promise.resolve(false),
    clear$Dry: () => Promise.resolve(),
    fetch: () => Promise.resolve({ success: false, data: [], message: "" }),
    update: () => Promise.resolve(),
    cancel: () => Promise.resolve(false)
});
//#endregion

const OrdersProvider = ({
    children,
    clients,
    storageManager = MXP$App.Storage
}: IProviderPropTypes) => {
    //#region Hooks and state declarations ----------------
    const {
        orders
    } = clients;

    const {
        state: profileState
    } = useProfile();

    const [state, dispatch] = useReducer(reducer, {
        errors: [],
        orders: [],
        status: "idle",
    });
    //#endregion

    //#region Functions -----------------------------------
    const handleError = useCallback((error: unknown, fallbackStatus: contextStatusType = 'idle') => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        dispatch({ type: 'ADD_ERROR', payload: new Error(errorMessage) });
        dispatch({ type: 'SET_STATUS', payload: fallbackStatus });
    }, []);

    const cancel = useCallback(async (order_id: number, notes: string) => {
        dispatch({ type: 'SET_STATUS', payload: 'cancelling' });

        try {
            const data = [...(state.orders ?? [])];

            const index = data.findIndex(({ order_id: oId }) => oId === order_id);

            if (index === -1) throw new Error("Unable to find order");

            const _order = await orders.cancel(order_id, notes);

            data[index] = {
                ...data[index],
                ..._order
            };

            dispatch({ type: 'SET_ORDERS', payload: data });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [orders, handleError, state.orders]);

    const create = useCallback(async (payload: orderPayloadType) => {
        dispatch({ type: 'SET_STATUS', payload: 'creating' });

        try {
            const order = await orders.create(payload);

            if (!order) throw new Error("Unable to create order");

            dispatch({ type: 'CREATE_ORDER', payload: order });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        } finally {

        }
    }, [orders, handleError]);

    const clear$Dry = useCallback(() => dispatch({ type: 'RESET' }), []);

    const fetch = useCallback(async (params: Madeirense$Types.searchQueryRecord = { limit: "100" }) => {
        try {
            const response = await orders.getMyOrders(params);

            return response;
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }, [orders]);

    const getMyOrders = useCallback(async () => {
        dispatch({ type: 'SET_STATUS', payload: 'loading' });

        try {
            const { data } = (await orders.getMyOrders({ limit: "100" }));

            if (!data) throw new Error("Unable to get orders");

            dispatch({ type: 'SET_ORDERS', payload: data });
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [orders, handleError]);

    const update = useCallback(async (order_id: number, status: $Enums.Orders_status, notes?: string) => {
        dispatch({ type: 'SET_STATUS', payload: 'updating-status' });

        try {
            let data = [...(state.orders ?? [])];

            const index = data.findIndex(({ order_id: oId }) => oId === order_id);

            if (index === -1) throw new Error("Unable to find order");

            const _order = (await orders.updateStatus({ order_id, status, notes }));

            data[index] = {
                ...data[index],
                ..._order
            };

            dispatch({ type: 'SET_ORDERS', payload: data });
        } catch (error) {
            handleError(error);
        }
    }, [orders, handleError, state.orders]);
    //#endregion

    //#region Effects -------------------------------------
    useEffect(() => {
        switch (profileState) {
            case "logged": getMyOrders(); break;

            default: break;
        }
    }, [profileState, getMyOrders]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function updateOrders(event: MessageEvent) {
            const preferences = await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data
            } = event.data as Madeirense$Types.pushNotification<notificationPayloadType>;

            if (!notificationId.includes("ORDER")) return;

            dispatch({ type: "SET_STATUS", payload: "syncing" });

            switch (notificationId) {
                case "MXP$ORDER_DRIVER_ASSIGNATION":
                case "MXP$ORDER_DRIVER_REASSIGNATION":
                case "MXP$ORDER_STATUS_UPDATE":
                    dispatch({ type: "SYNC_ORDERS", payload: data });

                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', updateOrders);

        return () => {
            navigator.serviceWorker.removeEventListener('message', updateOrders);
        }
    }, [storageManager]);
    //#endregion

    const contextValue = useMemo(() => ({
        cancel,
        create,
        clear$Dry,
        errors: state.errors,
        fetch,
        orders: state.orders,
        state: state.status,
        update,
    }), [
        cancel,
        create,
        clear$Dry,
        fetch,
        state,
        update
    ]);

    return <OrdersContext.Provider value={contextValue}>
        {children}
    </OrdersContext.Provider>
};

//#region Hooks -------------------------------------------
const useOrders = (): IContext => {
    let context = useContext(OrdersContext);

    if (!context) throw new Error(`'useOrders' was used outside of its context.`);

    return context;
};
//#endregion

export {
    OrdersProvider,
    useOrders
};