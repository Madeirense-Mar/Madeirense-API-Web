//#region Imports -----------------------------------------
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type MouseEvent
} from "react";

import Button from "components/buttons";
import Icon from "components/icon";

import F_RESERVED_EVENT from "components/flashers/event/reserved";
import F_GOODBYE from "components/flashers/goodbye";
import F_AWAITING_PAYMENT_CONFIRMATION_FLASHER from "components/flashers/order/awaitingPaymentConfirmation";
import F_DELIVERED_ORDER from "components/flashers/order/delivered";
import F_PLACED_ORDER from "components/flashers/order/placed";
import F_PUSH_NOTIFICATION_REQUEST from "components/flashers/pushNotification/request";

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
    flash: (t: flasherEventType) => void
};
//#endregion

//#region Context declarations ----------------------------
const FlasherContext = createContext<FlasherContextType>({
    eject: (callback?: Function) => { },
    flash: (t: flasherEventType) => { }
});
//#endregion

const FlasherProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const $dialogRef = useRef<HTMLDialogElement | null>(null);

    const [flasher, setFlasher] = useState<flasherEventType>("GOODBYE");
    //#endregion

    //#region Variable declarations -----------------------
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
    function handleEjection (e: MouseEvent<HTMLButtonElement>) {
        eject();
    };

    const eject = (callback?: Function) => {
        callback?.();

        setTimeout(() => {
            setFlasher("EMPTY");

            $dialogRef.current?.close();
        }, 2000);
    };

    const flash = useCallback((t: flasherEventType) => {
        $dialogRef.current?.showModal();

        setFlasher("LOADING");

        setTimeout(() => {
            setFlasher(t);
        }, 2000);
    }, []);
    //#endregion

    useEffect(() => {
        if (!$dialogRef.current)
            return;

        $dialogRef.current.showModal();
    }, []);

    //#region DOM -----------------------------------------
    return <FlasherContext.Provider value={{ eject, flash }}>
        <dialog ref={$dialogRef} className={styles.flasher} data-event={flasher}>
            <div className={styles.loader} data-state={loaderState}></div>

            {assertions.allowManuelEjection && <Button id="eject" onClick={handleEjection} shape="circle" className="opacity-15 hover:opacity-100">
                <Icon name="Close" />
            </Button>}

            {flasher === "AWAITING_PAYMENT_CONFIRMATION" && <F_AWAITING_PAYMENT_CONFIRMATION_FLASHER />}
            {flasher === "DELIVERED_ORDER" && <F_DELIVERED_ORDER />}
            {flasher === "GOODBYE" && <F_GOODBYE />}
            {flasher === "PLACED_ORDER" && <F_PLACED_ORDER />}
            {flasher === "PUSH_NOTIFICATION_REQUEST" && <F_PUSH_NOTIFICATION_REQUEST />}
            {flasher === "RESERVED_EVENT" && <F_RESERVED_EVENT />}
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