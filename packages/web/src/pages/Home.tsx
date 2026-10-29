import { 
    useSearchParams
} from "react-router-dom";

import MenuProductsGrid from "components/grids/products/menu";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

function HomePage() {
    const [searchParams] = useSearchParams();

    const defaultProductType = (searchParams.get("product_type") as $Enums.Products_product_type | "all");
    const defaultProductComposition = searchParams.get("product_composition") as $Enums.Products_product_composition ?? undefined;

    return <main>
        <MenuProductsGrid
            className="w-full flex flex-col justify-start items-start gap-5"
            group="menu"
            productComposition={defaultProductComposition}
            productType={defaultProductType === "all" ? undefined : defaultProductType}
            trackAppUpdates
        />
    </main>
};

export default HomePage;