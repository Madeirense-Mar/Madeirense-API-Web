import { 
    type ComponentProps
} from "react";

import { 
    locales, 
    resolveClassNames 
} from "@Madeirense/shared";

import { useFlasher } from "contexts/Flasher";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";

import styles from './goodbye.module.css';

// ***************************************************************************************************************

const {
    GoodbyeParagraph1,
    GoodbyeParagraph2,
    GoodbyeParagraph3,
    GoodbyeStatement,
    GoodbyeTitle,
    GoodbyeCTA
} = (locales.get("pt")?.strings ?? {});

function GOODBYE_FLASHER({ className, ...props }: ComponentProps<"main">) {
    const { state } = useProfile();
    const { eject } = useFlasher();
    
    return <main className={resolveClassNames(styles.main, className)} {...props}>
        <h2 className="mx-auto mb-3">
            {GoodbyeTitle}
        </h2>

        <p>{GoodbyeParagraph1}</p>

        <p>{GoodbyeParagraph2}</p>

        <p className="italic font-bold w-full text-center">
            {GoodbyeStatement}
        </p>

        <p>{GoodbyeParagraph3}</p>

        <Button onClick={eject} className="mx-auto text-sm" variant="text" disabled={state !== "guest"}>
            {`${GoodbyeCTA} 👋`}
        </Button>
    </main>
};

export default GOODBYE_FLASHER;