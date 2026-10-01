import {
    useCallback,
    useMemo,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    API$Enumerators,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import type {
    Coupons
} from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

const CouponForm = ({
    callback,
    ...props
}: {
    callback?: () => void
} & ComponentProps<"form">) => {
    const { state, create, fetch, get } = useApp();

    const { coupons } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [searchKey, setSearchKey] = useState("");
    const [mode, switchMode] = useState<("add" | "renew")>("renew");
    const [form, updateForm] = useState<IComponentState<string>>({ data: "", status: "idle", error: null });

    const { error, status } = form;

    const FILTER_ARRAY_BY_SEARCH_KEY = useCallback(({ code }: Coupons) => searchKey === "" ? true : code.toLocaleUpperCase().includes(searchKey.toLocaleUpperCase()), [searchKey]);

    const activeCoupons = useMemo(() => (get("Coupons")?.filter(({ expires_at }) => new Date(expires_at) > new Date()).filter(FILTER_ARRAY_BY_SEARCH_KEY)) ?? [], [get, FILTER_ARRAY_BY_SEARCH_KEY]);
    const expiredCoupons = useMemo(() => (get("Coupons")?.filter(({ expires_at }) => new Date(expires_at) < new Date()).filter(FILTER_ARRAY_BY_SEARCH_KEY)) ?? [], [get, FILTER_ARRAY_BY_SEARCH_KEY]);

    const IS_EMPTY = [activeCoupons.length, expiredCoupons.length].every(v => v === 0);
    const IS_LOADING = (state.includes("Coupons") || state === "loading");

    function updateSearchKey(e: ChangeEvent<HTMLInputElement>) {
        setSearchKey(e.target.value as any);
    };

    function selectFormMode(e: ChangeEvent<HTMLInputElement>) {
        switchMode(e.target.value as any);
    };

    async function PATCH_POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);
        const $submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;

        try {
            updateForm(f => ({ ...f, error: null, status: "loading" }));

            switch ($submitter.value as ("EXPIRE" | "POST" | "PATCH")) {
                case "EXPIRE":
                case "PATCH":
                    let expires_at: string = "";

                    const coupon_ids = ($form_data.getAll("coupon_ids") as string[]).map(Number);

                    if (coupon_ids.length === 0) throw new Error("Deve seleccionar no mínimo 1 cupon");

                    const operation = (() => {
                        switch ($submitter.value as ("EXPIRE" | "PATCH")) {
                            case "EXPIRE": return "expire";

                            default: return "renew";
                        }
                    })();

                    switch (operation) {
                        case "renew":
                            if ($form_data.get("expires_at") === "") throw new Error("Deve escolher uma nova data de expiração");

                            expires_at = new Date($form_data.get("expires_at") as string).toISOString()

                            break;

                        default:
                            break;
                    };

                    await coupons.batchOperations(
                        API$Enumerators.BatchActions[operation],
                        {
                            body: {
                                coupon_ids,
                                ...(operation === "renew" ? { expires_at } : {})
                            }
                        }
                    );

                    await fetch("Coupons");

                    $form.reset();

                    break;

                case "POST":
                    await create({
                        property: "Coupons",
                        payload: {
                            code: $form_data.get("code") as string,
                            discount: parseFloat($form_data.get("coupon-discount") as string),
                            expires_at: new Date($form_data.get("expires_at") as string)
                        }
                    });

                    document.getElementById("renew")?.click();

                    break;

                default:
                    break;
            };

            callback?.();

            updateForm(f => ({ ...f, status: "success" }));
        } catch (error) {
            updateForm(f => ({ ...f, error: new Error((error as Error).message), status: "error" }));
        } finally {
            setTimeout(() => updateForm(f => ({ ...f, status: "idle" })), 10000);

            setSearchKey("");
        }
    };

    return <form data-state={(IS_LOADING || status === "loading") ? "disabled" : "idle"} onSubmit={PATCH_POST} className="h-full w-full flex flex-col justify-start items-start gap-4 p-3" {...props}>
        {(status === "success") && <div data-state="success" className="w-full flex flex-row justify-center items-center gap-2">
            <Icon name="Check" />

            Pedido processado com successo!
        </div>}

        <div className="w-full flex flex-row justify-between items-center gap-1">
            <label data-variant="selectable" htmlFor="renew" className="w-full border p-2 rounded-lg">
                <input id="renew" type="radio" name="mode" defaultChecked={mode === "renew"} value="renew" onChange={selectFormMode} className="mr-auto" />

                <Icon name="Update" />

                <span>Atualizar cupons</span>
            </label>

            <label data-variant="selectable" htmlFor="add" className="w-full border p-2 rounded-lg">
                <input id="add" type="radio" name="mode" defaultChecked={mode === "add"} value="add" onChange={selectFormMode} className="mr-auto" />

                <Icon name="Add" />

                <span>Criar cupon</span>
            </label>
        </div>

        {(mode === "add") && <fieldset className="w-full flex flex-col justify-start items-start gap-3 rounded-md">
            <legend>Criar cupon</legend>

            <label htmlFor="code" className="text-lg w-full flex flex-row justify-start items-center gap-2">
                <Icon name="Coupon" />

                <span>
                    Códido

                    <span className="italic opacity-30 ml-1 text-sm">(exe. MADEIRENSE-CÓDIGO-CUPON)</span>
                </span>

                <input title="Código de cupon" id="code" name="code" className="ml-auto w-[252px] text-center" placeholder="Código de cupon" type="text" data-element="h3" required />
            </label>

            <label htmlFor="coupon-discount" className="text-lg w-full flex flex-row justify-start items-center gap-2">
                <Icon name="Discount" />

                <span>Desconto</span>

                <input title="Desconto" id="coupon-discount" name="coupon-discount" className="ml-auto w-[252px] text-center" placeholder="Percentagem" type="number" data-element="h3" required />
            </label>

            <label htmlFor="expires_at" className="text-lg w-full flex flex-row justify-start items-center gap-2">
                <Icon name="Calendar1" />

                <span>Data de expiração</span>

                <input min={new Date().toISOString().split('T')[0]} title="Nova data de expiração" id="expires_at" name="expires_at" className="ml-auto w-[252px] text-center" placeholder="Data de expiração" type="date" data-element="h3" required />
            </label>
        </fieldset>}

        {(mode === "renew") && <fieldset className="w-full flex flex-col justify-start items-start gap-11 rounded-md">
            <legend className="flex flex-row justify-start items-center gap-2">
                Cupons

                {(IS_LOADING) && <Icon name="Loading" className="animate-spin" />}
            </legend>

            <label htmlFor="search" className="w-full flex flex-row justify-start items-center gap-2">
                <Icon name="Search" />

                <input title="Pesquisa" id="search" name="search" className="w-full" placeholder="..." type="text" onChange={updateSearchKey} />
            </label>

            <ul className="w-full flex flex-col justify-start items-start">
                {(IS_EMPTY) && <li className="w-full flex flex-row justify-center items-center italic opacity-40">
                    {`${searchKey === "" ? "Sem cupons criados" : `Nenhum cupon corresponde à chave "${searchKey}"`}`}
                </li>}

                {Boolean(activeCoupons.length) && <li className="w-full gap-2 rounded-md border p-1 font-black flex flex-row justify-start items-center">
                    <Icon name="Check" />

                    Ativos
                </li>}

                {activeCoupons.map(c => <li key={c.coupon_id} className="w-full gap-2 p-1 pl-4 flex flex-row justify-start items-center hover:bg-gray-400/20">
                    <input id={`${c.coupon_id}-coupon`} type="checkbox" value={c.coupon_id} name="coupon_ids" />

                    <label htmlFor={`${c.coupon_id}-coupon`} className="cursor-pointer w-full gap-2 flex flex-row justify-start items-center">
                        <Icon name="Coupon" />

                        <span className="italic">{c.code}</span>

                        <Tag variant="success" className="ml-auto">
                            <Icon name="Discount" />

                            {`${c.discount}%`}
                        </Tag>

                        <Tag>
                            <Icon name="Calendar1" />

                            {new Date(c.expires_at).toLocaleString()}
                        </Tag>
                    </label>
                </li>)}

                {Boolean(expiredCoupons.length) && <li className="w-full gap-2 rounded-md border p-1 font-black flex flex-row justify-start items-center">
                    <Icon name="Close" />

                    Expirados
                </li>}

                {expiredCoupons.map(c => <li key={c.coupon_id} className="w-full gap-2 p-1 pl-4 flex flex-row justify-start items-center hover:bg-gray-400/20">
                    <input id={`${c.coupon_id}-coupon`} type="checkbox" value={c.coupon_id} name="coupon_ids" />

                    <label htmlFor={`${c.coupon_id}-coupon`} className="cursor-pointer w-full gap-2 flex flex-row justify-start items-center">
                        <Icon name="Coupon" />

                        <span className="italic">{c.code}</span>

                        <Tag variant="success" className="ml-auto">
                            <Icon name="Discount" />

                            {`${c.discount}%`}
                        </Tag>

                        <Tag>
                            <Icon name="CalendarExpired" />

                            <span className="line-through">
                                {new Date(c.expires_at).toLocaleString()}
                            </span>
                        </Tag>
                    </label>
                </li>)}
            </ul>

            <label htmlFor="expires_at" className="w-full flex flex-row justify-start items-center gap-2 mr-auto border-t pt-2">
                <Icon name="Calendar1" />

                <span>Data de expiração</span>

                <input min={new Date().toISOString().split('T')[0]} title="Nova data de expiração" id="expires_at" name="expires_at" className="ml-auto text-center" placeholder="Data de expiração" type="date" data-element="h3" />
            </label>
        </fieldset>}

        {(status === "error") && <div data-state="error" className="w-full flex flex-row justify-center items-center gap-2">
            <Icon name="ExclamationCircle" />

            {error?.message}
        </div>}

        {(status === "loading")
            ? <Button variant="secondary" className="w-full" disabled>
                <Icon name="Loading" className="animate-spin" />
            </Button>

            : <div className="w-full flex flex-row justify-start items-center gap-2">
                {mode === "renew" && <>
                    <Button value="PATCH" type="submit" className="w-full">
                        <Icon name="Update" />

                        Atualizar
                    </Button>

                    <Button value="EXPIRE" type="submit" variant="warning" className="w-3/12">
                        <Icon name="CalendarExpired" />

                        Expirar
                    </Button>
                </>}

                {mode === "add" && <Button value="POST" type="submit" className="w-full">
                    <Icon name="Add" />

                    Criar
                </Button>}
            </div>}
    </form>
};

export default CouponForm;