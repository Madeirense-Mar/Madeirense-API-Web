import {
    useEffect,
    useMemo
} from "react";

import {
    useNavigate
} from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    locales,
    type appPreferencesType
} from "@Madeirense/shared";

import MXP$App from 'configurations';

import { useFlasher } from "contexts/Flasher";
import { useNotifications } from "contexts/Notifications";
import { useProfile } from "contexts/Profile";

// ***************************************************************************************************************

const HOOK_NAME = useLocationPermission.name;

function useLocationPermission () {
    const { flash } = useFlasher();
    const { push } = useNotifications();

    const {
        requestLocationPermission,
        state: appState,
        subscribe,
        user
    } = useProfile();

    const {
        Base,
        Storage
    } = useMemo(() => MXP$App, []);

    const {
        authentication
    } = Base.Business.endpoints;

    const navigate = useNavigate();

    const { data: hasCredentials } = useQuery({
        queryKey: [`${HOOK_NAME}$CheckCredentials`],
        queryFn: () => authentication.hasCredentials(),
        enabled: !!user
    });

    const localeStrings = locales.get("pt")?.strings;

    useEffect(() => {
        if ((hasCredentials === false) && !location.pathname.includes("auth")) {
            navigate(
                "/auth/set-credentials",
                {
                    replace: true
                }
            );
        }
    }, [
        hasCredentials,
        location,
        navigate
    ]);

    useEffect(() => {
        async function askLocationPermission() {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if ([
                !("geolocation" in navigator),
                await Storage.hasItem("L_PROFILE$TEMP"),
                preferences.location !== "default"
            ].includes(true)) return;

            const {
                LocationPermissionAlternative,
                LocationPermissionDisclaimer,
                LocationPermissionCTA,
                LocationPermissionTitle
            } = localeStrings ?? {};

            push({
                id: "N#LOCATION_PERMISSION",
                type: "action",
                alert: `${LocationPermissionTitle} — ${LocationPermissionDisclaimer}`,
                action: requestLocationPermission,
                onClose: () => { Storage.setItem<appPreferencesType>("L_APP$PREFERENCES", { ...preferences, location: "deferred" as appPreferencesType["location"] }) },
                options: {
                    actionLabel: LocationPermissionCTA,
                    closeLabel: LocationPermissionAlternative,
                    variant: "warning",
                    popOnAction: true
                }
            });
        }

        async function askNotificationPermission() {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if ([
                appState === "subscribing",
                preferences.notifications !== "default"
            ].includes(true)) return;

            switch (Notification.permission) {
                case "default":
                    flash("PUSH_NOTIFICATION_REQUEST");

                    break;

                default: break;
            }
        }

        switch (user) {
            case undefined: break;

            default:
                askLocationPermission();
                askNotificationPermission();

                break;
        }
    }, [
        appState,
        flash,
        localeStrings,
        push,
        requestLocationPermission,
        Storage,
        subscribe,
        user
    ]);
};

export default useLocationPermission;