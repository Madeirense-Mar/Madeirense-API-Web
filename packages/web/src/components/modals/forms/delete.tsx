import {
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
    formatNumber
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useFlasher } from "contexts/Flasher";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
    item: itemType;
    itemId: number;
    requireAuthentication?: boolean;
};

interface IListPropTypes extends ComponentProps<"ul"> {
    item: itemType;
};

type itemType = (
    | "event"
    | "profile"
    | "product"
    | "order"
    | "user"
);

const List = ({
    item,
    ...props
}: IListPropTypes) => {
    switch (item) {
        case "event": {
            return <ul {...props}>
                <li>Ver os pedidos, pagamentos e lista de ingressos comprados</li>
            </ul>
        };

        case "profile": {
            return <ul {...props}>
                <li>Ver os seus pedidos entregues/cancelados</li>
                <li className="ml-4 italic">Nota: Caso tenha algum pedido a decorrer, faremos a entrega e só depois é que iremos proceder com a elinimação dos seus dados</li>
                <li>Usufruir de descontos, cupons, pontos e/ou dinheiro virtual que tem registado na conta</li>
                <li>Ver a lista de pedidos favoritos que guardou</li>
            </ul>
        };

        case "product": {
            return <ul {...props}>
                <li data-state="warning" className="italic p-2 rounded-md border">Nota: Devido o cálculo de lucro e entregas, tirando os comentários que são eliminados permanentemente, os produtos são ocultados de listagens publicas.</li>
                <li>Listar o produto no menu ou em eventos/promoções</li>
            </ul>
        };

        case "order": {
            return <ul {...props}>
                <li>Ver o histórico</li>
                <li>Ver as conversas do chat</li>
            </ul>
        };

        case "user": {
            return <ul {...props}>
                <li>Ver os pedidos, processos e histórico que envolvem esta utilizador</li>
            </ul>
        };

        default: return null;
    }
};

const DeletionForm = ({
    callback,
    item,
    itemId,
    requireAuthentication = false,
    ...props
}: IPropTypes) => {
    const CERTAINTY_KEY = "Tenho a certeza";

    const {
        get,
        remove
    } = useApp();

    const { flash } = useFlasher();

    const {
        deleteProfile,
        user
    } = useProfile();

    const { eject } = useModal();

    const navigate = useNavigate();

    const {
        authentication,
        "restaurant-events": restaurantEvents,
        orders,
        users
    } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<undefined>>({
        data: undefined,
        status: "idle",
        error: null
    });

    const {
        data,
        isFetching
    } = useQuery({
        queryKey: ["App$GetUserProcesses", itemId],
        queryFn: ({ queryKey }) => users.getOngoingProcess(queryKey[1] as number),
        enabled: ["profile", "user"].includes(item)
    })

    const {
        error,
        status
    } = form;

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);
        const $submitter = ((e.nativeEvent as any).submitter as HTMLButtonElement);

        updateForm(f => { return { ...f, status: "loading" } });

        try {
            switch ($submitter.value as ("certainty" | "authenticate")) {
                case "authenticate": await authentication.login({
                    email: user?.email as string,
                    password: $form_data.get("password") as string
                }); break;

                default: break;
            };

            switch (item) {
                case "event": await restaurantEvents.delete(itemId); break;

                case "order": await orders.delete(itemId); break;

                case "product": await remove("Products", itemId); break;

                case "profile":
                    flash("GOODBYE");

                    navigate("/", { replace: true });

                    await deleteProfile();

                    break;

                case "user": await users.delete(itemId); break;

                default: break;
            };

            callback?.();

            eject();
        } catch (error) {
            updateForm(f => { return { ...f, status: "error", error: new Error((error as Error).message) } });
        }
    };

    const assertions = {
        "hasOngoingProcesses": (isFetching || !data) ? false : (
            data.processes.deliveries.length > 0
        ),
    };

    return <form
        className="w-full h-full flex flex-col justify-start items-start gap-3"
        onSubmit={(assertions.hasOngoingProcesses) ? undefined : PATCH}
        {...props}
    >
        <h3 className="text-lg font-semibold">Tem a certeza?</h3>

        <p>Esta ação é irreversível, saiba que depois dela não poderá:</p>

        <List className="list-disc w-full border-t border-b p-4" {...{ item }} />

        <fieldset className="w-full">
            {(assertions.hasOngoingProcesses)
                ? <>
                    <h4>Processos a decorrer</h4>

                    <ul className="border-t border-b p-3 w-full">
                        {(data?.processes.deliveries ?? []).length > 0 && <>
                            <li className="w-full flex flex-row justify-start items-center gap-2">
                                <Icon name="Delivery" />

                                Entregas
                            </li>

                            {(data?.processes.deliveries ?? []).map(delivery => <li key={delivery.order_id} className="w-full flex flex-row justify-start items-center gap-2">
                                <Tag>
                                    Pedido #{delivery.order_id}
                                </Tag>

                                <Tag>
                                    <Icon name="Store" />

                                    {get("Restaurants")?.find(r => r.restaurant_id === delivery.order_id)?.name}
                                </Tag>

                                <span className="font-bold ml-auto">
                                    {formatNumber(parseFloat(`${delivery.total_amount}`))}
                                </span>
                            </li>)}
                        </>}
                    </ul>
                </>

                : <label data-state="warning" className="w-full flex flex-col justify-center items-center p-3 rounded-md border border-dashed">
                    <span className="text-base">
                        {(requireAuthentication)
                            ? <>Valide esta ação com a sua password.</>
                            : <>Escreva <span className="font-bold text-base">"{CERTAINTY_KEY}"</span> para finalizar a ação.</>
                        }
                    </span>

                    {(requireAuthentication)
                        ? <input
                            className="w-full mt-1 text-center"
                            type="password"
                            name="password"
                            title="Password"
                            required
                        />

                        : <input
                            className="w-full mt-1 text-center"
                            name="certainty"
                            title="Motivo"
                            pattern={CERTAINTY_KEY}
                            placeholder={CERTAINTY_KEY}
                            required
                        />}
                </label>}
        </fieldset>

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

            {(assertions.hasOngoingProcesses)
                ? <Button type="button" variant="warning" className="w-full mt-auto">
                    <Icon name="Warning" />

                    Só poderá eliminar o utilizador depois de todos os processos terem terminado
                </Button>

                : <Button type="submit" value={requireAuthentication ? "authenticate" : "certainty"} disabled={status === "loading"} variant="danger" className="w-full">
                    {requireAuthentication
                        ? "Validar"
                        : <>
                            Tenho a certeza!

                            {status === "loading" && <Icon name="Loading" className="animate-spin" />}
                        </>}
                </Button>
            }
        </div>
    </form>
};

export default DeletionForm;