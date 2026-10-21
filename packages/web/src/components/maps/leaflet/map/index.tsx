import {
    useMemo,
    type ComponentProps
} from "react";

import {
    type LatLngExpression
} from "leaflet";

import {
    GeoJSON,
    type MapContainerProps
} from "react-leaflet";

import {
    useLeafletMapData
} from "hooks/useLeafletMapData";

import { Coordinates } from "@Madeirense/shared";

import useCurrentLocation from "hooks/useCurrentLocation";

import OptimizedClusteredMarkers from "./optimized/clusterMarkers";
import OptimizedMapContainer from "./optimized/container";
import OptimizedTileLayer from "./optimized/tileLayer";

import type { markerType } from "../types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    tileUrl?: string,
    markers?: markerType[],
    geoJsonUrl?: string,
    containerProps?: MapContainerProps
};

const OptimizedLeafletMap = ({
    containerProps: contP = {
        center: [
            Coordinates.MiddleOfLuanda.LAT,
            Coordinates.MiddleOfLuanda.LNG
        ] as LatLngExpression,
        zoom: 13,
    },
    geoJsonUrl,
    markers = [],
    tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ...props
}: IPropTypes) => {
    const location = useCurrentLocation();

    // Load GeoJSON data asynchronously with caching
    const {
        data: geoJsonData,
        loading: geoJsonLoading
    } = useLeafletMapData(geoJsonUrl, `geojson-${geoJsonUrl}`);

    const {
        center,
        ...containerProps
    } = contP ?? {};

    const defaultLocation = useMemo(
        () => (!location)
            ? center
            : [location?.latitude, location?.longitude] as LatLngExpression
        , [location, center]
    );

    // Memoize the entire map to prevent unnecessary re-renders
    return useMemo(() => {
        return <div {...props}>
            <OptimizedMapContainer center={defaultLocation} {...containerProps}>
                <OptimizedTileLayer url={tileUrl} />

                {markers.length > 0 && <OptimizedClusteredMarkers {...{ markers }} />}

                {geoJsonData && !geoJsonLoading && (
                    <GeoJSON
                        data={geoJsonData}
                        // Optimize GeoJSON rendering
                        onEachFeature={(feature, layer) => {
                            if (feature.properties?.popup) {
                                layer.bindPopup(feature.properties.popup);
                            }
                        }}
                    />
                )}
            </OptimizedMapContainer>
        </div>
    }, [
        containerProps,
        defaultLocation,
        tileUrl,
        markers,
        geoJsonData,
        geoJsonLoading,
        props,
    ]);
};

export default OptimizedLeafletMap;