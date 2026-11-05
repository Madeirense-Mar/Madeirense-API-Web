import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent,
} from "react";

import {
    type restaurantOrderType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";
import DriversPicker from "components/pickers/drivers";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: (o: restaurantOrderType) => void;
    order: restaurantOrderType;
};

const DriverAssignationForm = ({
    callback,
    order,
    ...props
}: IPropTypes) => {
    const { eject } = useModal();

    const { orders } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<undefined>>({
        data: undefined,
        status: "idle",
        error: null
    });

    const { error, status } = form;


    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);

        updateForm(f => { return { ...f, status: "loading" } });

        try {
            const _order = await orders.assignOrderToDriver(
                order.order_id,
                {
                    restaurant_id: order.restaurant_id as number,
                    courier_id: parseInt($form_data.get("courier_id") as string)
                }
            );

            if (!_order) throw new Error("Unable to assign driver to a new order");

            eject(() => callback?.(_order));
        } catch (error) {
            updateForm(f => {
                return {
                    ...f,
                    status: "error",
                    error: new Error((error as Error).message)
                }
            });
        }
    }

    return <form onSubmit={PATCH} className="w-full h-full flex flex-col justify-start items-start gap-3" {...props}>
        <DriversPicker className="w-full" required />

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

            <Button type="submit" disabled={status === "loading"} className="w-full">
                Escolher estafeta

                {status === "loading" && <Icon name="Loading" className="animate-spin" />}
            </Button>
        </div>
    </form>
};

export default DriverAssignationForm;