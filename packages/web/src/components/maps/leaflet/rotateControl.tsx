import {
    useEffect,
    useState
} from "react";

import { createPortal } from "react-dom";

import L, {
    type ControlPosition
} from "leaflet";

import { useMap } from "react-leaflet";

import Icon from "components/icon";

import { MAP_ROTATION_STEP_DEGREES } from "./constants";

import styles from "./rotateControl.module.css";

// ***************************************************************************************************************

interface IPropTypes {
    position?: ControlPosition;
    /** Degrees per button press. */
    step?: number;
};

/**
 * Rotate left / reset to north / rotate right, rendered as a native Leaflet control.
 * Requires the map to be created with `MAP_ROTATION_OPTIONS` (leaflet-rotate).
 */
function LeafletRotateControl({
    position = "topleft",
    step = MAP_ROTATION_STEP_DEGREES
}: IPropTypes) {
    const map = useMap();

    const [bearing, setBearing] = useState<number>(() => map.getBearing());

    // Created once; Leaflet moves it into the control corner, React renders into it via a portal.
    const [container] = useState<HTMLDivElement>(() => {
        const element = L.DomUtil.create("div", `leaflet-bar ${styles.control}`);

        // Leaflet 1.9 flags the element instead of stopping `click`, so React's
        // onClick still fires while the map ignores the click (no pin moves, no drag).
        L.DomEvent.disableClickPropagation(element);
        L.DomEvent.disableScrollPropagation(element);

        return element;
    });

    useEffect(() => {
        const control = new L.Control({ position });

        control.onAdd = () => container;

        control.addTo(map);

        return () => {
            control.remove();
        };
    }, [map, position, container]);

    // Keeps the compass in sync with every rotation source (buttons, two-finger gesture, shift + wheel).
    useEffect(() => {
        const syncBearing = () => setBearing(map.getBearing());

        map.on("rotate", syncBearing);

        return () => {
            map.off("rotate", syncBearing);
        };
    }, [map]);

    const rotateBy = (degrees: number) => map.setBearing(map.getBearing() + degrees);

    const roundedBearing = Math.round(bearing) % 360;

    return createPortal(<>
        <button type="button" title="Rodar para a esquerda" aria-label="Rodar mapa para a esquerda" onClick={() => rotateBy(-step)}>
            <Icon name="RotateLeft" />
        </button>

        <button
            type="button"
            className={styles.compass}
            title={`Repor norte (${roundedBearing}°)`}
            aria-label="Repor orientação a norte"
            onClick={() => map.setBearing(0)}
        >
            <Icon name="Navigation" style={{ transform: `rotate(${bearing}deg)` }} />
        </button>

        <button type="button" title="Rodar para a direita" aria-label="Rodar mapa para a direita" onClick={() => rotateBy(step)}>
            <Icon name="RotateRight" />
        </button>
    </>, container);
};

export default LeafletRotateControl;
