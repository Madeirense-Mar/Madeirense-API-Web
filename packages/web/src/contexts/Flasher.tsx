//#region Imports -----------------------------------------
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type JSX,
    type MouseEvent
} from "react";

import Button from "components/buttons";
import Icon from "components/icon";

import RESERVED_EVENT from "components/flashers/event/reserved";
import GOODBYE from "components/flashers/goodbye";
import AWAITING_PAYMENT_CONFIRMATION from "components/flashers/order/awaitingPaymentConfirmation";
import DELIVERED_ORDER from "components/flashers/order/delivered";
import PLACED_ORDER from "components/flashers/order/placed";
import PUSH_NOTIFICATION_REQUEST from "components/flashers/pushNotification/request";

import styles from "./Flasher.module.css";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
type orderEventType = (
    | "DELIVERED"
    | "PLACED"
);

type requestEventType = (
    | "PUSH_NOTIFICATION"
);

type restaurantEventType = (
    | "RESERVED"
);

type flasherEventType = (
    | "AWAITING_PAYMENT_CONFIRMATION"
    | "EMPTY"
    | "LOADING"
    | "GOODBYE"
    | `${requestEventType}_REQUEST`
    | `${orderEventType}_ORDER`
    | `${restaurantEventType}_EVENT`
);

type FlasherContextType = {
    eject: (callback?: Function) => void,
    flash: (t: flasherEventType, onClose?: (event: Event) => void) => void
};
//#endregion

//#region Defaults ----------------------------------------
const FLASHERS: Record<flasherEventType, (JSX.Element | null)> = {
    "AWAITING_PAYMENT_CONFIRMATION": <AWAITING_PAYMENT_CONFIRMATION />,
    "DELIVERED_ORDER": <DELIVERED_ORDER />,
    "EMPTY": null,
    "GOODBYE": <GOODBYE />,
    "LOADING": null,
    "PLACED_ORDER": <PLACED_ORDER />,
    "PUSH_NOTIFICATION_REQUEST": <PUSH_NOTIFICATION_REQUEST />,
    "RESERVED_EVENT": <RESERVED_EVENT />
};
//#endregion

//#region Context declarations ----------------------------
const FlasherContext = createContext<FlasherContextType>({
    eject: (callback?: Function) => { },
    flash: (t: flasherEventType, onClose?: (event: Event) => void) => { }
});
//#endregion

const FlasherProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const $dialogRef = useRef<HTMLDialogElement | null>(null);

    const [flasher, setFlasher] = useState<flasherEventType>("EMPTY");
    const [closeEvent, setCloseEvent] = useState<((event: Event) => void) | undefined>(undefined);
    //#endregion

    //#region Variable declarations -----------------------
    const delayMS = 2000;

    const loaderState = ([
        "EMPTY",
        "LOADING",
        "PLACED_ORDER",
        "RESERVED_EVENT"
    ] as flasherEventType[]).includes(flasher) ? "on" : "off";

    const assertions = {
        "allowManuelEjection": !([
            "GOODBYE",
            "LOADING",
            "PUSH_NOTIFICATION_REQUEST"
        ] as flasherEventType[]).includes(flasher)
    };
    //#endregion

    //#region Functions -----------------------------------
    function handleEjection(e: MouseEvent<HTMLButtonElement>) {
        eject();
    };

    const eject = (callback?: Function) => {
        callback?.();

        setTimeout(() => {
            setFlasher("EMPTY");

            $dialogRef.current?.close();
        }, delayMS);
    };

    const flash = useCallback((_flasher: flasherEventType, onClose?: (event: Event) => void) => {
        if (!$dialogRef.current)
            return;

        $dialogRef.current.showModal();

        setCloseEvent(onClose);
        setFlasher("LOADING");

        setTimeout(() => {
            setFlasher(_flasher);
        }, delayMS);
    }, []);
    //#endregion

    useEffect(() => {
        if (!$dialogRef.current || !closeEvent)
            return;

        $dialogRef.current.addEventListener("close", closeEvent);

        return () => {
            $dialogRef.current?.removeEventListener("close", closeEvent);
        }
    }, [closeEvent]);

    //#region DOM -----------------------------------------
    return <FlasherContext.Provider value={{ eject, flash }}>
        <dialog ref={$dialogRef} className={styles.flasher} data-event={flasher}>
            <div className={styles.loader} data-state={loaderState}></div>

            {assertions.allowManuelEjection && <Button id="eject" onClick={handleEjection} shape="circle" className="opacity-15 hover:opacity-100">
                <Icon name="Close" />
            </Button>}

            {FLASHERS[flasher]}
        </dialog>

        {children}
    </FlasherContext.Provider>
    //#endregion
};

//#region Hooks -------------------------------------------
const useFlasher = () => {
    let context = useContext(FlasherContext);

    if (!context) throw new Error(`"useFlasher" was used outside of its context.`);

    return context;
};
//#endregion

export {
    FlasherProvider,
    useFlasher
};