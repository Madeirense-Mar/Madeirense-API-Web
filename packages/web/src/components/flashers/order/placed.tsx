//#region Imports -----------------------------------------
import { 
    type ComponentPropsWithoutRef
} from "react";

import { 
    resolveClassNames
} from "@Madeirense/shared";

import styles from "./placed.module.css";
//#endregion

// ***************************************************************************************************************

function PLACED_ORDER_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    //#region DOM -----------------------------------------
    return <main className={resolveClassNames(styles.main, className)} {...props}>
        <h1>Pedido feito!</h1>

        <p>Recebemos o teu pedido e vamos dar o devido tratamento</p>
    </main>
    //#endregion
};

export default PLACED_ORDER_FLASHER;