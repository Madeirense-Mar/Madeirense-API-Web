/**
 * One point along a route's path. Always `latitude`/`longitude` — OSRM's
 * native `[longitude, latitude]` (GeoJSON) coordinate order is flipped to
 * this shape at the controller boundary (see api/src/controllers/routing.ts)
 * so nothing downstream (web, mobile) needs to know OSRM's convention
 * exists.
 */
export type routeCoordinateType = {
    latitude: number;
    longitude: number;
};

/**
 * Result of `POST /v1/routing/route` — a self-hosted OSRM instance proxied
 * through this API (never called directly by clients). See
 * infra/osrm/README.md for the full self-hosting writeup.
 */
export type routeResultType = {
    distanceMeters: number;
    durationSeconds: number;
    geometry: routeCoordinateType[];
};
