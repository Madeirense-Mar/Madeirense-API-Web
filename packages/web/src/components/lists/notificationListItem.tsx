//#region Imports -----------------------------------------
import {
    type ComponentProps,
    type MouseEvent
} from "react";

import Button from "components/buttons";
import Icon from "components/icon";

import type {
    Notifications$Types
} from "contexts/Notifications";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
interface IPropTypes extends ComponentProps<"li"> {
    notification: Notifications$Types.payload;
    onPop: (options: Partial<{ id: Notifications$Types.id, ref: string }>) => void;
};
//#endregion

const NotificationListItem = ({ notification, onPop, ...props }: IPropTypes) => {
    const {
        actionLabel = "ver",
        closeLabel = null,
        popOnAction = false,
        icon = null,
        sticky = false
    } = notification.options ?? {};

    //#region Functions ---------------------------------------
    const handleAction = ({ target }: MouseEvent<HTMLButtonElement>) => {
        notification.action?.();

        if (popOnAction) onPop({ ref: (target as HTMLButtonElement).value });
    };

    const handlePop = ({ target }: MouseEvent<HTMLButtonElement>) => {
        notification.onClose?.();

        onPop({ ref: (target as HTMLButtonElement).value });
    };
    //#endregion

    //#region DOM ---------------------------------------------
    const $body = <>
        {icon}

        {typeof notification.alert === "string" && <span>{notification.alert}</span>}
        {typeof notification.alert !== "string" && notification.alert}

        {!sticky && <Button value={notification.ref} onClick={handlePop} data-shape={closeLabel ? "rect" : "round"} variant="secondary" className="ml-auto">
            {closeLabel}

            <Icon name="Close" className="pointer-events-none" />
        </Button>}
    </>;

    switch (notification.type) {
        case "action": {
            if (!notification.action) console.error("Notification of type action wasn't supplied with a function to be fired.");

            return <li {...props}>
                {$body}

                <Button value={notification.ref} data-shape="rect" onClick={handleAction} variant="primary">
                    {actionLabel}
                </Button>
            </li>
        }

        case "alert": {
            return <li {...props}>
                {$body}
            </li>
        }

        default: {
            return null
        }
    };
    //#endregion
};

export default NotificationListItem;