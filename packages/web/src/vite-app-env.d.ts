/// <reference types="vite/client" />

interface ImportMetaEnv {
    // APP Keys
    VITE_APP_GOOGLE_API_KEY: string,
    VITE_APP_GOOGLE_MAP_ID: string,
    VITE_APP_UPLOAD_CARE_PUBLIC_KEY: string,
    VITE_APP_VAPID_PUBLIC_KEY: string,

    // APP Defaults
    VITE_APP_LOG_ERROR: ("true" | "false"),

    // APP Features


    // API
    VITE_APP_API_KEY: string,
    VITE_APP_API_URL: string,
    VITE_APP_API_VERSION: `v${number}${("" | `.${number}` | `EXP_${number}`)}${("" | `.${number}`)}`,
}
