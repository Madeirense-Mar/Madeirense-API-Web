import { useEffect } from "react";

import { Link } from "react-router-dom";

import { 
    resolveClassNames
} from "@Madeirense/shared";

import { useOrders } from "contexts/Orders";

import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./404.module.css";

// ***************************************************************************************************************

const NotFoundPage = () => {
    const { orders } = useOrders();

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.dataset.page = "404";

        return () => {
            $root.removeAttribute("data-page");
        }
    }, []);

    return <main className={resolveClassNames(styles.page)}>
        <h1>404</h1>

        <Tag>
            Não encontramos o que procura
        </Tag>

        <div className="w-full flex flex-row justify-center items-center gap-2">
            <hr />

            <span>No entanto, pode:</span>

            <hr />
        </div>

        <ul>
            <li>
                <Link className="Button" data-variant="text" to="/">
                    Encomendar

                    <Icon name="Takeout" />
                </Link>
            </li>

            {(orders.length > 0) && <li>
                <Link className="Button" data-variant="text" to="/orders">
                    Ver os seus pedidos

                    <Icon name="Order" />
                </Link>
            </li>}
        </ul>
    </main>
};

export default NotFoundPage;