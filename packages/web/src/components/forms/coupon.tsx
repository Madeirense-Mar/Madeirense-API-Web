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
    resolveClassNames,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./coupon.module.css";

import type {
    Coupons
} from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";
import DescriptionLabel from "./elements/labels/description";

// ***************************************************************************************************************

const CouponForm = ({
    callback,
    className,
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

    return <form
        className={resolveClassNames(styles.form, className)}
        data-state={(IS_LOADING || status === "loading") ? "disabled" : "idle"}
        onSubmit={PATCH_POST}
        {...props}
    >
        {(status === "success") && <div data-state="success" className="w-full flex flex-row justify-center items-center gap-2">
            <Icon name="Check" />

            Pedido processado com successo!
        </div>}

        <div className="w-full flex flex-row justify-between items-center gap-1">
            <label data-variant="selectable" htmlFor="renew" className="w-full p-2 rounded-lg">
                {(IS_LOADING)
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="Update" />
                }

                <span>Atualizar cupons</span>

                <input id="renew" type="radio" name="mode" defaultChecked={mode === "renew"} value="renew" onChange={selectFormMode} className="opacity-0" />
            </label>

            <label data-variant="selectable" htmlFor="add" className="w-full p-2 rounded-lg">
                <Icon name="Add" />

                <span>Criar cupon</span>

                <input id="add" type="radio" name="mode" defaultChecked={mode === "add"} value="add" onChange={selectFormMode} className="opacity-0" />
            </label>
        </div>

        <hr className="w-full opacity-30" />

        {(mode === "add") && <fieldset className="w-full flex flex-col justify-start items-start gap-3 rounded-md">
            <DescriptionLabel
                className="w-full gap-3"
                title="Código"
                description={<span>
                    O nome do cupão a ser utilizado pelos clientes. 
                    <span className="italic opacity-30 ml-1 text-sm">(exe. MADEIRENSE-CÓDIGO-CUPON)</span>
                </span>}
                input={{
                    element: "input",
                    icon: <Icon name="Coupon" />,
                    props: {
                        title: "Código de cupon",
                        id: "code",
                        name: "code",
                        className: "text-center w-full uppercase",
                        placeholder: "Código de cupon",
                        type: "text",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full gap-3"
                title="Desconto"
                description="Percentagem de desconto oferecido pelo cupon."
                input={{
                    element: "input",
                    icon: <Icon name="Discount" />,
                    props: {
                        title: "Código de cupon",
                        id: "coupon-discount",
                        name: "coupon-discount",
                        className: "text-center w-full",
                        placeholder: "Percentagem",
                        type: "number",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full gap-3"
                title="Data de expiração"
                description="Determina o prazo de validade do cupon, desde o dia que foi criado até à data de expiração. Após a data, o cupon pode ser re-activado vezes sem conta."
                input={{
                    element: "input",
                    icon: <Icon name="Calendar1" />,
                    props: {
                        min: new Date().toISOString().split('T')[0],
                        title: "Nova data de expiração",
                        id: "expires_at",
                        name: "expires_at",
                        className: "text-center w-full",
                        placeholder: "Data de expiração",
                        type: "date"
                    }
                }}
            />
        </fieldset>}

        {(mode === "renew") && <fieldset className="w-full flex flex-col justify-start items-start gap-5 rounded-md">
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

                        <Tag variant="secondary">
                            <Icon name="Calendar1" />

                            {new Date(c.expires_at).toLocaleString()}
                        </Tag>
                    </label>
                </li>)}

                {Boolean(expiredCoupons.length) && <li className={resolveClassNames("w-full gap-2 rounded-md border p-1 font-black flex flex-row justify-start items-center", Boolean(activeCoupons.length) ? "mt-5" : null)}>
                    <Icon name="Close" />

                    Expirados
                </li>}

                {expiredCoupons.map(c => <li key={c.coupon_id} className="w-full gap-2 p-1 pl-4 flex flex-row justify-start items-center hover:bg-gray-400/20">
                    <input id={`${c.coupon_id}-coupon`} type="checkbox" value={c.coupon_id} name="coupon_ids" />

                    <label htmlFor={`${c.coupon_id}-coupon`} className="cursor-pointer w-full gap-2 flex flex-row justify-start items-center">
                        <Icon name="CouponOff" />

                        <span className="italic">{c.code}</span>

                        <Tag variant="success" className="ml-auto">
                            <Icon name="Discount" />

                            {`${c.discount}%`}
                        </Tag>

                        <Tag variant="danger">
                            <Icon name="CalendarExpired" />

                            <span className="line-through">
                                {new Date(c.expires_at).toLocaleString()}
                            </span>
                        </Tag>
                    </label>
                </li>)}
            </ul>

            <hr className="w-full opacity-30" />

            <DescriptionLabel
                className="w-full gap-3"
                title="Data de expiração"
                description="Determina o prazo de validade do cupon, desde o dia que foi criado até à data de expiração. Após a data, o cupon pode ser re-activado vezes sem conta."
                input={{
                    element: "input",
                    icon: <Icon name="Calendar1" />,
                    props: {
                        min: new Date().toISOString().split('T')[0],
                        title: "Nova data de expiração",
                        id: "expires_at",
                        name: "expires_at",
                        className: "text-center w-full",
                        placeholder: "Data de expiração",
                        type: "date"
                    }
                }}
            />
        </fieldset>}

        {(status === "error") && <Tag variant="danger" className="mx-auto">
            <Icon name="ExclamationCircle" />

            {error?.message}
        </Tag>}

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