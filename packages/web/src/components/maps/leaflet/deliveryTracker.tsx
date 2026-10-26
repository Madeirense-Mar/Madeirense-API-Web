import {
    useEffect,
    useMemo,
    useState,
    type ComponentProps
} from "react";

import L, {
    type LatLngExpression,
    type LatLngLiteral,
    type Map as LeafletMap
} from "leaflet";

import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer
} from "react-leaflet";

import {
    Coordinates,
    resolveClassNames,
    type restaurantOrderType
} from "@Madeirense/shared";

import env from "env";

import Icon from "components/icon";
import Tag from "components/tags";

import {
    FIT_BOUNDS_OPTIONS,
    MAP_DEFAULT_ZOOM,
    MAP_MARKERS,
    MAP_MAX_ZOOM,
    MAP_ROTATION_OPTIONS,
    ROUTE_PATH_OPTIONS
} from "./constants";

import LeafletRotateControl from "./rotateControl";

import {
    fetchDrivingRoute,
    formatDistance,
    formatDuration,
    type routeType
} from "./routing";

import { useCourierPositionPings } from "./useCourierPositionPings";

import {
    isLatLng,
    keepUnlessMoved,
    toLatLng
} from "./utilities";

import styles from "./deliveryTracker.module.css";

import { Tags } from "../enumerators";

import type { variantType } from "components/types";

import "./plugins";

import "leaflet/dist/leaflet.css";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    onMapReady?: (map: LeafletMap) => void;
    order: restaurantOrderType;
    variant?: variantType;
};

const LeafletDeliveryTracker = ({
    className,
    onMapReady,
    order,
    variant = "primary",
    ...props
}: IPropTypes) => {
    const {
        Delivery_Locations,
        Users_Orders_courier_idToUsers: courier,
        Restaurants
    } = order;

    const destination = useMemo(
        () => toLatLng(Delivery_Locations?.latitude, Delivery_Locations?.longitude),
        [Delivery_Locations?.latitude, Delivery_Locations?.longitude]
    );

    const restaurant = useMemo(
        () => toLatLng(Restaurants.Delivery_Locations?.latitude, Restaurants.Delivery_Locations?.longitude),
        [Restaurants.Delivery_Locations?.latitude, Restaurants.Delivery_Locations?.longitude]
    );

    const [map, setMap] = useState<LeafletMap | null>(null);
    const [courierPosition, setCourierPosition] = useState<LatLngLiteral | null>(() => {
        const [lastPosition] = courier?.Courier_Positions ?? [];

        return toLatLng(lastPosition?.latitude, lastPosition?.longitude);
    });
    const [route, setRoute] = useState<routeType | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Only read on mount — MapContainer ignores later `center` changes; the fit-bounds effect takes over.
    const [initialCenter] = useState<LatLngExpression>(() => courierPosition ?? destination ?? restaurant ?? [
        Coordinates.MiddleOfLuanda.LAT,
        Coordinates.MiddleOfLuanda.LNG
    ]);

    useEffect(() => {
        if (map) onMapReady?.(map);
    }, [map, onMapReady]);

    // Courier → drop-off route, re-requested whenever the courier moves meaningfully.
    useEffect(() => {
        if (!courierPosition || !destination) return;

        const controller = new AbortController();

        fetchDrivingRoute(courierPosition, destination, controller.signal)
            .then((nextRoute) => {
                setRoute(nextRoute);
                setError(null);
            })
            .catch((reason: unknown) => {
                if (controller.signal.aborted) return;

                console.error("Error fetching route:", reason);

                setError(reason instanceof Error ? reason : new Error(String(reason)));
            });

        return () => controller.abort();
    }, [courierPosition, destination]);

    // Keep every relevant point (route, restaurant, drop-off, courier) in view.
    useEffect(() => {
        if (!map) return;

        const points: LatLngExpression[] = [
            ...(route?.path ?? []),
            ...[restaurant, destination, courierPosition].filter(isLatLng)
        ];

        const [first, ...rest] = points;

        if (!first) return;

        if (rest.length === 0) map.setView(first, MAP_DEFAULT_ZOOM);
        else map.fitBounds(L.latLngBounds(points), FIT_BOUNDS_OPTIONS);
    }, [map, route, restaurant, destination, courierPosition]);

    // Live courier pings pushed through the service worker.
    useCourierPositionPings(({ orderId, position }) => {
        if (orderId !== order.order_id) return;

        // Returning `previous` unchanged skips the re-render and the route request.
        setCourierPosition((previous) => keepUnlessMoved(previous, position));
    });

    return <div data-component="delivery-tracker" className={resolveClassNames(styles[variant], className)} {...props}>
        <MapContainer
            {...MAP_ROTATION_OPTIONS}
            ref={setMap}
            center={initialCenter}
            className={styles.map}
            maxZoom={MAP_MAX_ZOOM}
            zoom={MAP_DEFAULT_ZOOM}
        >
            <TileLayer
                attribution={env.MAP_TILE_ATTRIBUTION}
                maxZoom={MAP_MAX_ZOOM}
                url={env.MAP_TILE_URL}
            />

            <LeafletRotateControl />

            {route && <Polyline pathOptions={ROUTE_PATH_OPTIONS} positions={route.path} />}

            {destination && <Marker
                icon={MAP_MARKERS.TARGET_ADDRESS}
                position={destination}
                title="Endereço de entrega"
            />}

            {restaurant && <Marker
                icon={MAP_MARKERS.RESTAURANT}
                position={restaurant}
                title="Restaurante"
            />}

            {courierPosition && <Marker
                icon={MAP_MARKERS.COURIER}
                position={courierPosition}
                title={`Estafeta: ${courier?.name ?? ""}`}
                zIndexOffset={1000}
            >
                <Popup>
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

                        {route && <small>ETA: {formatDuration(route.durationSeconds)}</small>}
                    </div>
                </Popup>
            </Marker>}
        </MapContainer>

        {route && <div className="flex flex-row justify-center items-center py-1 gap-2">
            {error && <Tag variant="danger">
                <Icon name="ExclamationCircle" />

                Erro ao calcular rota: {error.message}
            </Tag>}

            <div className="flex flex-row flex-nowrap justify-center items-center">
                <Tag variant="secondary">
                    <Icon name="MapMarked" />

                    {`Distância - ${formatDistance(route.distanceMeters)}`}
                </Tag>

                <hr className="w-[50px]" />

                <Tag variant="secondary">
                    <Icon name="Time" />

                    {`Duração - ${formatDuration(route.durationSeconds)}`}
                </Tag>
            </div>
        </div>}
    </div>
};

export default LeafletDeliveryTracker;
