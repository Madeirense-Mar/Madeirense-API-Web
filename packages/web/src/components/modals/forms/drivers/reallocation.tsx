import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    type restaurantOrderType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import ProfileHeaderCard from "components/cards/profileHeader";
import Icon from "components/icon";
import DriversPicker from "components/pickers/drivers";

import type { Users } from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
    currentDriver: Users;
    order: restaurantOrderType;
};

const DriverReallocationForm = ({
    callback,
    currentDriver,
    order,
    ...props
}: IPropTypes) => {
    const { fetch } = useApp();
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
            await orders.reallocateDriver(
                order.order_id,
                {
                    restaurant_id: order.restaurant_id as number,
                    courier_id: parseInt($form_data.get("courier_id") as string),
                    notes: $form_data.get("notes") as string
                }
            );

            await fetch("Drivers");

            eject(callback);
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
        <ProfileHeaderCard user={currentDriver} className="w-full" />

        <div className="w-full flex flex-row justify-center items-center gap-2">
            <hr className="h-[1px] w-full" />

            <span>Por</span>

            <hr className="h-[1px] w-full" />
        </div>

        <fieldset className="w-full">
            <legend className="text-lg font-semibold">Escolher estafeta para o pedido #{order.order_id}</legend>

            <DriversPicker className="w-full" required />
        </fieldset>

        <hr className="h-[1px] w-full" />

        <fieldset className="w-full">
            <legend className="text-lg font-semibold">Motivo de re-alocação</legend>

            <label className="w-full flex flex-col justify-start items-start">
                <span className="text-base">
                    <Icon name="Notes" className="inline mr-2" />

                    Motivo:
                </span>

                <textarea
                    className="w-full mt-1"
                    name="notes"
                    title="Motivo"
                    placeholder="..."
                    required
                />
            </label>
        </fieldset>

        <hr className="h-[1px] w-full" />

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

export default DriverReallocationForm;