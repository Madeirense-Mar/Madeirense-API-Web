import {
    ComponentProps,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type SubmitEvent,
    type KeyboardEvent
} from "react";

import {
    DEFAULT_APP_SETTINGS,
    getLabel,
    type restaurantType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";

import PaymentTypesList from "components/lists/paymentOptions";

import type {
    $Enums,
    Global_Settings,
    Restaurants
} from "@Madeirense/database/browser";

import type { IPageState } from "components/interface";

// ***************************************************************************************************************

const delayMS = 2500;

function BackOfficeSettingsPage(props: ComponentProps<"main">) {
    const {
        "global-settings": globalSettings
    } = MXP$App.Base.Business.endpoints;

    const {
        fetch,
        get,
        state: appState,
        update_BATCH,
        update_PARTIAL
    } = useApp();

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [page, updatePage] = useState<IPageState<undefined, (
        | "orders"
        | "time"
        | "ttd"
        | "ttp"
        | `ttd-${number}`
        | `ttp-${number}`
        | `payments`
        | keyof Omit<Global_Settings, "setting_id">
    )>>({
        data: undefined,
        error: null,
        status: "idle"
    });

    const restaurants = useMemo(() => get("Restaurants") ?? [], [get]);
    const settings = useMemo(() => get("Global_Settings"), [get]);

    const avgTTD = useMemo(() => Math.min(...(restaurants ?? []).map(({ ttd = 0 }) => ttd)) || DEFAULT_APP_SETTINGS.avg_ttd, [restaurants]);
    const avgTTP = useMemo(() => Math.min(...(restaurants ?? []).map(({ ttp = 0 }) => ttp)) || DEFAULT_APP_SETTINGS.avg_ttp, [restaurants]);

    const assertions = {
        "isLoading": [
            [
                "loading"
            ].includes(appState),
            [
                "fetching",
                "updating"
            ].some(s => appState.includes(s))
        ].includes(true)
    };

    function getUpdaterStatusIndicator(...properties: (typeof page.status)[]) {
        if (properties.includes(page.status)) return (page.error)
            ? <Icon name="Close" />

            : (assertions.isLoading)
                ? <Icon name="Check" />
                : <Icon name="Loading" className="animate-spin" />
            ;

        else return null;
    };

    function handleEvent(e: any) { update(e.target); };

    function pressEnterToSubmit(e: KeyboardEvent<(HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)>) {
        if (e.key.toLowerCase() !== "enter") return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const $form = (e.target as (
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
        )).form as HTMLFormElement;

        if (!$form) return;

        updatePage(p => ({
            ...p,
            status: "idle"
        }));

        $form.dispatchEvent(new Event("submit", { bubbles: true }));
    };

    function handleFormReset(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
    };

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key.toLowerCase() !== "enter") return;

        update(e.target, 0);
    };

    function handleSubmitOnChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const $form = (e.target as (
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
        )).form as HTMLFormElement;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (!$form) return;

        updatePage(p => ({ ...p, status: "idle" }));

        timeoutRef.current = setTimeout(async () => {
            $form.dispatchEvent(new Event("submit", { bubbles: true }));
        }, delayMS);
    };

    function update(element: any, delay = delayMS) {
        const _value = element.value;
        const property = element.name as (typeof page.status);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (_value === "") return;

        timeoutRef.current = setTimeout(async () => {
            try {
                updatePage(p => ({ ...p, status: property, error: null }));

                switch (true) {
                    case (["ttd", "ttp"].some(s => property.includes(s))): switch (true) {
                        case (property.includes("-")):
                            const [
                                restaurant_property,
                                restaurant_id
                            ] = property.split("-") as [keyof Restaurants, string];

                            if (parseInt(_value, 10) === (restaurants.find(({ restaurant_id: rId }) => rId.toString() === restaurant_id) as restaurantType)[restaurant_property])
                                break;

                            await update_PARTIAL({
                                id: parseInt(restaurant_id) as number,
                                property: "Restaurants",
                                payload: {
                                    [restaurant_property]: parseInt(_value)
                                }
                            });

                            break;

                        default:
                            break;
                    }; break;

                    default: switch (property) {
                        case "auto_assign_driver":
                            if (`${(element as HTMLInputElement).checked}` === `${settings?.auto_assign_driver}`) break;

                            await update_PARTIAL({
                                id: settings?.setting_id as number,
                                property: "Global_Settings",
                                payload: {
                                    [property]: (element as HTMLInputElement).checked
                                }
                            });

                            break;
                        case "order_threshold":
                            if (parseInt(_value, 10) === settings?.order_threshold) break;

                            await update_PARTIAL({
                                id: settings?.setting_id as number,
                                property: "Global_Settings",
                                payload: {
                                    [property]: parseInt(_value)
                                }
                            });

                            break;

                        case "time":
                            break;

                        default:
                            if (_value === "") return;

                            break;
                    }; break;
                }

                updatePage(p => ({ ...p, status: "idle", error: null }));
            } catch (error) {
                updatePage(p => ({ ...p, status: property, error: new Error((error as Error).message) }));
            }
        }, delay);
    };

    async function PATCH_POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);
        // const $submitter = ((e.nativeEvent as any).submitter as HTMLButtonElement);

        try {
            updatePage(p => ({ ...p, status: ($form.id as (typeof page.status)), error: null }));

            switch ($form.id as (typeof page.status)) {
                case "payments":
                    await globalSettings.updateEligiblePayments({
                        setting_id: settings?.setting_id as number,
                        payments: $form_data.getAll("payment_method") as $Enums.Global_Settings_Eligible_Payment_Types_payment_method[]
                    });

                    await fetch("Global_Settings");

                    break;

                case "time":
                    const ttd = parseInt($form_data.get("ttd") as string);
                    const ttp = parseInt($form_data.get("ttp") as string);

                    await update_BATCH({
                        property: "Restaurants",
                        payload: {
                            ttd,
                            ttp
                        }
                    });

                    await update_PARTIAL({
                        id: settings?.setting_id as number,
                        property: "Global_Settings",
                        payload: {
                            avg_ttd: ttd,
                            avg_ttp: ttp
                        }
                    });

                    Array.from($form.elements)
                        .filter(element => element?.tagName === "INPUT")
                        .forEach(element => {
                            switch (true) {
                                case (element as HTMLInputElement).name.includes("ttd"): (element as HTMLInputElement).value = $form_data.get("ttd") as string; break;

                                case (element as HTMLInputElement).name.includes("ttp"): (element as HTMLInputElement).value = $form_data.get("ttp") as string; break;

                                default: break;
                            }
                        });

                    break;

                default:
                    break;
            };

            updatePage(p => ({ ...p, status: "idle", error: null }));
        } catch (error) {
            updatePage(p => ({ ...p, error: new Error((error as Error).message) }));
        }
    };

    useEffect(() => {
        const tRef = timeoutRef.current;

        return () => { if (tRef) clearTimeout(tRef); }
    }, []);

    return <main {...props}>
        <header className="w-full flex flex-row justify-between items-center mb-4">
            <h1>Definições</h1>
        </header>

        <section className="w-full">
            <header className="flex flex-row justify-start items-center gap-2 font-black text-3xl pb-2 mb-2 border-b border-solid w-full">
                {page.status === "orders" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Order" />}

                <h2>Pedidos</h2>
            </header>

            <form id={"orders" as (typeof page.status)} onSubmit={PATCH_POST} onReset={handleFormReset} className="w-full flex flex-col justify-start items-start gap-10" data-state={page.status === "orders" ? "disabled" : "idle"}>
                <fieldset className="flex flex-col justify-start items-start gap-2 w-full">
                    <legend className="flex flex-row justify-start items-center gap-2 text-l pb-2 mb-2 w-full">
                        <Icon name="Queue" />

                        Fila

                        <span className="ml-auto font-normal italic">Definições da fila de pedidos</span>
                    </legend>

                    <label className="flex flex-row justify-between items-start w-full gap-10">
                        <div className="flex flex-col justify-start items-start gap-2">
                            <span className="text-xl">Limite para aviso</span>

                            {(page.error && (page.status === "order_threshold")) && <span data-state="error" className="font-normal px-2 rounded-sm">
                                {page.error.message}
                            </span>}

                            <span className="font-normal opacity-60">Número de pedidos em fila <span className="font-normal italic">(individual para cada restaurante)</span> que serão entregues no tempo esperado, caso os pedidos excedam o limite os clientes serão notificados sobre possíveis atrasos.</span>
                        </div>

                        <div className="flex flex-row justify-center items-center gap-1 min-w-[152px] max-w-[152px] w-[152px]">
                            {getUpdaterStatusIndicator("order_threshold")}

                            {(appState === "loading")
                                ? <input type="text" defaultValue="a carregar" className="w-full text-center" disabled />
                                : settings && <input min={1} name="order_threshold" type="number" defaultValue={settings.order_threshold} className="w-full text-center" onKeyDown={handleKeyDown} onBlur={handleEvent} />
                            }
                        </div>
                    </label>
                </fieldset>

                <fieldset className="flex flex-col justify-start items-start gap-2 w-full">
                    <legend className="flex flex-row justify-start items-center gap-2 text-l pb-2 mb-2 w-full">
                        <Icon name="FlashAuto" />

                        Ações e automação

                        <span className="ml-auto font-normal italic">Definição das funcionalidades do aplicativo</span>
                    </legend>

                    <label className="flex flex-row justify-between items-start w-full gap-10">
                        <div className="flex flex-col justify-start items-start gap-2">
                            <span className="text-xl">Associação automática</span>

                            {(page.error && (page.status === "auto_assign_driver")) && <span data-state="error" className="font-normal px-2 rounded-sm">
                                {page.error.message}
                            </span>}

                            <span className="font-normal opacity-60">
                                Associa todos os pedidos que estiverem no estado

                                <span className="mx-2 italic underline">{getLabel<$Enums.Orders_status>("ready")}</span>

                                a um estafeta livre e próximo ao restaurante sem precisar de uma ação manual.
                            </span>
                        </div>

                        <div className="flex flex-row justify-center items-center gap-1 min-w-[152px] max-w-[152px] w-[152px]">
                            {getUpdaterStatusIndicator("auto_assign_driver")}

                            {(appState === "loading")
                                ? <input type="text" defaultValue="a carregar" className="w-full text-center" disabled />
                                : settings && <input type="checkbox" name="auto_assign_driver" defaultChecked={settings.auto_assign_driver ?? false} className="w-full text-center" onChange={handleEvent} />
                            }
                        </div>
                    </label>
                </fieldset>
            </form>
        </section>

        <section className="w-full">
            <header className="flex flex-row justify-start items-center gap-2 font-black text-3xl pb-2 mb-2 border-b border-solid w-full">
                {page.status === "time" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Time" />}

                <h2>Tempo</h2>
            </header>

            {(page.error && ((["time"] as (typeof page.status)[]).includes(page.status as (typeof page.status)))) && <span
                data-state="error"
                className="font-normal px-2 rounded-sm"
            >
                {page.error.message}
            </span>}

            <form id={"time" as (typeof page.status)} onSubmit={PATCH_POST} onReset={handleFormReset} className="w-full flex flex-col justify-start items-start gap-10" data-state={page.status === "time" ? "disabled" : "idle"}>
                <fieldset className="flex flex-col justify-start items-start gap-2 w-full">
                    <legend className="flex flex-row justify-start items-center gap-2 text-l pb-2 mb-2 w-full">
                        <Icon name="KitchenSet" />

                        Cozinha

                        <span className="ml-auto font-normal italic">Tempo médio de preparo geral para todos pratos</span>
                    </legend>

                    <label className="flex flex-row justify-between items-start w-full gap-10">
                        <div className="flex flex-col justify-start items-start gap-2">
                            <span className="text-xl">Tempo médio</span>

                            {(page.error && (page.status === "prep_buffer")) && <span data-state="error" className="font-normal px-2 rounded-sm">
                                {page.error.message}
                            </span>}

                            <span className="font-normal opacity-60">Tempo <span className="font-normal italic">(em minutos)</span> adicional ao preparo de cada pedido pela cozinha.</span>
                        </div>

                        <div className="flex flex-row justify-center items-center gap-1 min-w-[152px] max-w-[152px] w-[152px]">
                            {getUpdaterStatusIndicator("prep_buffer")}

                            {(appState === "loading")
                                ? <input type="text" defaultValue="a carregar" className="w-full text-center" disabled />
                                : settings && <input min={1} name="prep_buffer" type="number" defaultValue={settings.prep_buffer} className="w-full text-center" onKeyDown={handleKeyDown} onBlur={handleEvent} />
                            }
                        </div>
                    </label>
                </fieldset>

                <fieldset className="flex flex-col justify-start items-start gap-2 w-full">
                    <legend className="flex flex-row justify-start items-center gap-2 text-l pb-2 mb-2 w-full">
                        <Icon name="Kitchen" />

                        Preparo e entrega

                        <span className="ml-auto font-normal italic">Tempos relevantes à experiência do cliente, informação sobre tempo de espera</span>
                    </legend>

                    {(page.error && ((["ttd", "ttp"] as (typeof page.status)[]).some(s => (page.status as (typeof page.status)).includes(s)))) && <span
                        data-state="error"
                        className="font-normal px-2 rounded-sm"
                    >
                        {page.error.message}
                    </span>}

                    <table>
                        <thead>
                            <tr className="italic font-semibold border-b border-solid border-black/20 opacity-70">
                                <td className="w-full p-2">
                                    <Icon name="Store" className="inline-block mr-2" />

                                    Restaurante
                                </td>

                                <td className="p-2 whitespace-nowrap border-r border-solid border-black/20">
                                    <Icon name="HourglassRunning" className="inline-block mr-2" />

                                    Tempo de preparo (minutos)
                                </td>

                                <td className="p-2 whitespace-nowrap">
                                    <Icon name="Timer" className="inline-block mr-2" />

                                    Tempo de entrega (minutos)
                                </td>
                            </tr>
                        </thead>

                        <tfoot className="opacity-60 hover:opacity-100">
                            <tr className="italic font-semibold border-t border-solid border-black/20 opacity-70">
                                <td className="w-full p-2 border-r border-solid border-black/20">
                                    Definir para todos
                                </td>

                                <td className="p-2 border-r border-solid border-black/20">
                                    <div className="w-full flex flex-row justify-center items-center gap-1">
                                        {getUpdaterStatusIndicator(`ttp`)}

                                        <input min={1} name="ttp" type="number" defaultValue={avgTTP} className="w-full text-center" onKeyDown={pressEnterToSubmit} onChange={handleSubmitOnChange} required />
                                    </div>
                                </td>

                                <td className="p-2 whitespace-nowrap">
                                    <div className="w-full flex flex-row justify-center items-center gap-1">
                                        {getUpdaterStatusIndicator(`ttd`)}

                                        <input min={1} name="ttd" type="number" defaultValue={avgTTD} className="w-full text-center" onKeyDown={pressEnterToSubmit} onChange={handleSubmitOnChange} required />
                                    </div>
                                </td>
                            </tr>
                        </tfoot>

                        <tbody>
                            {restaurants.map(r => <tr key={r.restaurant_id} className="hover:bg-gray-300/20">
                                <td className="px-2 w-full font-semibold italic border-r border-solid border-black/20">
                                    {r.name}
                                </td>

                                <td className="p-2 border-r border-solid border-black/20">
                                    <div className="w-full flex flex-row justify-center items-center gap-1">
                                        {getUpdaterStatusIndicator(`ttp-${r.restaurant_id}`)}

                                        {(appState === "loading")
                                            ? <input type="text" defaultValue="a carregar" className="w-full text-center" disabled />
                                            : <input min={1} name={`ttp-${r.restaurant_id}`} type="number" defaultValue={r.ttp} className="w-full text-center" onKeyDown={handleKeyDown} onBlur={handleEvent} />
                                        }
                                    </div>
                                </td>

                                <td className="p-2">
                                    <div className="w-full flex flex-row justify-center items-center gap-1">
                                        {getUpdaterStatusIndicator(`ttd-${r.restaurant_id}`)}

                                        {(appState === "loading")
                                            ? <input type="text" defaultValue="a carregar" className="w-full text-center" disabled />
                                            : <input min={1} name={`ttd-${r.restaurant_id}`} type="number" defaultValue={r.ttd} className="w-full text-center" onKeyDown={handleKeyDown} onBlur={handleEvent} />
                                        }
                                    </div>
                                </td>
                            </tr>)}
                        </tbody>
                    </table>
                </fieldset>
            </form>
        </section>

        <section className="w-full">
            <header className="flex flex-row justify-start items-center gap-2 font-black text-3xl pb-2 mb-2 border-b border-solid w-full">
                {page.status === "payments" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Money" />}

                <h2>Pagamentos</h2>
            </header>

            {(page.error && ((["payments"] as (typeof page.status)[]).includes(page.status as (typeof page.status)))) && <span
                data-state="error"
                className="font-normal px-2 rounded-sm"
            >
                {page.error.message}
            </span>}

            <form id={"payments" as (typeof page.status)} onSubmit={PATCH_POST} onReset={handleFormReset} className="w-full flex flex-col justify-start items-start gap-10" data-state={page.status === "time" ? "disabled" : "idle"}>
                <fieldset className="flex flex-col justify-start items-start gap-2 w-full">
                    <legend className="flex flex-row justify-start items-center gap-2 text-l pb-2 mb-2 w-full">
                        <Icon name="CashRegister" />

                        Tipos de pagamento

                        <span className="ml-auto font-normal italic">Modalidades de pagamentos aceites pelo restaurante. Seleccione os métodos elegíveis.</span>
                    </legend>

                    <PaymentTypesList
                        className="w-full"
                        mode="default"
                        hiddenItems={["Offer"]}
                        selectedItems={(settings?.Global_Settings_Eligible_Payment_Types ?? []).map(({ payment_method }) => payment_method)}
                        selectionMode="checkbox"
                        selectable
                    />
                </fieldset>

                <Button type="submit" disabled={(page.status === "payments")} className="w-full">
                    <Icon name="Save" />

                    Salvar definição dos pagamentos
                </Button>
            </form>
        </section>
    </main>
};

export default BackOfficeSettingsPage;