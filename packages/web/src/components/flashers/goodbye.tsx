import { 
    type ComponentProps,
    type MouseEvent
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
    
    function handleClick (e: MouseEvent<HTMLButtonElement>) {
        eject();
    };

    return <main className={resolveClassNames(styles.main, className)} {...props}>
        <h1 className="mx-auto">
            {GoodbyeTitle}
        </h1>

        <section>
            {GoodbyeParagraph1 && <p>{GoodbyeParagraph1}</p>}

            {GoodbyeParagraph2 && <p>{GoodbyeParagraph2}</p>}

            {GoodbyeParagraph3 && <p>{GoodbyeParagraph3}</p>}

            <h2 className="italic font-bold w-full text-center">
                {GoodbyeStatement}
            </h2>
        </section>

        <Button onClick={handleClick} className="mx-auto" disabled={state !== "guest"}>
            {`${GoodbyeCTA} 👋`}
        </Button>
    </main>
};

export default GOODBYE_FLASHER;