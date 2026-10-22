/**
 * Types for `leaflet-rotate` (the package ships none). Only the options and
 * methods this app uses are declared; see the plugin's README for the rest.
 */
import type * as Leaflet from "leaflet";

declare module "leaflet" {
    interface MapOptions {
        /** Enables rotation support. Must be set when the map is created. */
        rotate?: boolean;
        /** Initial rotation in degrees, clockwise. */
        bearing?: number;
        /** Two-finger rotation gesture on touch devices. */
        touchRotate?: boolean;
        /** Shift + mouse wheel rotates instead of zooming (desktop). */
        shiftKeyRotate?: boolean;
        /** The plugin's own tri-state control (we use `LeafletRotateControl` instead). */
        rotateControl?: boolean | {
            closeOnZeroBearing?: boolean;
            position?: ControlPosition;
        };
    }

    interface Map {
        /** Rotation in degrees, clockwise, normalised to [0, 360). */
        getBearing(): number;
        /** Rotates the map; fires `rotate`. */
        setBearing(theta: number): this;
    }
}

declare global {
    interface Window {
        /** leaflet-rotate patches the global `L` instead of importing Leaflet. */
        L: typeof Leaflet;
    }
}
