import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import MXP$App from "configurations";

import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    item: itemType;
    itemId: number;
    callback?: () => void;
};

interface IListPropTypes extends ComponentProps<"ul"> {
    item: itemType;
};

type itemType = (
    | "event"
    | "order"
);

const List = ({
    item,
    ...props
}: IListPropTypes) => {
    switch (item) {
        case "order": {
            return <ul {...props}>
                <li>Avaliar o serviço de entregae e os produtos, pois não os recebeu</li>
                <li>Enviar mensagens parar o chat</li>
            </ul>
        };

        case "event": {
            return <ul {...props}>
                <li>Confirmar ingressos <span className="italic opacity-45">(Será feita uma devolução automática de todos os ingressos comprados)</span></li>
            </ul>
        };

        default: return null;
    }
};

const CancelForm = ({ callback, item, itemId, ...props }: IPropTypes) => {
    const CERTAINTY_KEY = "Tenho a certeza";

    const { eject } = useModal();

    const {
        "restaurant-events": restaurantEvents,
        orders
    } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<undefined>>({
        data: undefined,
        status: "idle",
        error: null
    });

    const { error, status } = form;

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        updateForm(f => { return { ...f, status: "loading" } });

        try {
            switch (item) {
                case "event": await restaurantEvents.cancel(itemId); break;
                case "order": await orders.cancel(itemId, ""); break;

                default: break;
            }

            eject(callback);
        } catch (error) {
            updateForm(f => { return { ...f, status: "error", error: new Error((error as Error).message) } });
        }
    }

    return <form onSubmit={PATCH} className="w-full h-full flex flex-col justify-start items-start gap-3" {...props}>
        <h3 className="text-lg font-semibold">Tem a certeza?</h3>

        <p>Esta ação é irreversível, saiba que depois dela não poderá:</p>

        <List className="list-disc w-full border-t border-b p-4" {...{ item }} />

        <fieldset className="w-full">
            <label data-state="warning" className="w-full flex flex-col justify-center items-center p-3 rounded-md border border-dashed">
                <span className="text-base">
                    Escreva <span className="font-bold text-base">"{CERTAINTY_KEY}"</span> para finalizar a ação.
                </span>

                <input
                    className="w-full mt-1 text-center"
                    name="certainty"
                    title="Motivo"
                    pattern={CERTAINTY_KEY}
                    placeholder={CERTAINTY_KEY}
                    required
                />
            </label>
        </fieldset>

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

            <Button type="submit" disabled={status === "loading"} variant="warning" className="w-full">
                Tenho a certeza!

                {status === "loading" && <Icon name="Loading" className="animate-spin" />}
            </Button>
        </div>
    </form>
};

export default CancelForm;