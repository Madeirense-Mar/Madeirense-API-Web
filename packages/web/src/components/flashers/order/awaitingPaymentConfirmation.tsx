import {
    type ComponentPropsWithoutRef
} from "react";

import {
    resolveClassNames
} from "@Madeirense/shared";

// ***************************************************************************************************************

function AWAITING_PAYMENT_CONFIRMATION_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    //Check for a payment confirmation here

    return <main className={resolveClassNames(className)} {...props}>
    </main>
};

export default AWAITING_PAYMENT_CONFIRMATION_FLASHER;