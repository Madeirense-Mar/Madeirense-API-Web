/// <reference types="vite/client" />

interface ImportMetaEnv {
    // APP Keys
    VITE_APP_UPLOAD_CARE_PUBLIC_KEY: string,
    VITE_APP_VAPID_PUBLIC_KEY: string,

    // Maps (Leaflet) — optional, see env.ts for defaults
    VITE_APP_MAP_TILE_URL?: string,
    VITE_APP_MAP_TILE_ATTRIBUTION?: string,
    VITE_APP_MAP_ROUTING_URL?: string,
    VITE_APP_GEOCODING_URL?: string,

    // APP Defaults
    VITE_APP_LOG_ERROR: ("true" | "false"),

    // APP Features


    // API
    VITE_APP_API_KEY: string,
    VITE_APP_API_URL: string,
    VITE_APP_API_VERSION: `v${number}${("" | `.${number}` | `EXP_${number}`)}${("" | `.${number}`)}`,
}
