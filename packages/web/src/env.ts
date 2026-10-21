import { 
    DEFAULT_GEOCODING_URL,
    type environmentType
} from "@Madeirense/shared";

// ***************************************************************************************************************

const environment = import.meta.env.MODE as environmentType;

/**
 * # Environment Helper
 * 
 * Contains accurately type data provided by the environment file, it also composes variables base on other values described in the files.
 * 
 * - Unless you're adding empty string or undefined values, _edit your default values in the primary environment files_.
 * - Add documentation via JSDocs to some of the configured environment variables.
 * - Create derived values based on environment values.
 */
const env = {
    // APP Keys
    UPLOAD_CARE_PUBLIC_KEY: import.meta.env.VITE_APP_UPLOAD_CARE_PUBLIC_KEY,
    VAPID_PUBLIC_KEY: import.meta.env.VITE_APP_VAPID_PUBLIC_KEY,

    // Maps (Leaflet)
    /**
     * Raster tile URL template (`{s}`, `{z}`, `{x}`, `{y}`). Defaults to the public
     * OpenStreetMap servers: free and keyless, fine for this app's volume, but under
     * OSM's fair-use policy. Point it at a self-hosted or paid provider if traffic grows.
     */
    MAP_TILE_URL: import.meta.env.VITE_APP_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    MAP_TILE_ATTRIBUTION: import.meta.env.VITE_APP_MAP_TILE_ATTRIBUTION || "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
    /**
     * Base URL of an OSRM-compatible routing server (used by the delivery tracker).
     * Defaults to the public OSRM demo server: no key, ~1 request/s, no SLA.
     * Self-host OSRM (e.g. on the VPS, Angola extract) for production reliability.
     */
    MAP_ROUTING_URL: import.meta.env.VITE_APP_MAP_ROUTING_URL || "https://router.project-osrm.org",
    /**
     * Base URL of a Photon-compatible geocoder (address search + reverse lookup).
     * Defaults to the public komoot instance: OpenStreetMap data, no key, fair use only.
     */
    GEOCODING_URL: import.meta.env.VITE_APP_GEOCODING_URL || DEFAULT_GEOCODING_URL,

    // APP Defaults
    LOG_ERROR: import.meta.env.VITE_APP_LOG_ERROR,

    // APP Features


    // API
    /**
     * Key generated at `<API>/api/management` (usage: Web app). Sent as
     * `x-api-key` on every request — see configurations/api/clients.ts.
     * Like every VITE_ variable it ends up in the public JS bundle: it
     * identifies/rate-limits/revokes the web client, it is not a secret.
     */
    API_KEY: import.meta.env.VITE_APP_API_KEY ?? "",
    API_URL: import.meta.env.VITE_APP_API_URL,
    API_VERSION: import.meta.env.VITE_APP_API_VERSION,

    // Server
    MODE: environment
};

export default env;