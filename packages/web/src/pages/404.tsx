//#region Imports -----------------------------------------
import {
    useEffect
} from "react";

import {
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import {
    useOrders
} from "contexts/Orders";

import AnchorButton from "components/buttons/anchor";
import Icon from "components/icon";

import AppFooter from "components/footer/application";
import AppNav from "components/navigation/application";

import {
    Root$Enumerators
} from "styles/enumerators";

import styles from "./404.module.css";
import patternsStyles from "styles/patterns.module.css";

import "./404.css";
//#endregion

// ***************************************************************************************************************

const NotFoundPage = () => {
    const { orders } = useOrders();

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(Root$Enumerators.Attributes.Context.page, "404");

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    //#region DOM -----------------------------------------
    return <>
        <div data-position="left" className={patternsStyles.pattern}></div>
        <div data-position="right" className={patternsStyles.pattern}></div>

        <AppNav />

        <main className={resolveClassNames(styles.main)}>
            <header>
                <h1>404</h1>

                <p>
                    Não encontramos o que procura
                </p>
            </header>

            <ul>
                <li>
                    <AnchorButton to={Madeirense$Enumerators.Pages.App.Layout}>
                        <Icon name="Takeout" />

                        Encomendar
                    </AnchorButton>
                </li>

                {(orders.length > 0) && <li>
                    <AnchorButton to={Madeirense$Enumerators.Pages.App.Order}>
                        <Icon name="Order" />

                        Ver os seus pedidos
                    </AnchorButton>
                </li>}
            </ul>
        </main>

        <AppFooter />
    </>
    //#endregion
};

export default NotFoundPage;