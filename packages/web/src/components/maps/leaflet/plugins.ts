/**
 * Leaflet plugins, loaded once for every map in the app. Import this (for its
 * side effects) in any module that creates a `MapContainer`.
 *
 * `leaflet-rotate` patches the *global* `L` rather than importing Leaflet, so
 * `./global` must be evaluated first — ES modules evaluate imports in source order.
 */
import "./global";

import "leaflet-rotate";
