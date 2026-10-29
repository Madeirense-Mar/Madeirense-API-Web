import {
    createContext,
    useEffect
} from "react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import {
    Madeirense$Enumerators
} from "@Madeirense/shared";

import {
    useProfile
} from "./Profile";

import AppSettings from "settings";

// ***************************************************************************************************************

const RedirectorContext = createContext({});

const RedirectorProvider = ({ children }: any) => {
    const {
        pathname
    } = useLocation();

    const {
        state: profileState
    } = useProfile();

    const navigate = useNavigate();

    useEffect(() => {
        if (!navigator.onLine) {
            navigate(Madeirense$Enumerators.Pages.App.Offline);

            return;
        };

        switch (profileState) {
            case "guest": {
                switch (true) {
                    case ([
                        AppSettings.Routing.protectedRoutes.some(endpoint => pathname.includes(endpoint))
                    ].every(Boolean)):
                        navigate(Madeirense$Enumerators.Pages.App.Layout, { replace: true });

                        break;

                    default: break;
                };

                break;
            }

            default: switch (true) {
                case (pathname.includes(Madeirense$Enumerators.Pages.App.Offline)):
                    navigate(Madeirense$Enumerators.Pages.App.Layout, { replace: true });
                    break;

                default: break;
            };
        };
    }, [
        navigate,
        pathname,
        profileState
    ]);

    return <RedirectorContext.Provider value={{}}>
        {children}
    </RedirectorContext.Provider>
};

export {
    RedirectorProvider,
};