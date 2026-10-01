import { 
    useEffect, 
    useState
} from "react";

import { useSearchParams } from "react-router-dom";

import { 
    findNearestRestaurantWithLocation,
    type restaurantType, 
} from "@Madeirense/shared";

import { useApp } from "contexts/App";

import Icon from "components/icon";
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
                className="w-full"
                trackAppUpdates
            />
        </main>

        <div data-element="pattern" data-position="right"></div>
    </>
};

export default HomePage;