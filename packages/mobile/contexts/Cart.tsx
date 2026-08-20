import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer
} from "react";

import {
    type App$Types
} from "contexts/App";

import { useProfile } from "./Profile";

import { statusType } from "components/types";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_SUMMARY,
    API$Enumerators,
    Madeirense$Types,
    type appPreferencesType,
    type cartedProductType,
    type cartSummaryType,
    MENU_PRODUCT_TYPES,
} from "@Madeirense/shared";

import type {
    $Enums,
    Products
} from "@Madeirense/database/browser";

import type { IProviderPropTypes } from "./interfaces";
import type { contextActionType } from "./types";

// ***************************************************************************************************************

interface IContext {
    add: (product_id: number) => Promise<boolean>,
    applyCoupon: (coupon_code: string, type: cartType) => Promise<void>,
    cart: cartPropertiesType;
    clear: (type: "all" | cartType) => Promise<boolean>,
    clear$Dry: (type: "all" | cartType) => void
    errors: Error[];
    remove: (product_id: number) => Promise<boolean>,
    state: contextStatusType;
};

interface IContextState {
    cart: cartPropertiesType;
    status: contextStatusType;
    errors: Error[];
};

type cartPropertiesType = {
    deliveryCart: cartedProductType[],
    deliverySummary: cartSummaryType,
    eventCart: cartedProductType[],
    eventSummary: cartSummaryType
};

type cartType = "delivery" | "event";

type contextStatusType = statusType<(
    | "adding"
    | "applying-coupon"
    | "discarding"
    | "removing"
    | `updating-${cartType | ""}Summary`
)>;

type cartActionType = (
    | contextActionType<contextStatusType>
    | { type: 'CLEAR_CART' }
    | { type: 'CLEAR_DELIVERY_CART' }
    | { type: 'CLEAR_EVENT_CART' }
    | { type: 'SET_CART'; payload: cartPropertiesType }
    | { type: 'SET_DELIVERY_CART'; payload: cartedProductType[] }
    | { type: 'SET_EVENT_CART'; payload: cartedProductType[] }
    | { type: 'SET_DELIVERY_SUMMARY'; payload: cartSummaryType }
    | { type: 'SET_EVENT_SUMMARY'; payload: cartSummaryType }
);

const DEFAULT_STATE = {
    deliveryCart: [],
    deliverySummary: DEFAULT_SUMMARY,
    eventCart: [],
    eventSummary: DEFAULT_SUMMARY
};

function reducer(
    state: IContextState,
    action: cartActionType
): IContextState {
    switch (action.type) {
        case 'ADD_ERROR':
            return { ...state, errors: [action.payload, ...state.errors] };

        case 'CLEAR_ERRORS':
            return { ...state, errors: [] };

        case 'RESET':
            return { status: 'idle', errors: [], cart: DEFAULT_STATE };

        case 'SET_CART':
            return { status: 'idle', errors: [], cart: action.payload };

        case "SET_DELIVERY_CART":
            return { ...state, status: 'updating-deliverySummary', cart: { ...state.cart, deliveryCart: action.payload }, errors: [] };

        case "SET_EVENT_CART":
            return { ...state, status: 'updating-eventSummary', cart: { ...state.cart, eventCart: action.payload }, errors: [] };

        case 'SET_DELIVERY_SUMMARY':
            return { ...state, status: "idle", cart: { ...state.cart, deliverySummary: action.payload }, errors: [] };

        case 'SET_EVENT_SUMMARY':
            return { ...state, status: "idle", cart: { ...state.cart, eventSummary: action.payload }, errors: [] };

        case 'SET_STATUS':
            return { ...state, status: action.payload };

        default:
            return state;
    }
};

const CartContext = createContext<IContext>({
    cart: {
        deliveryCart: [],
        deliverySummary: DEFAULT_SUMMARY,
        eventCart: [],
        eventSummary: DEFAULT_SUMMARY,
    },
    errors: [],
    state: "idle",
    add: () => Promise.resolve(false),
    applyCoupon: () => Promise.resolve(),
    clear: () => Promise.resolve(false),
    remove: () => Promise.resolve(false),
    clear$Dry: () => { }
});

const CartProvider = ({ children, clients, storageManager = undefined }: IProviderPropTypes) => {
    const { state: profileState } = useProfile();

    const [state, dispatch] = useReducer(reducer, {
        cart: DEFAULT_STATE,
        errors: [],
        status: "idle",
    });

    const handleError = useCallback((error: unknown, fallbackStatus: contextStatusType = 'idle') => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        dispatch({ type: 'ADD_ERROR', payload: new Error(errorMessage) });
        dispatch({ type: 'SET_STATUS', payload: fallbackStatus });
    }, []);

    const add = useCallback(async (product_id: number) => {
        dispatch({ type: "SET_STATUS", payload: "adding" });

        try {
            let array = [] as cartedProductType[];
            let type: cartType;

            const { Products: product } = (await clients.carts.addItem(product_id)) ?? {};

            switch (product?.product_type) {
                case "ticket":
                    array = [...state.cart.eventCart];
                    type = "event";
                    break;

                default:
                    array = [...state.cart.deliveryCart];
                    type = "delivery";
                    break;
            };

            const index = array.findIndex(pr => pr.product_id === product?.product_id);

            if (index > -1) array[index].quantity += 1;
            else array.push(product as Products & { quantity: number });

            switch (type) {
                case "delivery": dispatch({ type: "SET_DELIVERY_CART", payload: array }); break;
                case "event": dispatch({ type: "SET_EVENT_CART", payload: array }); break;

                default: throw new Error("Tipo de carrinho inválido");
            };

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients.carts, handleError, state.cart.deliveryCart, state.cart.eventCart]);

    const applyCoupon = useCallback(async (coupon_code: string, type: cartType) => {
        dispatch({ type: "SET_STATUS", payload: "applying-coupon" });

        try {
            const summary = (await clients.carts.getSummary(type, { coupon_code })) as cartSummaryType;

            switch (type) {
                case "delivery": dispatch({ type: "SET_DELIVERY_SUMMARY", payload: summary }); break;
                case "event": dispatch({ type: "SET_EVENT_SUMMARY", payload: summary }); break;

                default: break;
            }
        } catch (error) {
            handleError(error);
        }
    }, [clients.carts, handleError]);

    const clear$Dry = useCallback((type: "all" | cartType = "all") => {
        switch (type) {
            case "delivery": dispatch({ type: "CLEAR_DELIVERY_CART" }); break;
            case "event": dispatch({ type: "CLEAR_EVENT_CART" }); break;

            case "all":
            default: dispatch({ type: "CLEAR_CART" }); break;
        };
    }, []);

    const clear = useCallback(async (type: "all" | "delivery" | "event" = "all") => {
        dispatch({ type: "SET_STATUS", payload: "discarding" });

        try {
            await clients.carts.clear(type);

            clear$Dry(type);

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clear$Dry, handleError, clients.carts]);

    const getMySummary = useCallback(async (state: contextStatusType) => {
        try {
            let type: cartType;

            switch (state) {
                case "updating-deliverySummary": type = "delivery"; break;
                case "updating-eventSummary": type = "event"; break;

                default: return;
            };

            dispatch({ type: "SET_STATUS", payload: `updating-${type}Summary` });

            const summary = (await clients.carts.getSummary(type)) ?? DEFAULT_SUMMARY

            switch (type) {
                case "delivery": dispatch({ type: "SET_DELIVERY_SUMMARY", payload: summary }); break;
                case "event": dispatch({ type: "SET_EVENT_SUMMARY", payload: summary }); break;

                default: break;
            }
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients.carts, handleError]);

    const getMyCart = useCallback(async () => {
        dispatch({ type: "SET_STATUS", payload: "loading" });

        try {
            const cart = (await clients.carts.getMyCart()) ?? [];

            console.log({ cart });
            
            const deliveryCart = cart.filter(p => !p.product_type ? false : (MENU_PRODUCT_TYPES).includes(p.product_type));
            const deliverySummary = (await clients.carts.getSummary("delivery")) ?? DEFAULT_SUMMARY;

            const eventCart = cart.filter(p => !p.product_type ? false : (["ticket"] as $Enums.Products_product_type[]).includes(p.product_type));
            const eventSummary = (await clients.carts.getSummary("event")) ?? DEFAULT_SUMMARY;

            dispatch({
                type: "SET_CART", payload: {
                    deliveryCart,
                    deliverySummary,
                    eventCart,
                    eventSummary
                }
            });
        } catch (error) {
            handleError(error);
        }
    }, [clients.carts, handleError]);

    const remove = useCallback(async (product_id: number) => {
        const product = [
            ...state.cart.deliveryCart,
            ...state.cart.eventCart
        ].find(p => p.product_id === product_id);

        if (!product) return false;

        dispatch({ type: "SET_STATUS", payload: "loading" });

        try {
            await clients.carts.removeItem(product_id);

            let array = [] as cartedProductType[];
            let type: cartType;

            switch (product.product_type) {
                case "ticket":
                    array = [...state.cart.eventCart];
                    type = "event";
                    break;

                default:
                    array = [...state.cart.deliveryCart];
                    type = "delivery";
                    break;
            };

            const index = array.findIndex(pr => pr.product_id === product_id);

            array[index].quantity -= 1;

            if (array[index].quantity === 0) array = array.filter((_, idx) => idx !== index);

            switch (type) {
                case "delivery": dispatch({ type: "SET_DELIVERY_CART", payload: array }); break;
                case "event": dispatch({ type: "SET_EVENT_CART", payload: array }); break;

                default: throw new Error(`Invalid cart type: ${type}`);
            };

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [clients.carts, handleError, state.cart.deliveryCart, state.cart.eventCart]);

    useEffect(() => {
        getMySummary(state.status);
    }, [state.status, getMySummary]);

    useEffect(() => {
        switch (profileState) {
            case "logged": getMyCart(); break;

            default: break;
        }
    }, [profileState, getMyCart]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerSummaryCalculation(event: MessageEvent) {
            const preferences = (await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            if (!notificationId.includes("APP_PROPERTY")) return;

            const property = (notificationId.split("$") as [
                string,
                string,
                keyof App$Types.properties,
                keyof typeof API$Enumerators.Actions
            ])[2];

            switch (property) {
                case "Coupons":
                case "Products":
                case "Restaurant_Events":
                    await getMyCart();
                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerSummaryCalculation);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerSummaryCalculation);
        }
    }, [storageManager, getMyCart]);

    const contextValue = useMemo(() => ({
        add,
        applyCoupon,
        cart: state.cart,
        clear,
        clear$Dry,
        errors: state.errors,
        remove,
        state: state.status
    }), [
        add,
        applyCoupon,
        clear,
        clear$Dry,
        remove,
        state
    ]);

    return <CartContext.Provider value={contextValue}>
        {children}
    </CartContext.Provider>
};

const useCart = (): IContext => {
    let context = useContext(CartContext);

    if (!context) throw new Error(`'useCart' was used outside of its context.`);

    return context;
};

export type {
    cartType
};

export {
    CartProvider,
    useCart
};