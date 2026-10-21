import { useMemo } from "react";

import L from "leaflet";

import { 
    MapContainer, 
    type MapContainerProps
} from "react-leaflet";

import "./container.css";

// ***************************************************************************************************************

const OptimizedMapContainer = (_props: MapContainerProps) => {
    const { 
        center, 
        children, 
        zoom, 
        ...props
    } = _props;

    const mapOptions = useMemo(() => ({
        center: center || [51.505, -0.09],
        zoom: zoom || 13,
        // Performance optimizations
        preferCanvas: true, // Use canvas renderer for better performance with many markers
        zoomSnap: 1,
        zoomDelta: 1,
        wheelDebounceTime: 60,
        wheelPxPerZoomLevel: 60,
        // Hardware acceleration
        renderer: L.canvas(),
        // Optimize for mobile
        tap: true,
        touchZoom: true,
        bounceAtZoomLimits: false,
        ...props
    }), [center, zoom, props]);

    return <MapContainer {...mapOptions}>
        {children}
    </MapContainer>
};

export default OptimizedMapContainer;