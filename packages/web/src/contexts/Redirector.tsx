//#region Imports -----------------------------------------
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

import AppSettings from "settings";

import {
    useProfile
} from "./Profile";
//#endregion

// ***************************************************************************************************************

//#region Context declarations ----------------------------
const RedirectorContext = createContext({});
//#endregion

const RedirectorProvider = ({ children }: any) => {
    //#region Hooks and state declarations ----------------
    const {
        pathname
    } = useLocation();
    
    const {
        state: profileState
    } = useProfile();
    
    const navigate = useNavigate();
    //#endregion

    //#region Effects -----------------------------------------
    useEffect(() => {
        if (!navigator.onLine) {
            if (!(pathname.endsWith(Madeirense$Enumerators.Pages.App.Offline)))
                navigate(Madeirense$Enumerators.Pages.App.Offline);

            return;
        };

        function branchToDefaultRedirections() {
            switch (true) {
                case (pathname.endsWith(Madeirense$Enumerators.Pages.App.Offline)):
                    navigate(Madeirense$Enumerators.Pages.App.Layout, { replace: true });
                    break;

                default: break;
            };
        };

        switch (profileState) {
            case "guest": {
                switch (true) {
                    case ([
                        AppSettings.Routing.protectedRoutes.some(endpoint => pathname.includes(endpoint))
                    ].every(Boolean)):
                        navigate(Madeirense$Enumerators.Pages.App.Layout, { replace: true });

                        break;

                    default: branchToDefaultRedirections(); break;
                };

                break;
            }

            default: branchToDefaultRedirections(); break;
        };
    }, [
        navigate,
        pathname,
        profileState
    ]);
    //#endregion

    return <RedirectorContext.Provider value={{}}>
        {children}
    </RedirectorContext.Provider>
};

export {
    RedirectorProvider,
};