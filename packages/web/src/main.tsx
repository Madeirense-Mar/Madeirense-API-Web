import "@uploadcare/react-uploader/core.css";

//#region Styles
import "styles/tailwind.css";
import "styles/global.css";
import "styles/table.css";
import "styles/root.css";

//#region Components default styles
import "styles/card.css";
//#endregion

//#region Grouped components default styles
//#endregion
//#endregion

// ***************************************************************************************************************

import ReactDOM from "react-dom/client";

import reportWebVitals from "./reportWebVitals";

import {
    QueryClient,
    QueryClientProvider
} from "@tanstack/react-query";

import MXP$App from "configurations";

import { 
    AppContextProvider
} from "contexts/utilities/providers";

import { AppProvider } from "contexts/App";
import { CartProvider } from "contexts/Cart";
import { FlasherProvider } from "contexts/Flasher";
import { NotificationsProvider } from "contexts/Notifications";
import { OrdersProvider } from "contexts/Orders";
import { ProfileProvider } from "contexts/Profile";
import { ThemeProvider } from "contexts/Theme";

import AppRouter from "router";

// ***************************************************************************************************************

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const queryClient = new QueryClient(MXP$App.configurations.dependencies['@tanstack/react-query']);

const providers = [
    ThemeProvider,
    NotificationsProvider,
    AppProvider,
    ProfileProvider,
    OrdersProvider,
    CartProvider,
    FlasherProvider
];

const providerProps = {
    clients: MXP$App.Base.Business.endpoints,
    storageManager: MXP$App.Storage
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register("/service-worker.js")
        .then(registration => {
            console.log('Service Worker registered with scope:', registration);
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        })
        ;
}

root.render(
    <QueryClientProvider client={queryClient}>
        <AppContextProvider props={providerProps} {...{ providers }}>
            <AppRouter />
        </AppContextProvider>
    </QueryClientProvider>
);

reportWebVitals();