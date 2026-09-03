import {
    Fragment,
    useMemo,
    useState,
    type ComponentProps,
    type SubmitEvent,
} from "react";

import {
    MENU_PRODUCT_TYPES,
    formatNumber,
    getLabel,
    type productType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";

import type { IComponentState } from "components/interface";
import Tag from "components/tags";

// ***************************************************************************************************************

const DiscountForm = ({ 
    callback,
    mode,
    ...props
}: { 
    callback?: () => void,
    mode: "add" | "edit", 
} & ComponentProps<"form">) => {
    const { state, fetch, get } = useApp();
    const { eject } = useModal();

    const { products } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<string>>({ data: "", status: "idle", error: null });

    const { data = "", error, status } = form;

    const _products = useMemo(() => get("Products") ?? [], [get]);
    const discountedProducts = useMemo(() => (get("Products") ?? []).filter(p => (parseInt(`${p?.discount}`) ?? 0) > 0), [get]);

    const productsListGroup = useMemo(() => {
        switch (mode) {
            case "add": return groupProductsByType(_products);
            case "edit": return groupProductsByType(discountedProducts);

            default: return [];
        }
    }, [products, discountedProducts, mode]);

    const IS_EMPTY = productsListGroup.every(a => a.length === 0);
    const IS_LOADING = (state.includes("Products") || state === "loading");

    function groupProductsByType(array: productType[]) {
        const groupedArray: (productType[])[] = [];

        MENU_PRODUCT_TYPES.forEach(t => groupedArray.push(array.filter(p => p.product_type === t)));

        return groupedArray;
    };

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;
        const $submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;

        try {
            updateForm(p => { return { ...p, status: "loading" } });

            const product_ids = (Array.from(document.querySelectorAll("input[name='product_id']")) as HTMLInputElement[]).filter(i => i.checked).map(i => parseInt(i.value));

            switch ($submitter.value) {
                case "remove-all": break;

                case "remove-selected":
                default:
                    if (!product_ids.length) throw new Error("Precisa de seleccionar pelo menos 1 produto");
                    break;
            };

            switch ($submitter.value) {
                case "remove-all": await products.clearAllDiscounts(); break;

                case "remove-selected": await products.addDiscounts({
                    discount: 0,
                    product_ids
                }); break;

                default: await products.addDiscounts({
                    discount: parseFloat((elements.namedItem("discount") as HTMLInputElement).value as string),
                    product_ids
                }); break;
            };

            await fetch("Products");

            updateForm(p => { return { ...p, status: "idle" } });

            callback?.();

            eject();
        } catch (error) {
            updateForm(p => { return { ...p, status: "error", error: new Error((error as Error).message) } });
        }
    };

    return <form onSubmit={PATCH} className="h-full w-full flex flex-col justify-start items-start gap-4" {...props}>
        {(mode === "add") && <fieldset className="w-full flex flex-row justify-start items-start gap-3 rounded-md">
            <legend>Valor</legend>

            <label htmlFor="discount" className="text-lg flex flex-row justify-start items-center gap-2 mr-auto">
                <Icon name="Discount" />

                <span>Desconto</span>
            </label>

            <input title="Desconto" id="discount" name="discount" className="text-right" placeholder="Valor do desconto em percentagem" min={mode === "add" ? 1 : 0} type="number" data-element="h3" required />
        </fieldset>}

        <fieldset className="w-full flex flex-col justify-start items-start gap-3 p-3 rounded-md">
            <legend className="flex flex-row justify-start items-center gap-2">
                Produtos

                {(IS_LOADING) && <Icon name="Loading" className="animate-spin" />}
            </legend>

            <ul className="w-full flex flex-col justify-start items-start">
                {(IS_EMPTY) && <li className="w-full flex flex-row justify-center items-center italic opacity-40">
                    Sem produtos com desconto
                </li>}

                {productsListGroup.map((g, i) => {
                    if (!g.length) return null;

                    return <Fragment key={MENU_PRODUCT_TYPES[i]}>
                        <li className="w-full rounded-md border p-1 font-bold">
                            {getLabel(MENU_PRODUCT_TYPES[i])}
                        </li>

                        {(g)
                            .filter(p => !data ? true : p.name.includes(data))
                            .map(p => <ListItem
                                key={p.product_id}
                                product={p}
                                disabled={status === "loading"}
                                className="flex flex-row justify-start items-center w-full"
                            />)
                        }
                    </Fragment>
                })}
            </ul>
        </fieldset>

        {(status === "error") && <div data-state="error" className="w-full flex flex-row justify-center items-center gap-2">
            <Icon name="ExclamationCircle" />

            {error?.message}
        </div>}

        {(status === "loading")
            ? <Button variant="secondary" className="w-full" disabled>
                <Icon name="Loading" className="animate-spin" />
            </Button>

            : <div className="w-full flex flex-row justify-between items-center gap-2">
                {mode === "edit" && <>
                    <Button type="submit" value="remove-selected" variant="danger" disabled={IS_EMPTY}>
                        <Icon name="Close" />

                        Retirar dos seleccionados
                    </Button>

                    <Button type="submit" value="remove-all" variant="warning" disabled={IS_EMPTY}>
                        <Icon name="Close" />

                        Limpar todos
                    </Button>
                </>}

                {mode === "add" && <Button type="submit" className="w-full">
                    <Icon name="Add" />

                    Atribuir
                </Button>}
            </div>}
    </form>;
};

const ListItem = ({ product: p, disabled = false, ...props }: { product: productType, disabled?: boolean } & ComponentProps<"li">) => {
    const discount = parseFloat(p.discount.toString());
    const price = parseFloat(p.price.toString());
    const discountedPrice = !discount ? 0 : price - (price * discount) / 100;

    return <li {...props}>
        <label htmlFor={`${p.product_id}-product`} className="cursor-pointer w-full flex flex-row justify-start items-center gap-2 ml-5 border-l py-1 pl-5">
            <input id={`${p.product_id}-product`} value={p.product_id} name="product_id" type="checkbox" defaultChecked={discount > 0} {...{ disabled }} />

            <div className="h-[40px] w-[70px] rounded-md" data-type="thumbnail" style={{ backgroundImage: `url(${p.thumbnail ?? "#"})` }}></div>

            {p.name}

            {(discount > 0) && <Tag variant="secondary" className="ml-auto line-through">
                <Icon name="Money" />

                {!price ? "Grátis" : formatNumber(price)}
            </Tag>}

            <Tag variant="success" className={!discount ? "ml-auto" : undefined}>
                {!discount ? <Icon name="Money" /> : <Icon name="Discount" />}

                {`${formatNumber(!discount ? price : discountedPrice)}${!discount ? "" : ` (${discount}%)`}`}
            </Tag>
        </label>
    </li>
};

export default DiscountForm;
