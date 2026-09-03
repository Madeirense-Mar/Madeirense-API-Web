import {
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

// ***************************************************************************************************************

function BackOfficeProductsPage() {
    const { show } = useModal();

    const [type, setType] = useState<"products" | "delisted-products">("products");

    function handleTypePick({ target }: ChangeEvent<HTMLSelectElement>) {
        setType((target as HTMLSelectElement).value as (typeof type));
    };

    function openAddProductModal() {
        show(<AddProductForm />, {
            title: `Adicionar produto ao menu`
        });
    };

    function openProductDiscountModal() {
        show(<ProductDiscountForm />, {
            title: `Ver/Atribuir descontos`
        });
    };

    return <main>
        <section>
            <header className="w-full flex flex-row justify-start items-center gap-2">
                <select className="mr-auto" title="Tipo de listas" id="type" data-element="h1" name="type" defaultValue={type} onChange={handleTypePick}>
                    <option value="products">Menu</option>
                    <option value="delisted-products">Ocultados</option>
                </select>

                <Button variant="warning" onClick={openProductDiscountModal}>
                    <Icon name="Discount" />

                    Ver/Atribuir descontos
                </Button>

                <Button shape="circle" onClick={openAddProductModal}>
                    <Icon name="Plus" />
                </Button>
            </header>
        </section>

        <section>
            <ProductsMenuGrid
                group="menu"
                mode="admin"
                trackAppUpdates
                {...{ type }}
            />
        </section>
    </main>
};

export default BackOfficeProductsPage;