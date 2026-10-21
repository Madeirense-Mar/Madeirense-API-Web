import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import { useOrders } from "contexts/Orders";

import Button from "components/buttons";
import ProfileHeaderCard from "components/cards/profileHeader";
import Icon from "components/icon";
import OrderItemsList from "components/lists/order/items";
import LeafletDeliveryTracker from "components/maps/leaflet/deliveryTracker";

import type {
    Users
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    order_id: number
};

function OrderSummaryView({
    order_id,
    ...props
}: IPropTypes) {
    const {
        cancel,
        orders,
        state
    } = useOrders();

    const [error, setError] = useState<Error | null>(null);
    const [isCancelling, toggleIsCancelling] = useState<boolean>(false);

    const selectedOrder = useMemo(() => (!order_id) ? null : orders.find((o) => o.order_id === order_id), [orders, order_id]);

    const assertions = {
        "isFinalized": [
            "cancelled",
            "delivered"
        ].includes(selectedOrder?.status ?? "cancelled")
    };

    function handleCancellation() {
        toggleIsCancelling(true);
    };

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);

        try {
            setError(null);

            await cancel(
                selectedOrder?.order_id as number,
                $form_data.get("notes") as string
            );
        } catch (error) {
            setError(new Error((error as Error).message));
        } finally {
            toggleIsCancelling(false);
        }
    };

    if (!selectedOrder) return null;

    return <div {...props}>
        {(selectedOrder.status === "assigned") && <ProfileHeaderCard user={selectedOrder.Users_Orders_courier_idToUsers as Users} className="w-full" />}

        {!assertions.isFinalized && <LeafletDeliveryTracker order={selectedOrder} />}

        {(isCancelling)
            ? <>
                <div className="w-full flex flex-row justify-between items-center">
                    <h3>Cancelar pedido</h3>

                    <Button variant="secondary" className="ml-auto" onClick={() => toggleIsCancelling(false)} disabled={(state as any) === "cancelling"}>
                        <Icon name="Close" />
                    </Button>
                </div>

                <form onSubmit={PATCH} className="w-full flex flex-col justify-start items-center gap-1">
                    {error && <p className="w-full text-center">
                        <Icon name="ExclamationCircle" className="inline-block" />

                        {error?.message}
                    </p>}

                    <label className="w-full flex flex-col justify-start items-start">
                        <span className="text-base">
                            <Icon name="Notes" className="inline mr-2" />

                            Motivo
                        </span>

                        <textarea
                            className="w-full mt-1"
                            name="notes"
                            title="Motivo do cancelamento"
                            placeholder="Motivo do cancelamento"
                            required
                        />
                    </label>

                    <Button type="submit" variant="danger" className="w-full" disabled={(state as any) === "cancelling"}>
                        Cancelar

                        {((state as any) === "cancelling") && <Icon name="Loading" className="animate-spin" />}
                    </Button>
                </form>
            </>

            : <>
                <h3>Pedido</h3>

                <OrderItemsList items={[...selectedOrder.Order_Items]} className="w-full flex flex-col justify-start items-start gap-2" />
            </>
        }

        {(!isCancelling && !assertions.isFinalized) && <Button variant="danger" className="mr-auto" onClick={handleCancellation}>
            Cancelar o meu pedido

            <Icon name="Trash" />
        </Button>}
    </div>
};

export default OrderSummaryView;