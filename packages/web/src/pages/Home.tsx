import { useSearchParams } from "react-router-dom";

import MenuProductsGrid from "components/grids/products/menu";

import type { 
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

function HomePage() {
    const [searchParams] = useSearchParams();
    
    const defaultProduct_type = (searchParams.get("product_type") as $Enums.Products_product_type | "all");

    return <>
        <div data-element="pattern" data-position="left"></div>

        <main className="relative">
            <MenuProductsGrid
                group="menu"
                productType={defaultProduct_type === "all" ? undefined : defaultProduct_type}
                className="w-full flex flex-col justify-start items-start gap-5"
                trackAppUpdates
            />
        </main>

        <div data-element="pattern" data-position="right"></div>
    </>
};

export default HomePage;