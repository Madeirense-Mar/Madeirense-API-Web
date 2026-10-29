import {
    useEffect
} from "react";

import { 
    Root$Enumerators
} from "styles/enumerators";

import Icon from "components/icon";

import styles from "./Offline.module.css";

import "./Offline.css";

// ***************************************************************************************************************

function OfflinePage() {
    useEffect(() => {
        const $root = document.getElementById(Root$Enumerators.Identifiers["#root"]);

        if (!$root) return;

        $root.setAttribute(Root$Enumerators.Attributes.Context.page, "offline");

        return () =>  {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    return <main className={styles.page}>
        <Icon className="text-9xl opacity-25" name="Offline" />

        <h1>
            Estás sem conexão        
        </h1>

        <ul>
            <li>Não poderá encomendar</li>
            <li>O mapa de entregas não está disponível offline</li>
        </ul>
    </main>
};

export default OfflinePage;