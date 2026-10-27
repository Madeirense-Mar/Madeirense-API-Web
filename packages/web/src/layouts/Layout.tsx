import {
    useEffect,
    useMemo
} from "react";

import {
    Outlet,
    useLocation
} from "react-router-dom";

import {
    Madeirense$Enumerators
} from "@Madeirense/shared";

import useLocationPermission from "hooks/useLocationPermission";

import { AppContextProvider } from "contexts/utilities/providers";
import { useCart } from "contexts/Cart";
import { ModalProvider } from "contexts/Modal";
import { useOrders } from "contexts/Orders";
import { RedirectorProvider } from "contexts/Redirector";

import Cart from "components/tables/cart";
import Orders from "components/tables/orders";

import AppNav from "components/navigation/application";

import { Root$Enumerators } from "styles/enumerators";

import styles from "./Layout.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

const providers = [
    ModalProvider
];

const Layout = () => {
    useLocationPermission();

    const { cart } = useCart();
    const { orders } = useOrders();

    const location = useLocation();

    const allowOverlays = useMemo(() => (
        [
            Madeirense$Enumerators.Pages.App.Events,
            Madeirense$Enumerators.Pages.App["Not Found"],
            Madeirense$Enumerators.Pages.App.Product,
            Madeirense$Enumerators.Pages.App.Profile,
            Madeirense$Enumerators.Pages.App.Resort,
            Madeirense$Enumerators.Pages.Authentication.Layout,
            Madeirense$Enumerators.Pages.BackOffice.Layout,
        ].every(p => !location.pathname.includes(p))
    ), [location]);

    const assertions = useMemo(() => ({
        allowOverlays,
        "allowCartOverlay": (
            allowOverlays &&
            [
                Madeirense$Enumerators.Pages.App.Order,
                Madeirense$Enumerators.Pages.App.Welcome
            ].every(p => !location.pathname.includes(p))
        ),
        "allowOrderOverlay": (
            allowOverlays &&
            [
                Madeirense$Enumerators.Pages.App.Order,
                Madeirense$Enumerators.Pages.App.Welcome,
                Madeirense$Enumerators.Pages.Checkout.Layout
            ].every(p => !location.pathname.includes(p))
        ),
        "allowPatterns": (
            allowOverlays &&
            [
                "/",
            ].some((link, idx) => (idx === 0)
                ? (link === location.pathname)
                : location.pathname.includes(link)
            )
        ),
        "disableNavigation": [
            Madeirense$Enumerators.Pages.App.Welcome
        ].some(endpoint => location.pathname.includes(endpoint))
    }), [allowOverlays, location]);

    useEffect(() => {
        const $root = document.getElementById(Root$Enumerators.Identifiers["#root"]);

        if (
            !$root ||
            !assertions.allowOverlays
        ) return;

        $root.setAttribute(Root$Enumerators.Attributes.States["has-pattern"], "");

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.States["has-pattern"]);
        };
    }, [assertions.allowOverlays]);

    useEffect(() => {
        const $root = document.getElementById(Root$Enumerators.Identifiers["#root"]);

        if (
            !$root ||
            !assertions.allowCartOverlay ||
            !Boolean(cart.deliveryCart.length)
        ) return;

        $root.setAttribute(Root$Enumerators.Attributes.States["has-cart"], "");

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.States["has-cart"]);
        }
    }, [
        assertions.allowCartOverlay,
        cart.deliveryCart
    ]);

    useEffect(() => {
        const $root = document.getElementById(Root$Enumerators.Identifiers["#root"]);

        if (
            !$root ||
            !assertions.allowOrderOverlay ||
            !Boolean((orders.filter(({ status }) => !(["cancelled", "delivered"] as $Enums.Orders_status[]).includes(status as $Enums.Orders_status)) ?? []).length)
        ) return;

        $root.setAttribute(Root$Enumerators.Attributes.States["has-orders"], "");

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.States["has-orders"]);
        }
    }, [
        assertions.allowOrderOverlay,
        orders
    ]);

    return <AppContextProvider {...{ providers }}>
        <RedirectorProvider>
            {(!assertions.allowPatterns) ? null : <>
                <div className={styles.pattern} data-position="left"></div>
                <div className={styles.pattern} data-position="right"></div>
            </>}

            {assertions.allowCartOverlay && <Cart type="delivery" />}

            {assertions.allowOrderOverlay && <Orders />}

            {!assertions.disableNavigation && <AppNav />}

            <Outlet />
        </RedirectorProvider>
    </ AppContextProvider>
};

export default Layout;