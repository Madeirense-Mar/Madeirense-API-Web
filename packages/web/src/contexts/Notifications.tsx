//#region Imports -----------------------------------------
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type JSX
} from "react";

import {
    type IconType
} from "react-icons";

import {
    generateRandomString,
    resolveClassNames
} from "@Madeirense/shared";

import Button from "components/buttons";
import Icon from "components/icon";
import ProgressBar from "components/progressBar";

import NotificationListItem from "components/lists/notificationListItem";

import styles from "./Notifications.module.css";

import type {
    variantType
} from "components/types";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
enum Notifications {
    "action" = "action",
    "alert" = "alert"
};

type idType = `N#${string}`;

type optionsType = {
    actionLabel: string,
    closeLabel?: string,
    popOnAction?: boolean,
    icon?: Element | IconType,
    sticky?: boolean,
    ttl?: number,
    variant?: variantType
};

type payloadType = {
    action?: () => void,
    alert: string | JSX.Element | Element,
    id: idType,
    onClose?: () => void,
    options?: Partial<optionsType>,
    ref: string,
    type: keyof typeof Notifications,
};
//#endregion

//#region Namespaces --------------------------------------
export namespace Notifications$Types {
    export type id = idType;
    export type payload = payloadType;
    export type type = keyof typeof Notifications;
};
//#endregion

//#region Context declarations ----------------------------
const NotificationsContext = createContext<{
    push: (notification: Omit<payloadType, "ref">) => void,
    pop: (id: idType) => boolean,
}>({
    push: (notification: Omit<payloadType, "ref">) => { },
    pop: (id: idType) => false
});
//#endregion

const NotificationsProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [currentTTL, updateCurrentTTL] = useState(0);
    const [notifications, setNotifications] = useState<payloadType[]>([]);
    const [showing, setShowing] = useState<number>(-1);
    //#endregion

    //#region Functions -----------------------------------
    const $pop = useCallback(({ id = undefined, ref = undefined }: Partial<{ id: idType, ref: string }>) => {
        if ([!id, !ref].every(Boolean)) return false;

        let index = -1;

        const _notifications = notifications.filter((n, idx) => {
            if ([
                n.id === id,
                n.ref === ref
            ].includes(true)) {
                index = idx;

                return false;
            }

            return false;
        });

        if (index === -1)
            return false;

        let next_index;

        switch (_notifications.length) {
            case 0:
                setNotifications([]);
                setShowing(-1);
                break;

            case 1:
                setNotifications(_notifications);
                setShowing(0);
                break;

            default:
                if (index === 0)
                    next_index = 1;

                else if (index === (_notifications.length - 1))
                    next_index = _notifications.length - 1;

                else
                    next_index = index + 1;

                setNotifications(_notifications);
                setShowing(next_index);
                break;
        };

        return true;
    }, [notifications]);

    const pop = useCallback((id: idType) => $pop({ id }), [$pop]);

    const push = useCallback((n: Omit<payloadType, "ref">) => {
        setNotifications(nf => nf.find(_n => _n.id === n.id)
            ? nf
            : [{ ...n, ref: generateRandomString(6, { excludeSpecialChars: true }) }, ...nf]
        );

        setShowing(0);
        updateCurrentTTL(0);
    }, []);

    const scrollToNotification = (e: any) => {
        const $button = e.target as HTMLButtonElement;

        const direction = ($button.value === "prev" ? -1 : 1);
        const index = showing + direction;

        setShowing(index);
        updateCurrentTTL(0);
    };
    //#endregion

    //#region Effects -------------------------------------
    useEffect(() => {
        return () => {
            setShowing(-1);
            setNotifications([]);
            updateCurrentTTL(0);

            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, []);

    useEffect(() => {
        if (notifications.length === 0 || showing === -1) return;

        const $div = document.getElementById(notifications[showing].ref);

        if (!$div) return;

        $div.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [notifications, showing]);

    useEffect(() => {
        if (notifications.length === 0) return;

        const refs = timeoutsRef.current;

        notifications.filter(n => n.options?.ttl).forEach(n => refs.push(setTimeout(() => $pop({ ref: n.ref }), n.options?.ttl)));

        return () => { refs.forEach(r => clearTimeout(r)) }
    }, [notifications, $pop]);

    useEffect(() => {
        if ([
            notifications.length === 0 || showing === -1,
            !notifications[showing].options?.ttl
        ].includes(true))
            return;

        switch (true) {
            case (currentTTL >= 100):
                if (intervalRef.current)
                    clearInterval(intervalRef.current);

                break;

            default:
                if (intervalRef.current)
                    break;

                intervalRef.current = setInterval(
                    () => updateCurrentTTL(ct => ct + 1),
                    (notifications[showing].options?.ttl as number / 100)
                );

                break;
        };
    }, [currentTTL, showing, notifications]);
    //#endregion

    //#region DOM -----------------------------------------
    return <NotificationsContext.Provider value={{ pop, push }}>
        <div
            className={resolveClassNames(
                styles[(showing === -1) ? "warning" : notifications[showing]?.options?.variant ?? "warning"],
                styles[Boolean(notifications.length) ? "showing" : "hidden"]
            )}
        >
            <Button value="prev" onClick={scrollToNotification} disabled={[-1, 0].includes(showing)} shape="circle">
                <Icon name="ChevronLeft" />
            </Button>

            <ul className={styles.list}>
                {notifications.map((n, idx) => <NotificationListItem key={n.ref} id={n.ref} disabledActions={!(showing === idx)} notification={n} onPop={$pop} />)}
            </ul>

            <Button value="next" onClick={scrollToNotification} disabled={[-1, notifications.length - 1].includes(showing)} shape="circle">
                <Icon name="ChevronRight" />
            </Button>

            {((showing > -1) && Boolean(notifications[showing].options?.ttl)) && <ProgressBar className={styles["progress-bar"]} value={currentTTL} />}
        </div>

        {children}
    </NotificationsContext.Provider>
    //#endregion
};

//#region Hooks -------------------------------------------
const useNotifications = () => {
    let context = useContext(NotificationsContext);

    if (!context)
        throw new Error(`"useNotifications" was used outside of its context.`);

    return context;
};
//#endregion

export {
    NotificationsProvider,
    useNotifications
};