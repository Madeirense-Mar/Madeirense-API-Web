import { 
    type ComponentPropsWithoutRef
} from "react";

import { 
    resolveClassNames
} from "@Madeirense/shared";

import ConfettiAnimation from "components/animations/confetti";

// ***************************************************************************************************************

function DELIVERED_ORDER_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    return <main className={resolveClassNames(className)} {...props}>
        <ConfettiAnimation size='l' pieces={100} defaultShape='rect' />
    </main>
};

export default DELIVERED_ORDER_FLASHER;