import { 
    type ComponentPropsWithoutRef
} from "react";

import {
    Link
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import Icon from "components/icon";

import styles from "./application.module.css";

// ***************************************************************************************************************

function AppFooter({ className, ...props }: ComponentPropsWithoutRef<"footer">) {
    const year = new Date().getFullYear();

    return <footer className={resolveClassNames(className, styles.footer)} {...props}>
        <span>
            Madeirense Mar © {year}
        </span>

        <ul className={styles.legal}>
            <li>
                <Link to={Madeirense$Enumerators.Pages.Legal.Terms} target="_blank">Termos e condições</Link>
            </li>

            <li>
                <Icon name="Dot" />
            </li>

            <li>
                <Link to={Madeirense$Enumerators.Pages.Legal.Policy} target="_blank">Politicas de privacidade</Link>
            </li>
        </ul>
    </footer>
};

export default AppFooter;