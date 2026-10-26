import L, {
    type LatLngLiteral
} from "leaflet";

import { MIN_REROUTE_DISTANCE_METERS } from "./constants";

// ***************************************************************************************************************

/** What Prisma hands us for coordinates: `Decimal`, string or number (or nothing). */
export type coordinateValueType = ({ toString(): string } | null | undefined);

/** Prisma `Decimal`/string/number coordinates → Leaflet point, or `null` when missing/invalid. */
export const toLatLng = (latitude: coordinateValueType, longitude: coordinateValueType): LatLngLiteral | null => {
    if (latitude == null || longitude == null) return null;

    const lat = parseFloat(latitude.toString());
    const lng = parseFloat(longitude.toString());

    return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null;
};

export const isLatLng = (point: LatLngLiteral | null): point is LatLngLiteral => point !== null;

/**
 * Returns `previous` itself when `next` is within {@link MIN_REROUTE_DISTANCE_METERS}, so React
 * state setters bail out — no re-render, no new route request for GPS jitter.
 */
export const keepUnlessMoved = (previous: LatLngLiteral | null | undefined, next: LatLngLiteral): LatLngLiteral => (
    (previous && L.latLng(previous).distanceTo(next) < MIN_REROUTE_DISTANCE_METERS)
        ? previous
        : next
);
