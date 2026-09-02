import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ComponentProps,
    type JSX,
    type MouseEvent
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
import ProgressBar from 'components/progressBar';

import type { variantType } from "components/types";

import styles from "./Notifications.module.css";

// ***************************************************************************************************************

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

enum Notifications {
    "action",
    "alert"
};

const NotificationsContext = createContext<{
    push: (notification: Omit<payloadType, "ref">) => void,
    pop: (id: idType) => boolean,
}>({
    push: (notification: Omit<payloadType, "ref">) => { },
    pop: (id: idType) => false
});

const NotificationsProvider = ({ children }: any) => {
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [currentTTL, updateCurrentTTL] = useState(0);
    const [notifications, setNotifications] = useState<payloadType[]>([]);
    const [showing, setShowing] = useState<number>(-1);

    const $pop = useCallback(({ id = undefined, ref = undefined }: Partial<{ id: idType, ref: string }>) => {
        if ([!id, !ref].every(Boolean)) return false;

        const index = notifications.findIndex(n => {
            if (id) return n.id === id;
            if (ref) return n.ref === ref;

            return false;
        });

        if (index === -1) return false;

        const _notifications = notifications.filter(n => {
            if (id) return n.id !== id;
            if (ref) return n.ref !== ref;

            return false;
        });

        let next_index;

        switch (_notifications.length) {
            case 0: setNotifications([]); setShowing(-1); break;

            case 1: setNotifications(_notifications); setShowing(0); break;

            default:
                if (index === 0) next_index = 1;

                else if (index === (_notifications.length - 1)) next_index = _notifications.length - 1;

                else next_index = index + 1;

                setNotifications(_notifications);
                setShowing(next_index);
                break;
        }

        return true;
    }, [notifications]);

    const pop = useCallback((id: idType) => {
        return $pop({ id });
    }, [$pop]);

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
        if (notifications.length === 0 || showing === -1) return;

        if (!notifications[showing].options?.ttl) return;

        switch (true) {
            case (currentTTL >= 100):
                if (intervalRef.current) clearInterval(intervalRef.current);

                break;

            default:
                if (intervalRef.current) break;

                intervalRef.current = setInterval(() => updateCurrentTTL(ct => ct + 1), (notifications[showing].options.ttl / 100));

                break;
        };
    }, [currentTTL, showing, notifications]);

    return <NotificationsContext.Provider value={{ push, pop }}>
        <div
            id="notification-tray"
            className={resolveClassNames(
                styles[(showing === -1) ? "warning" : notifications[showing]?.options?.variant ?? "warning"]
            )}
            data-state={Boolean(notifications.length) ? "showing" : "hidden"}
        >
            <Button
                value="prev"
                onClick={scrollToNotification}
                variant='secondary'
                disabled={[-1, 0].includes(showing)}
            >
                <Icon name="ChevronLeft" />
            </Button>

            <ul>{notifications.map((n, idx) => <ListItem
                className="flex flex-row justify-start items-start gap-3"
                key={n.ref}
                id={n.ref}
                notification={n}
                onPop={$pop}
                data-state={showing === idx ? "idle" : "disabled"}
            />)}</ul>

            {(showing === -1) ? null : Boolean(notifications[showing].options?.ttl) && <ProgressBar value={currentTTL} />}

            <Button
                value="next"
                onClick={scrollToNotification}
                variant='secondary'
                disabled={[-1, notifications.length - 1].includes(showing)}
            >
                <Icon name="ChevronRight" />
            </Button>
        </div>

        <>{children}</>
    </NotificationsContext.Provider>
};

const useNotifications = () => {
    let context = useContext(NotificationsContext);

    if (!context) throw new Error(`'useNotifications' was used outside of its context.`);

    return context;
};

export { NotificationsProvider, useNotifications };

const ListItem = ({
    notification: n,
    onPop,
    ...props
}: ComponentProps<"li"> & {
    notification: payloadType,
    onPop: (options: Partial<{ id: idType, ref: string }>) => void
}) => {
    const {
        actionLabel = "ver",
        closeLabel = null,
        popOnAction = false,
        icon = null,
        sticky = false
    } = n.options ?? {};

    const handleAction = ({ target }: MouseEvent<HTMLButtonElement>) => {
        n.action?.();

        if (popOnAction) onPop({ ref: (target as HTMLButtonElement).value });
    };

    const handlePop = ({ target }: MouseEvent<HTMLButtonElement>) => {
        n.onClose?.();

        onPop({ ref: (target as HTMLButtonElement).value });
    };

    const $LI_BODY = <>
        {icon}

        {typeof n.alert === "string" && <span>{n.alert}</span>}
        {typeof n.alert !== "string" && n.alert}

        {!sticky && <Button value={n.ref} onClick={handlePop} data-shape={closeLabel ? "rect" : "round"} variant='secondary' className='ml-auto'>
            {closeLabel}

            <Icon name="Close" className='pointer-events-none' />
        </Button>}
    </>;

    switch (n.type) {
        case "action":
            if (!n.action) console.error("Notification of type action wasn't supplied with a function to be fired.");

            return <li {...props}>
                {$LI_BODY}

                <Button value={n.ref} data-shape="rect" onClick={handleAction} variant='primary'>
                    {actionLabel}
                </Button>
            </li>;

        case "alert": return <li {...props}>
            {$LI_BODY}
        </li>;

        default: return null;
    }
}
