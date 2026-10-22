import {
    memo,
    useCallback,
    useMemo,
    useState,
    type ComponentProps,
    type CSSProperties
} from "react";

import {
    type LeafletEventHandlerFnMap,
    type LeafletMouseEvent,
    type Map as LeafletMap,
    type Marker as LeafletMarker
} from "leaflet";

import {
    MapContainer,
    Marker,
    TileLayer,
    useMapEvents
} from "react-leaflet";

import {
    Coordinates,
    resolveClassNames,
    type distanceVectorType
} from "@Madeirense/shared";

import env from "env";

import Button from "components/buttons";
import Icon from "components/icon";

import {
    MAP_DEFAULT_ZOOM,
    MAP_MARKERS,
    MAP_MAX_ZOOM,
    MAP_ROTATION_OPTIONS
} from "./constants";

import LeafletRotateControl from "./rotateControl";

import "./plugins";

import styles from "./locationPicker.module.css";

import "leaflet/dist/leaflet.css";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    containerStyle?: CSSProperties;
    DEBUG?: boolean;
    defaultCenter?: distanceVectorType;
    initialLocation?: distanceVectorType;
    onLocationSelect?: (location: distanceVectorType) => void;
    zoom?: number;
};

const _defaultCenter: distanceVectorType = {
    latitude: Coordinates.MiddleOfLuanda.LAT,
    longitude: Coordinates.MiddleOfLuanda.LNG
};

/** Street level, one step below the tile server's limit so labels stay readable. */
const CURRENT_LOCATION_ZOOM = MAP_MAX_ZOOM - 1;

/** Forwards map clicks; must live inside `<MapContainer>` to reach the map instance. */
function MapClickHandler({ onClick }: { onClick: (location: distanceVectorType) => void }) {
    useMapEvents({
        click: ({ latlng }: LeafletMouseEvent) => onClick({
            latitude: latlng.lat,
            longitude: latlng.lng
        })
    });

    return null;
}

function LeafletLocationPicker(_props: IPropTypes) {
    const {
        className,
        containerStyle,
        DEBUG = false,
        defaultCenter = _defaultCenter,
        initialLocation,
        onLocationSelect,
        zoom = MAP_DEFAULT_ZOOM,
        ...props
    } = _props;

    const [map, setMap] = useState<LeafletMap | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<distanceVectorType>(initialLocation ?? defaultCenter);

    const selectLocation = useCallback((location: distanceVectorType) => {
        setSelectedLocation(location);

        onLocationSelect?.(location);
    }, [onLocationSelect]);

    const markerEventHandlers = useMemo<LeafletEventHandlerFnMap>(() => ({
        dragend: ({ target }) => {
            const { lat, lng } = (target as LeafletMarker).getLatLng();

            selectLocation({
                latitude: lat,
                longitude: lng
            });
        }
    }), [selectLocation]);

    const centerOnCurrentLocation = useCallback(() => {
        if (!("geolocation" in navigator) || !map) return;

        navigator.geolocation.getCurrentPosition(
            ({ coords }: GeolocationPosition) => {
                const currentLocation: distanceVectorType = {
                    latitude: coords.latitude,
                    longitude: coords.longitude
                };

                selectLocation(currentLocation);

                map.flyTo([currentLocation.latitude, currentLocation.longitude], CURRENT_LOCATION_ZOOM);
            },
            (error: GeolocationPositionError) => {
                console.error("Error getting current location:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000
            }
        );
    }, [map, selectLocation]);

    return <div className={resolveClassNames(styles.picker, className)} {...props}>
        <div data-section="map">
            <div className={styles.controls}>
                <Button shape="circle" type="button" onClick={centerOnCurrentLocation} disabled={!map}>
                    <Icon name="MyLocation" className="text-lg" />
                </Button>
            </div>

            <MapContainer
                {...MAP_ROTATION_OPTIONS}
                ref={setMap}
                center={[selectedLocation.latitude, selectedLocation.longitude]}
                className={styles.map}
                maxZoom={MAP_MAX_ZOOM}
                style={containerStyle}
                zoom={zoom}
            >
                <TileLayer
                    attribution={env.MAP_TILE_ATTRIBUTION}
                    maxZoom={MAP_MAX_ZOOM}
                    url={env.MAP_TILE_URL}
                />

                <LeafletRotateControl />

                <MapClickHandler onClick={selectLocation} />

                <Marker
                    draggable
                    eventHandlers={markerEventHandlers}
                    icon={MAP_MARKERS.PIN}
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                />
            </MapContainer>
        </div>

        <div className="mt-2 text-sm text-gray-500 flex flex-row justify-between items-center">
            {DEBUG && <div className="text-sm flex flex-row justify-normal items-center gap-3">
                <span>Latitude: {selectedLocation.latitude.toFixed(6)}</span>
                <span>Longitude: {selectedLocation.longitude.toFixed(6)}</span>
            </div>}

            <span className="italic ml-auto">
                💡 Selecciona qualquer lugar no mapa para marcares o local de entrega
            </span>
        </div>
    </div>
}

export default memo(LeafletLocationPicker);
