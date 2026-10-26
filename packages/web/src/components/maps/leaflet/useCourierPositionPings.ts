import {
    useEffect,
    useRef
} from "react";

import {
    type LatLngLiteral
} from "leaflet";

import {
    DEFAULT_APP_PREFERENCES,
    type appPreferencesType,
    type Madeirense$Types
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { toLatLng } from "./utilities";

import type {
    Courier_Positions
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

export type courierPositionPingType = {
    /** Present when the push payload carries it; otherwise resolve it from the order. */
    courierId: number | null;
    orderId: number;
    position: LatLngLiteral;
};

type pingPayloadType = Partial<Courier_Positions> & { order_id: number };

/**
 * Subscribes to `MXP$COURIER_POSITION$PING` push messages relayed by the service worker
 * (only while the user allows notifications). `onPing` may change between renders.
 */
export function useCourierPositionPings(onPing: (ping: courierPositionPingType) => void) {
    const { Storage } = MXP$App;

    // Latest-callback ref: callers can pass inline functions without re-subscribing every render.
    const onPingRef = useRef(onPing);

    useEffect(() => {
        onPingRef.current = onPing;
    });

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        async function handleMessage(event: MessageEvent) {
            const message = event.data as Partial<Madeirense$Types.pushNotification<pingPayloadType>> | null;

            if (message?.notificationId !== "MXP$COURIER_POSITION$PING" || !message.data) return;

            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                courier_id,
                latitude,
                longitude,
                order_id
            } = message.data;

            const position = toLatLng(latitude, longitude);

            if (!position) return;

            onPingRef.current({
                courierId: courier_id ?? null,
                orderId: order_id,
                position
            });
        }

        navigator.serviceWorker.addEventListener("message", handleMessage);

        return () => {
            navigator.serviceWorker.removeEventListener("message", handleMessage);
        };
    }, [Storage]);
}
