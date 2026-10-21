import { useMemo } from "react";

import L from "leaflet";

import {
    Marker,
    Popup
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import type { markerType } from '../../types';

// ***************************************************************************************************************

const OptimizedClusteredMarkers = ({ markers }: { markers: markerType[] }) => {
    const clusterOptions = useMemo(() => ({
        chunkDelay: 50,
        chunkInterval: 200,
        chunkedLoading: true,
        iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount();

            let c = ' marker-cluster-';

            if (count < 10) {
                c += 'small';
            } else if (count < 100) {
                c += 'medium';
            } else {
                c += 'large';
            }

            return new L.DivIcon({
                html: `<div>
                    <span>${count}</span>
                </div>`,
                className: 'marker-cluster' + c,
                iconSize: new L.Point(40, 40)
            });
        }
    }), []);

    const memoizedMarkers = useMemo(() =>
        markers.map(({ id, latitude, longitude, popup, popupBody }) => (
            <Marker key={id} position={[latitude, longitude]}>
                {(popup)
                    ? popup
                    : <Popup>{popupBody}</Popup>
                }
            </Marker>
        )),
        [markers]
    );

    return <MarkerClusterGroup {...clusterOptions}>
        {memoizedMarkers}
    </MarkerClusterGroup>
};

export default OptimizedClusteredMarkers;