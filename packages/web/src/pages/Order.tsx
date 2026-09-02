import {
    useEffect,
    useState,
    type ChangeEvent
} from "react";

import {
    Link,
    useNavigate,
    useParams,
    useSearchParams
} from "react-router-dom";

import {
    Madeirense$Enumerators,
    type orderType
} from "@Madeirense/shared";

import { useOrders } from "contexts/Orders";

import Icon from "components/icon";
import OrdersList from "components/lists/order";
import Orders from "components/tables/orders";

import { Page$Enumerators } from "pages/enumerators";
import { Root$Enumerators } from "styles/enumerators";

// ***************************************************************************************************************

const OrderPage = () => {
    const navigate = useNavigate();

    const {
        orders,
        state
    } = useOrders();

    const params = useParams();

    const [searchParams, updateSearchParams] = useSearchParams();

    const order_type = (searchParams.get("order_type") ?? undefined);
    const order_id = parseInt(params.order_id ?? "0");

    const [type, setType] = useState(order_type);

    const assertions = {
        "notFound": (order_id === 0)
            ? false
            : (state === "idle") && !orders.find((o) => o.order_id === order_id)
    };

    function handleTypePick({ target }: ChangeEvent<HTMLSelectElement>) {
        setType((target as HTMLSelectElement).value);

        searchParams.delete("order_type");

        updateSearchParams(searchParams);
    };

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.order
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    useEffect(() => {
        if (!assertions.notFound) return;

        navigate([
            `${Madeirense$Enumerators.Pages.App["Not Found"]}?`,
            `${Page$Enumerators.Queries.wasIn}=${encodeURIComponent(`${Madeirense$Enumerators.Pages.App.Order}/${order_id}`)}`
        ].join(), {
            replace: true
        });
    }, [
        assertions.notFound,
        navigate,
        order_id
    ]);

    switch (order_id) {
        case 0: {
            return <main className="w-full">
                <section>
                    <header className="mb-5">
                        <select title="Tipo de pedidos" id="type" data-element="h1" name="type" defaultValue={type} onChange={handleTypePick}>
                            <option value="">Os meus pedidos</option>
                            <option value="delivery">As minhas encomendas</option>
                            <option value="ticket">Os meus bilhetes</option>
                        </select>
                    </header>

                    <OrdersList type="my-orders" filter={type as orderType} trackAppUpdates />
                </section>
            </main>
        }

        default: {
            if (assertions.notFound) return null;

            switch (state) {
                case "loading": {
                    return <main className="w-full h-full">
                        <div className="w-full h-full flex flex-row justify-center items-center p-10">
                            <Icon name="Loading" className="animate-spin" />
                        </div>
                    </main>
                }

                default: {
                    return <main className="w-full">
                        <section>
                            <header className="mb-5 flex flex-row justify-start items-center gap-3">
                                <Link to={"/orders"} className="Button" data-variant="secondary">
                                    <Icon name="ArrowLeft" />
                                </Link>

                                <h1>Pedido #{order_id}</h1>
                            </header>

                            <Orders className="w-full" mode="summary" {...{ order_id }} />
                        </section>
                    </main>
                }
            };
        }
    };
};

export default OrderPage;