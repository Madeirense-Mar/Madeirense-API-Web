import {
    type ComponentPropsWithoutRef
} from "react";

import { 
    resolveClassNames
} from "@Madeirense/shared";

// ***************************************************************************************************************

function RESERVED_EVENT_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    return <main className={resolveClassNames(className)} {...props}>
        <h1>Obrigado!</h1>

        <p>Reservamos os teu ingresso, vemo-nos no evento</p>
    </main>;
}

export default RESERVED_EVENT_FLASHER;