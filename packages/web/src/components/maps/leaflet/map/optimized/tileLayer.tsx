import { useMemo } from "react";

import { 
    TileLayer, 
    type TileLayerProps
} from "react-leaflet";

// ***************************************************************************************************************

const OptimizedTileLayer = (props: TileLayerProps) => {
    // Memoize tile layer options to prevent unnecessary re-renders
    const tileLayerOptions = useMemo(() => ({
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors',
        // Enable tile caching
        crossOrigin: true,
        // Optimize tile loading
        detectRetina: true,
        // Keep tiles in memory longer
        keepBuffer: 4, // Default is 2
        // Update when zooming
        updateWhenZooming: false,
        // Update when idle only
        updateWhenIdle: true,
        // Reduce tile size for better performance
        tileSize: 256,
        zoomOffset: 0,
        ...props
    }), [props]);

    return <TileLayer {...tileLayerOptions} />
};

export default OptimizedTileLayer;