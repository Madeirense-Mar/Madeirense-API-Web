import L, {
    type PathOptions,
    type PointTuple
} from "leaflet";

// ***************************************************************************************************************

const MARKER_SVGS = {
    COURIER: `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#2196F3" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M12 18l4-6 4 6H12z" fill="#FFFFFF"/>
    </svg>
    `,
    PIN: `
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="15" r="12" fill="#FF6B6B" stroke="#fff" stroke-width="3"/>
        <circle cx="15" cy="15" r="4" fill="#fff"/>
    </svg>
    `,
    RESTAURANT: `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#FF6B35" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M10 12h12v8H10z" fill="#FFFFFF"/>
        <path d="M12 10v4M16 10v4M20 10v4" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
    `,
    TARGET_ADDRESS: `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#4CAF50" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M16 8v16M8 16h16" stroke="#FFFFFF" stroke-width="2"/>
    </svg>
    `,
} as const;

/** Builds a circular SVG marker icon anchored at its centre (the shapes are circles, not pins). */
const createSvgIcon = (svg: string, size: number): L.Icon => {
    const half = size / 2;

    const anchor: PointTuple = [half, half];

    return L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        iconSize: [size, size],
        iconAnchor: anchor,
        popupAnchor: [0, -half],
        tooltipAnchor: [half, 0]
    });
};

export const MAP_MARKERS = {
    COURIER: createSvgIcon(MARKER_SVGS.COURIER, 32),
    PIN: createSvgIcon(MARKER_SVGS.PIN, 30),
    RESTAURANT: createSvgIcon(MARKER_SVGS.RESTAURANT, 32),
    TARGET_ADDRESS: createSvgIcon(MARKER_SVGS.TARGET_ADDRESS, 32),
} as const;

/** OSM raster tiles stop at 19. */
export const MAP_MAX_ZOOM = 19;

export const MAP_DEFAULT_ZOOM = 13;

export const ROUTE_PATH_OPTIONS: PathOptions = {
    color: "#2196F3",
    opacity: 0.8,
    weight: 4
};

/** Courier pings closer than this to the last known position don't trigger a new route request. */
export const MIN_REROUTE_DISTANCE_METERS = 20;
