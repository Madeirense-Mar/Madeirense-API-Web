//#region Imports -------------------------------------
import {
    type ComponentPropsWithoutRef
} from "react";

import {
    useQuery
} from "@tanstack/react-query";

import {
    QRCode
} from "react-qr-code";

import {
    myTicketType,
    resolveClassNames
} from "@Madeirense/shared";

import ApplicationQueries, {
    type Queries$Types
} from "configurations/queries";

import {
    useApp
} from "contexts/App";

import {
    useOrders
} from "contexts/Orders";

import Icon from "components/icon";

import RestaurantCardWithoutNavigation from "components/cards/restaurant/withoutNavigation";

import styles from "./reserved.module.css";
//#endregion

// ***************************************************************************************************************

//#region Default variables -------------------------------
const componentName = RESERVED_EVENT_FLASHER.name;
//#endregion

function RESERVED_EVENT_FLASHER({ className, ...props }: ComponentPropsWithoutRef<"main">) {
    //#region Hooks and state declarations ----------------
    const {
        get
    } = useApp();

    const {
        orders
    } = useOrders();

    const {
        restaurant_id,
        order_id,
        Order_Items = []
    } = orders.at(-1) ?? {};

    const {
        data,
        isFetching,
        error
    } = useQuery({
        queryKey: [
            `${componentName}$GetMyTickets`,
            "my-tickets",
            //{ order_id }
            { order_id: 7 }
        ] as Queries$Types.itemQueryKey[],
        queryFn: ApplicationQueries.getList<myTicketType>
    });
    //#endregion

    //#region Variable declarations -----------------------
    const {
        data: myTickets = []
    } = data ?? {};

    const restaurant = get("Restaurants")?.find(r => r.restaurant_id === restaurant_id);

    const merchItems = Order_Items.filter(o => o.Products.product_type !== "ticket");
    //#endregion

    //#region DOM -----------------------------------------
    return <main className={resolveClassNames(styles.main, className)} {...props}>
        <section>
            <h1>Reservado!</h1>

            <p>Reservamos os teu ingresso no restaurante </p>

            {(restaurant)
                ? <RestaurantCardWithoutNavigation className="w-full" {...{ restaurant }} />
                : <Icon name="Loading" className="animate-spin" />
            }
        </section>

        <section>
            <h2>Ingressos</h2>

            <p>Mostra os seguintes códigos pelo aplicativo mobile</p>

            <ul className={styles["qr-list"]}>
                {(isFetching)
                    ? <Icon name="Loading" className="animate-spin" />

                    : (myTickets ?? []).map(t => <li key={t.ticket_id}>
                        <QRCode value={`${t.token}`} />
                    </li>)
                }
            </ul>
        </section>

        {Boolean(merchItems.length) && <section>
            <h2>Merchandise</h2>

            <p>Com o scan do ingresso tens o direito de receber</p>

            <table className={resolveClassNames(styles["merch-table"], "w-full")}>
                <thead>
                    <tr>
                        <th>Imagem</th>

                        <th>Nome</th>

                        <th>Descrição</th>

                        <th>Preço</th>

                        <th>Quantidade</th>
                    </tr>
                </thead>

                <tbody>
                    {merchItems.map(item => <tr key={item.item_id}>
                        <td>
                            <div style={{ "backgroundImage": `url(${item.Products.thumbnail ?? "#"})` }} data-type="thumbnail">
                            </div>
                        </td>

                        <td>{item.Products.name}</td>

                        <td>{item.Products.description}</td>

                        <td className="text-right">{`${item.Products.price}`}</td>

                        <td className="text-right">{`x${item.quantity}`}</td>
                    </tr>)}
                </tbody>
            </table>
        </section>}
    </main>
    //#endregion
};

export default RESERVED_EVENT_FLASHER;