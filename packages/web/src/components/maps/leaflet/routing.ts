import {
    type LatLngLiteral,
    type LatLngTuple
} from "leaflet";

import env from "env";

// ***************************************************************************************************************

export type routeType = {
    distanceMeters: number;
    durationSeconds: number;
    path: LatLngTuple[];
};

/** Subset of the OSRM `/route/v1` response that is actually used. */
type osrmRouteResponseType = {
    code: string;
    message?: string;
    routes?: {
        distance: number;
        duration: number;
        geometry: {
            coordinates: [number, number][]; // GeoJSON order: [lng, lat]
        };
    }[];
};

/**
 * Fetches a driving route between two points from an OSRM-compatible server
 * (`env.MAP_ROUTING_URL`). Replaces Google's Routes API — no key, no billing.
 *
 * @returns the route, or `null` when the server found none.
 */
export async function fetchDrivingRoute(
    origin: LatLngLiteral,
    destination: LatLngLiteral,
    signal?: AbortSignal
): Promise<routeType | null> {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

    const url = new URL(`route/v1/driving/${coordinates}`, `${env.MAP_ROUTING_URL.replace(/\/+$/, "")}/`);

    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");

    const response = await fetch(url, { signal });

    if (!response.ok) throw new Error(`Routing error: ${response.status}`);

    const data = await response.json() as osrmRouteResponseType;

    if (data.code !== "Ok") {
        if (data.code === "NoRoute") return null;

        throw new Error(`Routing error: ${data.message ?? data.code}`);
    }

    const route = data.routes?.[0];

    if (!route) return null;

    return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        path: route.geometry.coordinates.map(([lng, lat]): LatLngTuple => [lat, lng])
    };
}

export const formatDistance = (meters: number): string => (meters < 1000)
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;

export const formatDuration = (seconds: number): string => {
    const minutes = Math.max(1, Math.round(seconds / 60));

    if (minutes < 60) return `${minutes} min`;

    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
};
