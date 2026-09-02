import {
    useCallback,
    useEffect,
    useState,
    type ComponentProps
} from "react";

import {
    GoogleMap,
    InfoWindow,
    Marker,
    Polyline,
    useJsApiLoader,
    type Libraries
} from "@react-google-maps/api";

import {
    type LatLngLiteral
} from "leaflet";

import {
    DEFAULT_APP_PREFERENCES,
    resolveClassNames,
    type appPreferencesType,
    type Madeirense$Types,
    type restaurantOrderType,
    type tuple
} from "@Madeirense/shared";

import env from "env";

import MXP$App from "configurations";

import Icon from "components/icon";
import Tag from "components/tags";

import { GOOGLE_MARKERS } from "./constants";

import styles from "./deliveryTracker.module.css";

import { Tags } from "../enumerators";

import type {
    Courier_Positions
} from "@Madeirense/database/browser";

import type { variantType } from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    onMapReady?: (map: google.maps.Map) => void;
    order: restaurantOrderType;
    variant?: variantType
};

const API_KEY: string = env.GOOGLE_API_KEY;
const MAP_ID: string = env.GOOGLE_MAP_ID;

const libraries: Libraries = ["marker", "geometry"];

const GoogleMapDeliveryTracker = ({
    className,
    onMapReady,
    order,
    variant = "primary",
    ...props
}: IPropTypes) => {
    const { Storage } = MXP$App;

    const {
        isLoaded,
        loadError = null
    } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: API_KEY,
        libraries
    });

    const [courierPosition, setCourierPosition] = useState<LatLngLiteral>({
        lat: parseFloat(((order.Users_Orders_courier_idToUsers?.Courier_Positions ?? [])[0]?.latitude ?? 0).toString()),
        lng: parseFloat(((order.Users_Orders_courier_idToUsers?.Courier_Positions ?? [])[0]?.longitude ?? 0).toString())
    });
    const [error, setError] = useState<Error | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [routePath, setRoutePath] = useState<google.maps.LatLng[]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
    const [showInfoWindow, setShowInfoWindow] = useState(false);
    const [hasFetchedInitialRoute, setHasFetchedInitialRoute] = useState(false);

    const {
        Delivery_Locations,
        Users_Orders_courier_idToUsers: courier,
        Restaurants
    } = order;

    const fetchAndDisplayRoute = useCallback(async (position: tuple) => {
        if (!map) return;

        try {
            const routeRequest = {
                origin: {
                    location: {
                        latLng: { latitude: position[0], longitude: position[1] }
                    }
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: parseFloat((Delivery_Locations?.latitude ?? 0).toString()),
                            longitude: parseFloat((Delivery_Locations?.longitude ?? 0).toString())
                        }
                    }
                },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                computeAlternativeRoutes: false,
                routeModifiers: {
                    avoidTolls: false,
                    avoidHighways: false,
                    avoidFerries: false
                },
                languageCode: 'en-US',
                units: 'IMPERIAL'
            };

            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
                },
                body: JSON.stringify(routeRequest)
            });

            if (!response.ok) throw new Error(`Routes API error: ${response.status}`);

            const data = await response.json();

            if ((data.routes ?? []).length === 0) return;

            const route = data.routes[0];;

            const decodedPath = window.google.maps.geometry.encoding.decodePath(
                route.polyline.encodedPolyline
            );

            setRoutePath(decodedPath);

            setRouteInfo({
                duration: route.duration || 'N/A',
                distance: `${Math.round(route.distanceMeters / 1000)} km`
            });

            const bounds = new window.google.maps.LatLngBounds();

            decodedPath.forEach(point => bounds.extend(point));

            map.fitBounds(bounds, 50);

            setCourierPosition({
                lat: position[0],
                lng: position[1]
            });
        } catch (error) {
            console.error('Error fetching route:', error);

            setError(error as Error);
        }

        setHasFetchedInitialRoute(true);
    }, [map, Delivery_Locations]);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    useEffect(() => {
        if (hasFetchedInitialRoute) return;

        if (order.Users_Orders_courier_idToUsers?.Courier_Positions) fetchAndDisplayRoute([
            parseFloat((order.Users_Orders_courier_idToUsers.Courier_Positions[0]?.latitude ?? 0).toString()),
            parseFloat((order.Users_Orders_courier_idToUsers.Courier_Positions[0]?.longitude ?? 0).toString())
        ]);
    }, [hasFetchedInitialRoute, order.Users_Orders_courier_idToUsers?.Courier_Positions, fetchAndDisplayRoute]);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        async function triggerRefetchAndDisplay(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data
            } = event.data as Madeirense$Types.pushNotification<Partial<Courier_Positions> & { order_id: number }>;

            if (data.order_id !== order.order_id) return;

            switch (notificationId) {
                case "MXP$COURIER_POSITION$PING":
                    await fetchAndDisplayRoute([
                        data.latitude as any,
                        data.longitude as any
                    ].map(v => parseFloat(v?.toString())) as tuple);

                    break;

                default: break;
            }
        }

        navigator.serviceWorker.addEventListener('message', triggerRefetchAndDisplay);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetchAndDisplay);
        };
    }, [Storage, order.order_id, fetchAndDisplayRoute]);

    const assertions = {
        "hasError": [
            error !== null,
            loadError !== null
        ].includes(true),

        "noAPIKey": (API_KEY === ""),
    };

    const $divProps = {
        className: resolveClassNames(styles[assertions.hasError ? "danger" : variant], className),
        ...props
    };

    switch (true) {
        case (assertions.noAPIKey): {
            console.error("Google Maps API key is not set. Please set VITE_APP_GOOGLE_API_KEY in your environment variables.");

            return <div data-state="error" {...$divProps}>
                <Icon name="ExclamationCircle" />

                Error: Google Maps API key is missing.
            </div>
        }

        case (assertions.hasError): return (<div data-state="error" {...$divProps}>
            <Tag variant="danger">
                <Icon name="ExclamationCircle" />

                Erro ao carregar mapa: {((loadError || error) as Error).message}

                <Icon name="ExclamationCircle" />
            </Tag>
        </div>);

        case (!isLoaded): return (<div data-state="loading" {...$divProps}>
            <Icon name="Loading" className='animate-spin' />
        </div>);

        default: {
            return <div {...$divProps}>
                <GoogleMap
                    center={courierPosition}
                    mapContainerStyle={{
                        width: '100%',
                        height: '400px'
                    }}
                    options={{ mapId: MAP_ID }}
                    zoom={13}
                    {...{
                        onLoad,
                        onUnmount
                    }}
                >
                    {(Delivery_Locations?.latitude && Delivery_Locations?.longitude) && <Marker
                        position={{
                            lat: parseFloat(Delivery_Locations.latitude.toString()),
                            lng: parseFloat(Delivery_Locations.longitude.toString()),
                        }}
                        title="Endereço de entrega"
                        icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(GOOGLE_MARKERS.TARGET_ADDRESS),
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 32)
                        }}
                    />}

                    {(Restaurants.Delivery_Locations?.latitude && Restaurants.Delivery_Locations?.longitude) && <Marker
                        position={{
                            lat: parseFloat(Restaurants.Delivery_Locations.latitude.toString()),
                            lng: parseFloat(Restaurants.Delivery_Locations.longitude.toString()),
                        }}
                        title="Restaurante"
                        icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(GOOGLE_MARKERS.RESTAURANT),
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 32)
                        }}
                    />}

                    {(courierPosition) && (
                        <Marker
                            position={courierPosition}
                            title={`Courier: ${courier?.name}`}
                            icon={{
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(GOOGLE_MARKERS.COURIER),
                                scaledSize: new window.google.maps.Size(32, 32),
                                anchor: new window.google.maps.Point(16, 32)
                            }}
                            onClick={() => setShowInfoWindow(true)}
                        />
                    )}

                    {(showInfoWindow && courierPosition) && (
                        <InfoWindow
                            position={courierPosition}
                            onCloseClick={() => setShowInfoWindow(false)}
                        >
                            <div>
                                <Tag>
                                    <Icon name="Delivery" />

                                    {courier?.name}
                                </Tag>

                                <Tag>
                                    <Icon name="Phone" />

                                    {courier?.phone}
                                </Tag>

                                À caminho!<br />

                                {routeInfo && <small>ETA: {routeInfo.duration}</small>}
                            </div>
                        </InfoWindow>
                    )}

                    {(routePath.length > 0) && (
                        <Polyline
                            path={routePath}
                            options={{
                                strokeColor: '#2196F3',
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                geodesic: true
                            }}
                        />
                    )}
                </GoogleMap>

                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <Tag className={resolveClassNames(styles[Tags.restaurant])}>
                        Restaurante

                        <Icon name="Store" />
                    </Tag>

                    <Tag className={resolveClassNames(styles[Tags.address])}>
                        Endereço de entrega

                        <Icon name="MapMarker" />
                    </Tag>

                    {(order.status === 'assigned') && <Tag className={resolveClassNames(styles[Tags.courier])}>
                        Estafeta

                        <Icon name="Delivery" />
                    </Tag>}

                    {(routeInfo) && <>
                        <Tag className='ml-auto'>
                            <Icon name="MapMarked" />

                            {`Distância - ${routeInfo.distance}`}
                        </Tag>

                        <Tag>
                            <Icon name="Time" />

                            {`Duração - ${routeInfo.duration}`}
                        </Tag>
                    </>}
                </div>
            </div>
        }
    }
};

export default GoogleMapDeliveryTracker;