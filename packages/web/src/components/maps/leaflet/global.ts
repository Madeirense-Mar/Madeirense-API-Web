import L from "leaflet";

// Leaflet's UMD build already sets `window.L`; doing it explicitly keeps plugins
// that rely on the global (leaflet-rotate) working if the ES module build is ever used.
window.L = L;
