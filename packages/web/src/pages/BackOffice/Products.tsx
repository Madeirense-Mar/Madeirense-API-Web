import {
    MouseEvent,
    useState,
    type ChangeEvent
} from "react";

import {
    useModal
} from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";

import ProductsMenuGrid from "components/grids/products/menu";

import AddProductForm from "components/modals/forms/product/add";
import ProductDiscountForm from "components/modals/forms/product/discount";
import CouponForm from "components/forms/coupon";

// ***************************************************************************************************************

enum Modals {
    DISCOUNT="DISCOUNT",
    PRODUCT="PRODUCT"
};

function BackOfficeProductsPage() {
    const { show } = useModal();

    const [type, setType] = useState<"products" | "delisted-products">("products");

    function handleTypePick({ target }: ChangeEvent<HTMLSelectElement>) {
        setType((target as HTMLSelectElement).value as (typeof type));
    };

    function openModal(e: MouseEvent<HTMLButtonElement>) {
        switch ((e.target as HTMLButtonElement).value) {
            case Modals.DISCOUNT:
                show(<ProductDiscountForm />, { title: `Ver/Atribuir descontos` });
                break;

            case Modals.PRODUCT:
                show(<AddProductForm />, { title: `Adicionar produto ao menu` });
                break;
        };
    };

    return <main>
        <section>
            <header className="w-full flex flex-row justify-start items-center gap-2">
                <select className="mr-auto" title="Tipo de listas" id="type" data-element="h1" name="type" defaultValue={type} onChange={handleTypePick}>
                    <option value="products">Menu</option>
                    <option value="delisted-products">Ocultados</option>
                </select>

                <Button value={Modals.DISCOUNT} variant="warning" onClick={openModal}>
                    <Icon name="Discount" />

                    Ver/Atribuir descontos
                </Button>

                <Button value={Modals.PRODUCT} onClick={openModal}>
                    <Icon name="Plus" />

                    Adicionar novo prato/producto
                </Button>
            </header>

            <ProductsMenuGrid
                className="w-full flex flex-col justify-start items-start gap-5"
                group="menu"
                mode="admin"
                trackAppUpdates
                {...{ type }}
            />
        </section>

        <section>
            <header>
                <h2 className="inline-flex justify-center items-center gap-3">
                    <Icon name="Coupon" />

                    Cupons de desconto
                </h2>
            </header>

            <CouponForm className="w-full flex flex-col justify-start items-start gap-4" />
        </section>
    </main>
};

export default BackOfficeProductsPage;