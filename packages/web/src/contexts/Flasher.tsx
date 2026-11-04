//#region Imports -----------------------------------------
import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';

import Icon from "components/icon";
import Button from "components/buttons";

import F_GOODBYE from 'components/flashers/goodbye';
import F_RESERVED_EVENT from 'components/flashers/event/reserved';
import F_PLACED_ORDER from 'components/flashers/order/placed';
import F_DELIVERED_ORDER from 'components/flashers/order/delivered';
import F_PUSH_NOTIFICATION_REQUEST from 'components/flashers/pushNotification/request';

import styles from './Flasher.module.css';
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
    | "EMPTY"
    | "LOADING"
    | "GOODBYE"
    | `${requestEventType}_REQUEST`
    | `${orderEventType}_ORDER`
    | `${restaurantEventType}_EVENT`
);

type FlasherContextType = {
    eject: () => void,
    flash: (t: flasherEventType) => void
};
//#endregion

//#region Context declarations ----------------------------
const FlasherContext = createContext<FlasherContextType>({
    eject: () => { },
    flash: (t: flasherEventType) => { }
});
//#endregion

const FlasherProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const $dialogRef = useRef<HTMLDialogElement | null>(null);

    const [flasher, setFlasher] = useState<flasherEventType>("EMPTY");
    //#endregion

    //#region Variable declarations -----------------------
    const assertions = {
        "allowManuelEjection": !([
            "GOODBYE",
            "LOADING",
            "PUSH_NOTIFICATION_REQUEST"
        ] as flasherEventType[]).includes(flasher)
    };

    const LOADER_STATE = ([
        "EMPTY",
        "LOADING",
        "PLACED_ORDER",
        "RESERVED_EVENT"
    ] as flasherEventType[]).includes(flasher) ? "on" : "off";
    //#endregion

    //#region Functions -----------------------------------
    const eject = () => {
        setTimeout(() => {
            setFlasher("EMPTY");

            $dialogRef.current?.close();
        }, 2000);
    }

    const flash = useCallback((t: flasherEventType) => {
        $dialogRef.current?.showModal();

        setFlasher("LOADING");

        setTimeout(() => {
            setFlasher(t);
        }, 2000);
    }, []);
    //#endregion

    //#region DOM -----------------------------------------
    return <FlasherContext.Provider value={{ eject, flash }}>
        <dialog ref={$dialogRef} className={styles.flasher} data-event={flasher}>
            {assertions.allowManuelEjection && <Button id="eject" onClick={eject} shape="circle" variant='secondary' className='opacity-15 hover:opacity-100'>
                <Icon name="Close" />
            </Button>}

            {flasher === "DELIVERED_ORDER" && <F_DELIVERED_ORDER />}
            {flasher === "GOODBYE" && <F_GOODBYE />}
            {flasher === "PLACED_ORDER" && <F_PLACED_ORDER />}
            {flasher === "PUSH_NOTIFICATION_REQUEST" && <F_PUSH_NOTIFICATION_REQUEST />}
            {flasher === "RESERVED_EVENT" && <F_RESERVED_EVENT />}

            <div className='loader' data-state={LOADER_STATE}></div>
        </dialog>

        {children}
    </FlasherContext.Provider>
    //#endregion
};

//#region Hooks -------------------------------------------
const useFlasher = () => {
    let context = useContext(FlasherContext);

    if (!context) throw new Error(`'useFlasher' was used outside of its context.`);

    return context;
};
//#endregion

export {
    FlasherProvider,
    useFlasher
};