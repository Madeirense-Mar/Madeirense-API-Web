import {
    Fragment,
    type ComponentPropsWithoutRef
} from "react";

import {
    Link,
    useLocation
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import Icon from "components/icon";

import styles from "./application.module.css";
import { useApp } from "contexts/App";

// ***************************************************************************************************************

function AppFooter({ className, ...props }: ComponentPropsWithoutRef<"footer">) {
    const location = useLocation();

    const {
        app
    } = useApp();

    const assertions = {
        "isInBackOffice": location.pathname.includes(Madeirense$Enumerators.Pages.BackOffice.Layout)
    };

    const year = new Date().getFullYear();

    const legalLinks = [
        { label: "Termos e condições", to: Madeirense$Enumerators.Pages.Legal.Terms, key: "terms" },
        { label: "Políticas de privacidade", to: Madeirense$Enumerators.Pages.Legal.Policy, key: "privacy" },
    ];

    return <footer className={resolveClassNames(className, styles.footer)} {...props}>
        <span className={resolveClassNames(assertions.isInBackOffice ? "" : "mr-auto")}>
            Madeirense Mar © {year}
        </span>

        {assertions.isInBackOffice && <span className="mr-auto italic opacity-10 hover:opacity-100">
            {app.Global_Settings?.change_version}
        </span>}

        <ul className={styles.legal}>
            {legalLinks.map((link, idx) => <Fragment key={link.key}>
                <li>
                    <Link to={link.to} target="_blank">{link.label}</Link>
                </li>

                {(idx != (legalLinks.length - 1)) && <li>
                    <Icon name="Dot" />
                </li>}
            </Fragment>)}
        </ul>
    </footer>
};

export default AppFooter;