import {
    useEffect
} from "react";

import { 
    Root$Enumerators
} from "styles/enumerators";

import styles from "./page.module.css";

// ***************************************************************************************************************

function TermsAndConditionsPage() {
    useEffect(() => {
        const $root = document.getElementById(Root$Enumerators.Identifiers["#root"]);

        if (!$root) return;

        $root.setAttribute(Root$Enumerators.Attributes.Context.page, "contract");

        return () =>  {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    return <main className={styles.page}>
    </main>
};

export default TermsAndConditionsPage;