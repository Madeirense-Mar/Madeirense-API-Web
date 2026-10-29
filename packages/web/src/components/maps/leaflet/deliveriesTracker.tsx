import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type CSSProperties
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
    TileLayer,
    Tooltip,
    useMapEvents
} from "react-leaflet";

import {
    Coordinates,
    Madeirense$Enumerators,
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
    ORDER_COLORS
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

import styles from "./deliveriesTracker.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type { variantType } from "components/types";

import "./plugins";

import "leaflet/dist/leaflet.css";
import AnchorTag from "components/tags/anchor";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    onMapReady?: (map: LeafletMap) => void;
    /** Fired when the selection changes (`null` = overview). */
    onOrderSelect?: (order: restaurantOrderType | null) => void;
    /** Every order to consider; only those in `statuses` are drawn. */
    orders: restaurantOrderType[];
    /** Controls the selection from outside; omit to let the tracker manage it. */
    selectedOrderId?: number | null;
    /** Defaults to orders currently on their way (`assigned`). */
    statuses?: ReadonlyArray<$Enums.Orders_status>;
    variant?: variantType;
};

type trackedOrderType = {
    color: string,
    courierId: number | null,
    destination: LatLngLiteral | null,
    order: restaurantOrderType,
    restaurant: LatLngLiteral | null,
};

type courierGroupType = {
    courier: NonNullable<restaurantOrderType["Users_Orders_courier_idToUsers"]>,
    orders: trackedOrderType[],
};

type routeStateType = {
    orderId: number,
    route: routeType | null,
    error: Error | null,
};

const DEFAULT_STATUSES: ReadonlyArray<$Enums.Orders_status> = ["assigned"];

const LUANDA: LatLngExpression = [Coordinates.MiddleOfLuanda.LAT, Coordinates.MiddleOfLuanda.LNG];

const colorOf = (orderId: number): string => ORDER_COLORS[orderId % ORDER_COLORS.length] ?? ORDER_COLORS[0];

/** Exposes the order's colour to CSS (list entries, popup chips). */
const orderColorStyle = (color: string): CSSProperties => ({ "--order-color": color } as CSSProperties);

/** Drop-off marker: a colour-coded `#order_id` badge, matching the order's line and list entry. */
const createOrderBadgeIcon = (orderId: number, color: string, selected: boolean): L.DivIcon => L.divIcon({
    className: resolveClassNames(styles.badge, selected ? styles.badgeSelected : undefined),
    html: `<span style="--order-color: ${color}">#${orderId}</span>`,
    iconSize: [64, 24],
    iconAnchor: [32, 12],
    popupAnchor: [0, -12],
    tooltipAnchor: [0, -12]
});

/** Clicking empty map returns to the overview. Must live inside `<MapContainer>`. */
function MapBackgroundClick({ onClick }: { onClick: () => void }) {
    useMapEvents({ click: onClick });

    return null;
}

/**
 * Big-map overview of every ongoing delivery: restaurants, drop-offs and couriers, with a
 * straight courier → drop-off line per order. Selecting an order fetches its real driving
 * route + ETA (one request at a time, to stay within the public routing server's limits).
 */
const LeafletDeliveriesTracker = ({
    className,
    onMapReady,
    onOrderSelect,
    orders,
    selectedOrderId,
    statuses = DEFAULT_STATUSES,
    variant = "primary",
    ...props
}: IPropTypes) => {
    const [map, setMap] = useState<LeafletMap | null>(null);
    const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);
    /** Positions received by push since mount, by courier; they override the ones loaded with the orders. */
    const [livePositions, setLivePositions] = useState<Readonly<Record<number, LatLngLiteral>>>({});
    const [routeState, setRouteState] = useState<routeStateType | null>(null);

    const selectedId = (selectedOrderId !== undefined) ? selectedOrderId : internalSelectedId;

    /** Order ids last framed by the overview fit; reset to force a re-frame. */
    const lastFramedKey = useRef<string | null>(null);

    const tracked = useMemo<trackedOrderType[]>(() => orders
        .filter(({ status }) => status != null && statuses.includes(status))
        .map((order) => ({
            color: colorOf(order.order_id),
            courierId: order.courier_id ?? null,
            destination: toLatLng(order.Delivery_Locations?.latitude, order.Delivery_Locations?.longitude),
            order,
            restaurant: toLatLng(order.Restaurants.Delivery_Locations?.latitude, order.Restaurants.Delivery_Locations?.longitude)
        })),
        [orders, statuses]
    );

    const trackedKey = tracked.map(({ order }) => order.order_id).join(",");

    const trackedById = useMemo(() => new Map(tracked.map(t => [t.order.order_id, t])), [tracked]);

    /** One entry per courier, even when they carry several orders. */
    const couriers = useMemo(() => {
        const groups = new Map<number, courierGroupType>();

        for (const entry of tracked) {
            const courier = entry.order.Users_Orders_courier_idToUsers;

            if (entry.courierId === null || !courier) continue;

            const group = groups.get(entry.courierId);

            if (group) group.orders.push(entry);
            else groups.set(entry.courierId, { courier, orders: [entry] });
        }

        return groups;
    }, [tracked]);

    /** Last position loaded with the orders (most recent `Courier_Positions` row). */
    const loadedPositions = useMemo(() => {
        const positions = new Map<number, LatLngLiteral>();

        for (const [courierId, { courier }] of couriers) {
            const [lastPosition] = courier.Courier_Positions ?? [];

            const position = toLatLng(lastPosition?.latitude, lastPosition?.longitude);

            if (position) positions.set(courierId, position);
        }

        return positions;
    }, [couriers]);

    const positionOf = (courierId: number | null): LatLngLiteral | null => (courierId === null)
        ? null
        : (livePositions[courierId] ?? loadedPositions.get(courierId) ?? null);

    /** Distinct restaurants with how many tracked orders each has. */
    const restaurants = useMemo(() => {
        const entries = new Map<number, { name: string, position: LatLngLiteral, count: number }>();

        for (const { order, restaurant } of tracked) {
            if (!restaurant) continue;

            const existing = entries.get(order.restaurant_id);

            if (existing) existing.count += 1;
            else entries.set(order.restaurant_id, { name: order.Restaurants.name ?? "Restaurante", position: restaurant, count: 1 });
        }

        return entries;
    }, [tracked]);

    const badgeIcons = useMemo(
        () => new Map(tracked.map(({ order, color }) => [order.order_id, createOrderBadgeIcon(order.order_id, color, order.order_id === selectedId)])),
        [tracked, selectedId]
    );

    const selected = (selectedId !== null) ? (trackedById.get(selectedId) ?? null) : null;
    const selectedCourierPosition = positionOf(selected?.courierId ?? null);
    const selectedDestination = selected?.destination ?? null;
    const selectedRoute = (routeState && routeState.orderId === selectedId) ? routeState : null;

    function selectOrder(orderId: number | null) {
        setInternalSelectedId(orderId);

        onOrderSelect?.((orderId !== null) ? (trackedById.get(orderId)?.order ?? null) : null);
    };

    /** Clears the selection and frames every order again (clicking empty map only clears). */
    function showAll() {
        lastFramedKey.current = null;

        selectOrder(null);
    };

    useEffect(() => {
        if (map) onMapReady?.(map);
    }, [map, onMapReady]);

    // Live positions, resolved to a courier even when the push payload only names the order.
    useCourierPositionPings(({ courierId, orderId, position }) => {
        const resolvedCourierId = courierId ?? trackedById.get(orderId)?.courierId ?? null;

        if (resolvedCourierId === null || !couriers.has(resolvedCourierId)) return;

        setLivePositions((previous) => {
            const kept = keepUnlessMoved(previous[resolvedCourierId], position);

            return (kept === previous[resolvedCourierId])
                ? previous
                : { ...previous, [resolvedCourierId]: kept };
        });
    });

    // Real route for the selected order only; re-requested when its courier moves meaningfully.
    useEffect(() => {
        if (selectedId === null || !selectedCourierPosition || !selectedDestination) return;

        const controller = new AbortController();

        fetchDrivingRoute(selectedCourierPosition, selectedDestination, controller.signal)
            .then((route) => setRouteState({ orderId: selectedId, route, error: null }))
            .catch((reason: unknown) => {
                if (controller.signal.aborted) return;

                console.error("Error fetching route:", reason);

                setRouteState({ orderId: selectedId, route: null, error: reason instanceof Error ? reason : new Error(String(reason)) });
            });

        return () => controller.abort();
    }, [selectedId, selectedCourierPosition, selectedDestination]);

    // Frame everything when the set of orders changes — not on every ping, so the map doesn't jump while browsing.
    useEffect(() => {
        if (!map || selectedId !== null || lastFramedKey.current === trackedKey) return;

        lastFramedKey.current = trackedKey;

        const points: LatLngLiteral[] = [
            ...tracked.flatMap(({ destination, restaurant }) => [destination, restaurant]),
            ...[...couriers.keys()].map(id => livePositions[id] ?? loadedPositions.get(id) ?? null)
        ].filter(isLatLng);

        if (points.length > 0) map.fitBounds(L.latLngBounds(points), FIT_BOUNDS_OPTIONS);
    }, [map, selectedId, trackedKey, tracked, couriers, livePositions, loadedPositions]);

    // Zoom to the selected order once per selection (its courier, restaurant and drop-off).
    const lastFramedSelection = useRef<number | null>(null);

    useEffect(() => {
        if (!map) return;

        if (selectedId === null) {
            lastFramedSelection.current = null;

            return;
        }

        if (lastFramedSelection.current === selectedId || !selected) return;

        lastFramedSelection.current = selectedId;

        const points = [selected.restaurant, selected.destination, selectedCourierPosition].filter(isLatLng);

        if (points.length > 0) map.flyToBounds(L.latLngBounds(points), { ...FIT_BOUNDS_OPTIONS, duration: 0.6 });
    }, [map, selectedId, selected, selectedCourierPosition]);

    return <div data-component="deliveries-tracker" className={resolveClassNames(styles[variant], className)} {...props}>
        <MapContainer
            {...MAP_ROTATION_OPTIONS}
            ref={setMap}
            center={LUANDA}
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

            <MapBackgroundClick onClick={() => selectOrder(null)} />

            {/* Straight courier → drop-off lines; the selected one is replaced by its real route once loaded. */}
            {tracked.map(({ order, color, courierId, destination }) => {
                const courierPosition = positionOf(courierId);

                if (!courierPosition || !destination) return null;

                const isSelected = order.order_id === selectedId;

                if (isSelected && selectedRoute?.route) return null;

                return <Polyline
                    key={`line-${order.order_id}`}
                    positions={[courierPosition, destination]}
                    pathOptions={{
                        // Don't let the click reach the map, whose click handler clears the selection.
                        bubblingMouseEvents: false,
                        color,
                        dashArray: "6 8",
                        opacity: (selectedId === null || isSelected) ? 0.75 : 0.2,
                        weight: isSelected ? 4 : 3
                    }}
                    eventHandlers={{ click: () => selectOrder(order.order_id) }}
                />
            })}

            {(selected && selectedRoute?.route) && <Polyline
                positions={selectedRoute.route.path}
                pathOptions={{ color: selected.color, opacity: 0.9, weight: 5 }}
            />}

            {[...restaurants].map(([restaurantId, { name, position, count }]) => <Marker
                key={`restaurant-${restaurantId}`}
                icon={MAP_MARKERS.RESTAURANT}
                position={position}
                title={name}
            >
                <Popup>
                    <strong>{name}</strong><br />

                    {count} {count === 1 ? "entrega em curso" : "entregas em curso"}
                </Popup>
            </Marker>)}

            {tracked.map(({ order, destination }) => {
                const icon = badgeIcons.get(order.order_id);

                if (!destination || !icon) return null;

                return <Marker
                    key={`destination-${order.order_id}`}
                    icon={icon}
                    position={destination}
                    zIndexOffset={(order.order_id === selectedId) ? 2000 : 0}
                    eventHandlers={{ click: () => selectOrder(order.order_id) }}
                >
                    <Tooltip direction="top">
                        {order.Users_Orders_user_idToUsers?.name ?? "Cliente"}

                        {order.Delivery_Locations?.address && <><br /><small>{order.Delivery_Locations.address}</small></>}
                    </Tooltip>
                </Marker>
            })}

            {[...couriers].map(([courierId, { courier, orders: courierOrders }]) => {
                const position = positionOf(courierId);

                if (!position) return null;

                return <Marker
                    key={`courier-${courierId}`}
                    icon={MAP_MARKERS.COURIER}
                    position={position}
                    title={`Estafeta: ${courier.name ?? ""}`}
                    zIndexOffset={1000}
                >
                    <Popup>
                        <div className={styles.courierPopup}>
                            <Tag>
                                <Icon name="Delivery" />

                                {courier.name}
                            </Tag>

                            {courier.phone && <Tag>
                                <Icon name="Phone" />

                                {courier.phone}
                            </Tag>}

                            <div className="flex flex-wrap gap-1">
                                {courierOrders.map(({ order, color }) => <button
                                    key={order.order_id}
                                    type="button"
                                    className={styles.orderChip}
                                    style={orderColorStyle(color)}
                                    onClick={() => selectOrder(order.order_id)}
                                >
                                    #{order.order_id}
                                </button>)}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            })}
        </MapContainer>

        <aside className={styles["side-menu"]}>
            <header>
                <h3>
                    <Icon name="Delivery" />

                    <Tag>
                        {tracked.length}
                    </Tag>
                    
                    {tracked.length === 1 ? "entrega em curso" : "entregas em curso"}
                </h3>

                {(selectedId !== null) && <button type="button" onClick={showAll}>
                    Ver todas
                </button>}
            </header>

            {(tracked.length === 0)
                ? <p className="italic opacity-70">Sem entregas em curso de momento.</p>
                : <ul>
                    {tracked.map(({ order, color, courierId, destination }) => {
                        const isSelected = order.order_id === selectedId;

                        const missing = [
                            !destination && "sem morada no mapa",
                            !positionOf(courierId) && "sem posição do estafeta"
                        ].filter(Boolean).join(" · ");

                        return <li key={order.order_id}>
                            <button
                                type="button"
                                aria-pressed={isSelected}
                                style={orderColorStyle(color)}
                                onClick={() => selectOrder(isSelected ? null : order.order_id)}
                            >
                                <AnchorTag to={`${Madeirense$Enumerators.Pages.BackOffice.Requests}/${order.order_id}`} variant="secondary">
                                    #{order.order_id}
                                </AnchorTag>

                                <span>{order.Users_Orders_courier_idToUsers?.name ?? "Sem estafeta"} · {order.Restaurants.name}</span>

                                {missing && <small className="italic">{missing}</small>}

                                {(isSelected && selectedRoute?.route) && <small>
                                    {formatDistance(selectedRoute.route.distanceMeters)} · {formatDuration(selectedRoute.route.durationSeconds)}
                                </small>}

                                {(isSelected && selectedRoute?.error) && <small data-state="error">
                                    Erro ao calcular rota: {selectedRoute.error.message}
                                </small>}
                            </button>
                        </li>
                    })}
                </ul>
            }
        </aside>
    </div>
};

export default LeafletDeliveriesTracker;
