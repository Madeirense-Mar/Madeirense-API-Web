import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from "react";

import {
    DEFAULT_APP_PREFERENCES,
    checkBrowserFeatureSupport,
    getCurrentLocation,
    requestBrowserFeaturePermission,
    toUInt8Array,
    type appPreferencesType,
    type authenticationCredentialsType,
    type authenticatedProfileType
} from "@Madeirense/shared";

import env from "env";

import MXP$App from "configurations";

import type {
    Delivery_Locations,
    Push_Notification_Subscriptions,
    Users
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

// ***************************************************************************************************************

interface IContext {
    deleteProfile: () => Promise<boolean>;
    errors: Error[];
    favorite: (productId: number) => Promise<boolean>;
    login: (credentials: authenticationCredentialsType, callback?: (user: authenticatedProfileType) => void) => Promise<boolean>;
    logout: () => Promise<void>;
    refresh: () => Promise<boolean>;
    register: (payload: Omit<Users, "user_id"> & { password: string }, callback?: (user: authenticatedProfileType) => void) => Promise<boolean>;
    removeDeliveryLocation: (locationId: number) => Promise<boolean>;
    requestLocationPermission: (
        callback?: (result: boolean, error: GeolocationPositionError | null) => void
    ) => Promise<void>;
    state: contextStatusType;
    subscribe: (type: subscriptionType) => Promise<boolean>;
    unfavorite: (productId: number) => Promise<boolean>;
    unsubscribe: (type: subscriptionType) => Promise<boolean>;
    update: (payload: authenticatedProfileType) => Promise<void>;
    upsertDeliveryLocation: (payload: Delivery_Locations) => Promise<void>;
    user?: authenticatedProfileType;
}

interface IContextState {
    errors: Error[];
    status: contextStatusType;
    user?: authenticatedProfileType;
};

type actionType = (
    | contextActionType<contextStatusType>
    | { type: 'SET_USER'; payload: authenticatedProfileType }
    | { type: 'UPDATE_USER'; payload: Partial<authenticatedProfileType> }
);

type contextStatusType = statusType<
    | "authenticating"
    | "deleting"
    | "guest"
    | "leaving"
    | "locating"
    | "logged"
    | "favoriting"
    | "refreshing"
    | "registering"
    | "subscribing"
    | "unfavoriting"
    | "unsubscribing"
    | `updating-${("location" | "profile")}`
>;

type subscriptionType = (
    | "push-notification"
);

type updateType = (
    | "location"
    | "profile"
);

function reducer(
    state: IContextState,
    action: actionType
): IContextState {
    switch (action.type) {
        case 'ADD_ERROR':
            return { ...state, errors: [action.payload, ...state.errors] };

        case 'CLEAR_ERRORS':
            return { ...state, errors: [] };

        case 'RESET':
            return { status: 'guest', user: undefined, errors: [] };

        case 'SET_STATUS':
            return { ...state, status: action.payload };

        case 'SET_USER':
            return { ...state, status: 'logged', user: action.payload, errors: [] };

        case 'UPDATE_USER':
            return { ...state, status: "logged", user: (state.user) ? { ...state.user, ...action.payload } : undefined };

        default:
            return state;
    }
}

const ProfileContext = createContext<IContext>({
    deleteProfile: () => Promise.resolve(false),
    errors: [],
    favorite: () => Promise.resolve(false),
    login: () => Promise.resolve(false),
    logout: () => Promise.resolve(),
    refresh: () => Promise.resolve(false),
    register: () => Promise.resolve(false),
    removeDeliveryLocation: () => Promise.resolve(false),
    requestLocationPermission: () => Promise.resolve(),
    state: "loading",
    subscribe: () => Promise.resolve(false),
    unfavorite: () => Promise.resolve(false),
    unsubscribe: () => Promise.resolve(false),
    update: () => Promise.resolve(),
    upsertDeliveryLocation: () => Promise.resolve(),
    user: undefined,
});

const ProfileProvider = ({
    children,
    clients,
    storageManager = MXP$App.Storage
}: IProviderPropTypes) => {
    const {
        authentication,
        "delivery-locations": deliveryLocations,
        "push-notifications": pushNotifications,
        users
    } = clients;

    const [state, dispatch] = useReducer(reducer, {
        status: "loading",
        errors: [],
    });

    const handleError = useCallback((error: unknown, fallbackStatus: contextStatusType = 'logged') => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        dispatch({ type: 'ADD_ERROR', payload: new Error(errorMessage) });
        dispatch({ type: 'SET_STATUS', payload: fallbackStatus });
    }, []);

    const deleteProfile = useCallback(async (): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'deleting' });

        try {
            await users.deleteProfile();

            dispatch({ type: 'RESET' });

            return true;
        } catch (error) {
            handleError(error, 'guest');

            return false;
        } finally {

        }
    }, [users, handleError]);

    const updateUserFavorites = useCallback((favorites: any[]) => {
        dispatch({ type: 'UPDATE_USER', payload: { Favorites: favorites } });
    }, []);

    const favorite = useCallback(async (productId: number): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'favoriting' });

        try {
            const favorites = await users.favorite(productId);

            if (!favorites) throw new Error("Unable to update favorites, an error occurred while retrieving them");

            updateUserFavorites([...favorites]);

            dispatch({ type: 'SET_STATUS', payload: 'logged' });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [users, handleError, updateUserFavorites]);

    const unfavorite = useCallback(async (productId: number): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'unfavoriting' });

        try {
            const favorites = await users.unfavorite(productId);

            if (!favorites) throw new Error("Unable to update favorites, an error occurred while retrieving them");

            updateUserFavorites([...favorites]);

            dispatch({ type: 'SET_STATUS', payload: 'logged' });

            return true;
        } catch (error) {
            handleError(error);
            return false;
        }
    }, [users, handleError, updateUserFavorites]);

    const login = useCallback(async (
        credentials: authenticationCredentialsType,
        callback?: (user: authenticatedProfileType) => void
    ): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'authenticating' });

        let user: authenticatedProfileType | undefined = undefined;

        try {
            user = await authentication.login(credentials);

            if (!user) throw new Error("Unable to login");

            dispatch({ type: 'SET_USER', payload: user });

            storageManager?.removeItem("L_PROFILE$TEMP");

            return true;
        } catch (error) {
            handleError(error, 'guest');

            return false;
        } finally {
            if (user)
                callback?.(user);
        }
    }, [authentication, storageManager, handleError]);

    const logout = useCallback(async (): Promise<void> => {
        dispatch({ type: 'SET_STATUS', payload: 'leaving' });

        try {
            await authentication.logout();
        } catch (error) {
            // Silent error handling for logout
        } finally {
            dispatch({ type: 'RESET' });
        }
    }, [authentication]);

    const refresh = useCallback(async (): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'refreshing' });

        try {
            const user = await authentication.getSession();

            if (!user) throw new Error("Unable to verify session");

            dispatch({ type: 'SET_USER', payload: user });

            return true;
        } catch (error) {
            handleError(error);

            return false;
        }
    }, [authentication, handleError]);

    const register = useCallback(async (
        payload: Omit<Users, "user_id"> & { password: string },
        callback?: (user: authenticatedProfileType) => void
    ): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'registering' });

        let user: authenticatedProfileType | undefined = undefined;

        try {
            const userWithTokens = await users.register(payload);

            if (!userWithTokens) throw new Error("Unable to register user");

            const {
                tokens,
                ..._user
            } = userWithTokens;

            user = _user;

            dispatch({ type: 'SET_USER', payload: user });

            return true;
        } catch (error) {
            handleError(error, 'guest');

            return false;
        } finally {
            if (user)
                callback?.(user);
        }
    }, [users, handleError]);

    const requestLocationPermission = useCallback(async (
        callback?: (result: boolean, error: GeolocationPositionError | null) => void
    ): Promise<void> => {
        if ([
            !storageManager,
        ].includes(true)) return;

        const preferences: appPreferencesType =
            (await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES")) ??
            DEFAULT_APP_PREFERENCES;

        try {
            dispatch({ type: 'SET_STATUS', payload: 'locating' });

            await getCurrentLocation();

            await storageManager?.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                ...preferences,
                location: "allowed"
            });

            callback?.(true, null);
        } catch (error) {
            const geoError = error as GeolocationPositionError;

            callback?.(false, geoError);

            await storageManager?.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                ...preferences,
                location: geoError.code === 1 ? "denied" : "deferred"
            });
        } finally {
            dispatch({ type: 'SET_STATUS', payload: 'idle' });
        }
    }, [storageManager]);

    const removeDeliveryLocation = useCallback(async (locationId: number): Promise<boolean> => {
        dispatch({ type: 'SET_STATUS', payload: 'updating-location' });

        try {
            if (!state.user) throw new Error("User is undefined");

            await deliveryLocations.delete(locationId);

            const updatedLocations = (state.user.Delivery_Locations ?? [])
                .filter(({ location_id }: { location_id: number }) => location_id !== locationId);

            dispatch({
                type: 'UPDATE_USER',
                payload: { Delivery_Locations: updatedLocations }
            });

            dispatch({ type: 'SET_STATUS', payload: 'logged' });

            // push({
            //     id: "N#REMOVED_LOCATION",
            //     alert: "Ponto de entrega removido do perfil",
            //     type: "alert",
            //     options: { ttl: APP_TTL_DEFAULT }
            // });

            return true;
        } catch (error) {
            handleError(error);
            return false;
        }
    }, [deliveryLocations, handleError, state.user]);

    const update = useCallback(async ({
        Delivery_Locations,
        Push_Notification_Subscriptions,
        Favorites,
        ...payload
    }: authenticatedProfileType): Promise<void> => {
        dispatch({ type: 'SET_STATUS', payload: 'updating-profile' });

        try {
            const updatedUser = await users.update({
                ...payload,
                phone: payload.phone.replace(/\s+/g, '')
            });

            dispatch({ type: 'UPDATE_USER', payload: updatedUser as Users });

            // push({
            //     id: "N#PROFILE_UPDATED",
            //     alert: "Perfil atualizado",
            //     type: "alert",
            //     options: { variant: "success" }
            // });
        } catch (error) {
            handleError(error);
        }
    }, [users, handleError]);

    const upsertDeliveryLocation = useCallback(async (
        payload: Delivery_Locations
    ): Promise<void> => {
        dispatch({ type: 'SET_STATUS', payload: 'updating-location' });

        try {
            if (!state.user) throw new Error("User is undefined");

            const existingLocations: Delivery_Locations[] = state.user.Delivery_Locations ?? [];
            const locationIds = existingLocations.map(loc => loc.location_id);
            const isUpdate = locationIds.includes(payload.location_id);

            let Delivery_Locations: Delivery_Locations[] = [];
            let response: Delivery_Locations;

            if (isUpdate) {
                response = await deliveryLocations.update(payload) as Delivery_Locations;

                Delivery_Locations = existingLocations.map(loc =>
                    loc.location_id === payload.location_id ? response :
                        (response.preferred ? { ...loc, preferred: false } : loc)
                );
            } else {
                response = await deliveryLocations.create(payload) as Delivery_Locations;

                Delivery_Locations = [...existingLocations, response];
            }

            dispatch({
                type: 'UPDATE_USER',
                payload: { Delivery_Locations }
            });
        } catch (error) {
            handleError(error);
        }
    }, [deliveryLocations, handleError, state.user]);

    const subscribe = useCallback(async (type: subscriptionType): Promise<boolean> => {
        if (type !== "push-notification" || !state.user) return false;

        if (!env.VAPID_PUBLIC_KEY) return false;

        const subscribeToPushNotifications = async (): Promise<boolean> => {
            try {
                if (!checkBrowserFeatureSupport("ServiceWorker", "PushManager")) return false;

                dispatch({ type: 'SET_STATUS', payload: 'subscribing' });

                const registration = await navigator.serviceWorker.ready;

                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    await registration.pushManager.subscribe({
                        applicationServerKey: toUInt8Array(env.VAPID_PUBLIC_KEY),
                        userVisibleOnly: true
                    });

                    subscription = await registration.pushManager.getSubscription();

                    if (!subscription)
                        throw new Error('Unable to get browser subscription from registration API\'s push manager');
                }

                const { user_id, ...pushNotificationSubscription } = await pushNotifications.subscribe(
                    subscription.toJSON()
                ) as Push_Notification_Subscriptions;

                const updatedSubscriptions = [
                    ...(state.user?.Push_Notification_Subscriptions ?? []),
                    pushNotificationSubscription
                ];

                dispatch({
                    type: 'UPDATE_USER',
                    payload: { Push_Notification_Subscriptions: updatedSubscriptions }
                });

                return true;
            } catch (error) {
                handleError(error);
                return false;
            }
        };

        switch (Notification.permission) {
            case "default":
                return requestBrowserFeaturePermission("Notification", (permission) => {
                    if (permission === "granted") {
                        subscribeToPushNotifications();
                    }
                });

            case "granted":
                return subscribeToPushNotifications();

            default:
                return false;
        }
    }, [pushNotifications, handleError, state.user]);

    const unsubscribe = useCallback(async (type: subscriptionType): Promise<boolean> => {
        if (type !== "push-notification" || !state.user) return false;

        try {
            if (!checkBrowserFeatureSupport("ServiceWorker", "PushManager")) return false;

            dispatch({ type: 'SET_STATUS', payload: 'unsubscribing' });

            const preferences = (await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES")) ??
                DEFAULT_APP_PREFERENCES;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) return false;

            const existingSubscription = ((state.user.Push_Notification_Subscriptions ?? []) as Push_Notification_Subscriptions[])
                .find(sub => sub.target_endpoint === subscription.endpoint);

            if (!existingSubscription?.subscription_id) return false;

            const { unsubscribeFromBrowser = false } = await pushNotifications.unsubscribe(existingSubscription.subscription_id) ?? {};

            await storageManager?.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                ...preferences,
                notifications: "default"
            });

            if (unsubscribeFromBrowser) await subscription.unsubscribe();

            const updatedSubscriptions = ((state.user.Push_Notification_Subscriptions ?? []) as Push_Notification_Subscriptions[])
                .filter(sub => sub.subscription_id !== existingSubscription.subscription_id);

            dispatch({
                type: 'UPDATE_USER',
                payload: {
                    Push_Notification_Subscriptions: (updatedSubscriptions.length > 0)
                        ? updatedSubscriptions
                        : undefined
                }
            });

            return true;
        } catch (error) {
            if (error instanceof Error) switch (error.name) {
                case "InvalidStateError":
                case "NotFoundError":
                    console.warn('Subscription no longer valid, cleaning up local state');

                    const subscription = await navigator.serviceWorker.ready
                        .then(reg => reg.pushManager.getSubscription())
                        .catch(() => null);

                    if (!subscription) break;

                    const updatedSubscriptions = ((state.user.Push_Notification_Subscriptions ?? []) as Push_Notification_Subscriptions[])
                        .filter(sub => sub.target_endpoint !== subscription.endpoint);

                    dispatch({
                        type: 'UPDATE_USER',
                        payload: {
                            Push_Notification_Subscriptions: (updatedSubscriptions.length > 0)
                                ? updatedSubscriptions
                                : undefined
                        }
                    });
                    break;

                default:
                    break;
            };

            handleError(error);

            return false;
        }
    }, [pushNotifications, handleError, state.user, storageManager]);

    useEffect(() => {
        const initializeSession = async () => {
            dispatch({ type: 'SET_STATUS', payload: 'loading' });

            try {
                const user = await authentication.getSession();

                if (!user) throw new Error("Unable to verify session");

                const preferences = (await storageManager?.getItem<appPreferencesType>("L_APP$PREFERENCES")) ??
                    DEFAULT_APP_PREFERENCES;

                await storageManager?.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                    ...preferences,
                    notifications: ((user.Push_Notification_Subscriptions ?? []).length === 0)
                        ? (preferences.notifications === "allowed") ? "default" : preferences.notifications
                        : "allowed"
                });

                dispatch({ type: 'SET_USER', payload: user });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '';

                switch (errorMessage.toUpperCase()) {
                    case "UNAUTHORIZED": dispatch({ type: 'SET_STATUS', payload: 'guest' }); break;

                    default: handleError(error, 'guest'); break;
                }
            }
        };

        initializeSession();
    }, [authentication, handleError, storageManager]);

    const contextValue = useMemo(() => ({
        deleteProfile,
        errors: state.errors,
        favorite,
        login,
        logout,
        refresh,
        register,
        requestLocationPermission,
        removeDeliveryLocation,
        state: state.status,
        subscribe,
        unfavorite,
        unsubscribe,
        update,
        upsertDeliveryLocation,
        user: state.user
    }), [
        deleteProfile,
        favorite,
        login,
        logout,
        refresh,
        register,
        requestLocationPermission,
        removeDeliveryLocation,
        state,
        subscribe,
        unfavorite,
        unsubscribe,
        update,
        upsertDeliveryLocation,
    ]);

    return (
        <ProfileContext.Provider value={contextValue}>
            {children}
        </ProfileContext.Provider>
    );
};

const useProfile = (): IContext => {
    const context = useContext(ProfileContext);

    if (!context) {
        throw new Error("'useProfile' must be used within a ProfileProvider");
    }

    return context;
};

export type {
    contextStatusType,
    subscriptionType,
    updateType
};

export {
    ProfileProvider,
    useProfile
};