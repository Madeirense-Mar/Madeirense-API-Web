import { 
    useState,
    type ComponentPropsWithoutRef
} from "react";

import { 
    DEFAULT_APP_PREFERENCES, 
    locales,
    resolveClassNames,
    type appPreferencesType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useFlasher } from "contexts/Flasher";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import Icon from "components/icon";

import styles from './request.module.css';

// ***************************************************************************************************************

const {
    NotificationPermissionTitle,
    NotificationPermissionDescription,
    NotificationPermissionClause1,
    NotificationPermissionClause2,
    NotificationPermissionClause3,
    NotificationPermissionSetup,
    NotificationPermissionCTA,
    NotificationPermissionAlternative,
    NotificationPermissionErrorCTA,
    NotificationPermissionErrorExplanation
} = (locales.get("pt")?.strings ?? {});


function PUSH_NOTIFICATION_PERMISSION_REQUEST_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    const { Storage } = MXP$App;

    const { eject } = useFlasher();
    
    const { 
        state, 
        subscribe
    } = useProfile();

    const [error, setError] = useState<Error | null>(null);

    async function handleSubscriptionRequest() {
        try {
            const wasSubscriptionSuccessfullySaved = await subscribe("push-notification");

            const preferences = (await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

            Storage.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                ...preferences,
                notifications: (wasSubscriptionSuccessfullySaved) ? "allowed" : "deferred"
            });

            eject();
        } catch (error) {
            setError(error as Error);
        }
    };

    async function handleEjection() {
        let preferences = (await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

        Storage.setItem<appPreferencesType>("L_APP$PREFERENCES", { ...preferences, notifications: "deferred" });

        eject();
    };

    return <main className={resolveClassNames(styles.main, className)} {...props}>
        {(error)
            ? <Icon name="ExclamationCircle" className="text-7xl mx-auto" />
            : <Icon name="NotificationCircle" className="text-7xl mx-auto" />
        }

        {(!error) && <>
            <h2 className="mx-auto mb-3">
                {NotificationPermissionTitle}
            </h2>

            <p>{NotificationPermissionDescription}</p>

            <ul>
                <li>{NotificationPermissionClause1}</li>
                <li>{NotificationPermissionClause2}</li>
                <li>{NotificationPermissionClause3}</li>
            </ul>

            <p>{NotificationPermissionSetup}</p>
        </>}

        {(error) && <div data-state="error" className="w-full my-5 flex flex-col justify-center items-center p-2 gap-2">
            <span className="text-center">{NotificationPermissionErrorExplanation}</span>

            <hr className="opacity-30" />

            <span className="text-center font-bold">{error.message}</span>
        </div>}

        <Button onClick={!error ? handleSubscriptionRequest : handleEjection} className="mx-auto mt-3 w-3/5" disabled={state === "subscribing"} variant={error ? "danger" : "primary"}>
            {(error)
                ? NotificationPermissionErrorCTA
                : (state === "subscribing")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <>
                        {NotificationPermissionCTA}

                        <Icon name="Check" />
                    </>
            }
        </Button>

        {(!error) && <Button onClick={handleEjection} className="mx-auto text-sm" variant="text" disabled={state === "subscribing" || (error !== null)}>
            {NotificationPermissionAlternative}
        </Button>}
    </main>;
}

export default PUSH_NOTIFICATION_PERMISSION_REQUEST_FLASHER;