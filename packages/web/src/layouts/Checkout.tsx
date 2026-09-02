import {
    useEffect,
    type MouseEvent
} from "react";

import {
    Outlet,
    useNavigate
} from "react-router-dom";

import {
    resolveClassNames
} from "@Madeirense/shared";

import Button from "components/buttons";
import Icon from "components/icon";

import { Root$Enumerators } from "styles/enumerators";

import styles from "./Checkout.module.css";

// ***************************************************************************************************************

function CheckoutLayout() {
    const navigate = useNavigate();

    async function handleReturn(e: MouseEvent<HTMLButtonElement>) {
        navigate(-1);
    };

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.checkout
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    return <main className={resolveClassNames(styles.checkout)}>
        <header>
            <Button shape="circle" variant="secondary" onClick={handleReturn}>
                <Icon name="ArrowLeft" />
            </Button>

            <h1>Checkout</h1>

            <h1 className="ml-auto opacity-30">
                Evento
                Entrega
                Resort
            </h1>
        </header>

        <Outlet />
    </main>
};

export default CheckoutLayout; 