import { 
    type ComponentPropsWithoutRef
} from "react";

import { 
    resolveClassNames
} from "@Madeirense/shared";

// ***************************************************************************************************************

function PLACED_ORDER_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    return <main className={resolveClassNames(className)} {...props}>
        <h1>Pedido feito!</h1>

        <p>Recebemos o teu pedido e vamos dar o devido tratamento</p>
    </main>
};

export default PLACED_ORDER_FLASHER;