import {
    Fragment,
    MouseEvent,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type SubmitEvent,
} from "react";

import {
    MENU_PRODUCT_TYPES,
    formatNumber,
    getLabel,
    resolveClassNames,
    type productType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import DescriptionLabel from "components/forms/elements/labels/description";

import styles from "./discount.module.css";

import type { IComponentState } from "components/interface";

// ***************************************************************************************************************

const DiscountForm = ({
    callback,
    mode,
    ...props
}: {
    callback?: () => void,
    mode: "add" | "edit",
} & ComponentProps<"form">) => {
    const $inputRef = useRef<null | HTMLInputElement>(null);

    const { state, fetch, get } = useApp();
    const { eject } = useModal();

    const { products } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [form, updateForm] = useState<IComponentState<string>>({ data: "", status: "idle", error: null });
    const [searchKey, setSearchKey] = useState("");

    const { data = "", error, status } = form;

    const availableProducts = useMemo(() => (get("Products") ?? []).filter(
        p => searchKey === "" ? true : p.name.toLowerCase().includes(searchKey)
    ), [get, searchKey]);

    const discountedProducts = useMemo(() => (get("Products") ?? []).filter(
        p => [
            searchKey === "" ? true : p.name.toLowerCase().includes(searchKey),
            (parseInt(`${p?.discount}`) ?? 0) > 0
        ].every(v => v)
    ), [get, searchKey]);

    const productsListGroup = useMemo(() => {
        switch (mode) {
            case "add": return groupProductsByType(availableProducts);
            case "edit": return groupProductsByType(discountedProducts);

            default: return [];
        }
    }, [products, discountedProducts, mode]);

    const assertions = {
        "isClearButtonDisabled": [
            searchKey === "",
            !$inputRef.current
        ].includes(true),
        "isListEmpty": productsListGroup.every(a => a.length === 0) && searchKey === "",
        "isLoading": [
            state.includes("Products"),
            state === "loading"
        ].includes(true)
    };

    function groupProductsByType(array: productType[]) {
        const groupedArray: (productType[])[] = [];

        MENU_PRODUCT_TYPES.forEach(t => groupedArray.push(array.filter(p => p.product_type === t)));

        return groupedArray;
    };

    function handleSearch(e: ChangeEvent<HTMLInputElement>) {
        const { target } = e;

        setSearchKey((target as HTMLInputElement).value.toLowerCase());
    };

    function handleSearchClear(e: MouseEvent<HTMLButtonElement>) {
        if ($inputRef.current)
            $inputRef.current.value = "";

        setSearchKey("");
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

    return <form onSubmit={PATCH} className={resolveClassNames(styles.form, "h-full w-full flex flex-col justify-start items-start gap-4")} {...props}>
        <fieldset className="w-full flex flex-col justify-start items-start gap-3 rounded-md">
            {assertions.isLoading && <legend className="flex flex-row justify-start items-center gap-2">
                <Icon name="Loading" className="animate-spin" />
            </legend>}

            <ul className={resolveClassNames(styles.list, "w-full flex flex-col justify-start items-start")}>
                {(assertions.isListEmpty)
                    ? <li className="w-full flex flex-row justify-center items-center italic opacity-40">
                        Sem produtos com desconto
                    </li>

                    : <li className="w-full flex flex-row justify-start items-center gap-5 mb-3">
                        <label className="w-full flex flex-row justify-start items-center gap-3">
                            <Icon name="Search" />

                            <input ref={$inputRef} type="text" className="w-full" placeholder="Pesquisar pelo nome do producto" onChange={handleSearch} />
                        </label>

                        <Button variant={assertions.isClearButtonDisabled ? "secondary" : "primary"} onClick={handleSearchClear} disabled={assertions.isClearButtonDisabled}>
                            <Icon name="Close" />
                        </Button>
                    </li>
                }

                {productsListGroup.map((group, gIndex) => {
                    if (!group.length) return null;

                    const filteredGroupList = group.filter(product => !data ? true : product.name.includes(data));

                    return <Fragment key={MENU_PRODUCT_TYPES[gIndex]}>
                        <li className={resolveClassNames(styles["list-item-header"], "w-full rounded-md border p-1 font-bold")}>
                            {getLabel(MENU_PRODUCT_TYPES[gIndex])}
                        </li>

                        {filteredGroupList.map((product, pIndex) => <ListItem
                            key={product.product_id}
                            product={product}
                            disabled={status === "loading"}
                            className={resolveClassNames("flex flex-row justify-start items-center w-full", pIndex === (filteredGroupList.length - 1) ? styles['last-list-item'] : "")}
                        />)
                        }
                    </Fragment>
                })}
            </ul>
        </fieldset>

        {(mode === "add") && <>
            <hr className="w-full" />

            <fieldset className="w-full flex flex-row justify-start items-start gap-3 rounded-md">
                <DescriptionLabel
                    className="gap-5 w-full"
                    title="Desconto"
                    description="Valor de desconto (em percentagem) que será atribuido à todos os productos seleccionados."
                    input={{
                        element: "input",
                        icon: "Discount",
                        props: {
                            title: "Desconto",
                            id: "discount",
                            name: "discount",
                            className: "text-right w-full",
                            placeholder: "Valor do desconto em percentagem",
                            min: (mode === "add") ? 1 : 0,
                            type: "number",
                            required: true
                        }
                    }}
                />
            </fieldset>
        </>}

        {(status === "error") && <div data-state="error" className="w-full flex flex-row justify-center items-center gap-2">
            <Icon name="ExclamationCircle" />

            {error?.message}
        </div>}

        {(status === "loading")
            ? <Button variant="secondary" className="w-full" disabled>
                <Icon name="Loading" className="animate-spin" />
            </Button>

            : <div className="w-full flex flex-row justify-between items-center gap-2">
                {mode === "edit" && !assertions.isListEmpty && <>
                    <Button type="submit" value="remove-selected" variant="danger">
                        <Icon name="Close" />

                        Retirar dos seleccionados
                    </Button>

                    <Button type="submit" value="remove-all" variant="warning">
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

const ListItem = ({ product: p, disabled = false, className, ...props }: { product: productType, disabled?: boolean } & ComponentProps<"li">) => {
    const discount = parseFloat(p.discount.toString());
    const price = parseFloat(p.price.toString());
    const discountedPrice = !discount ? 0 : price - (price * discount) / 100;

    return <li className={resolveClassNames(styles["list-item"], className)} {...props}>
        <label data-variant="selectable" htmlFor={`${p.product_id}-product`} className="cursor-pointer w-full flex flex-row justify-start items-center gap-2 ml-5 border-l py-1 px-2">
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
