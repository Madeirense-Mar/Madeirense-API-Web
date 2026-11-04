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
import Tag from "components/tags";

import { 
    Root$Enumerators
} from "styles/enumerators";

import styles from "./404.module.css";
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
    return <main className={resolveClassNames(styles.page)}>
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
                <AnchorButton  to={Madeirense$Enumerators.Pages.App.Order}>
                    <Icon name="Order" />

                    Ver os seus pedidos
                </AnchorButton>
            </li>}
        </ul>
    </main>
    //#endregion
};

export default NotFoundPage;