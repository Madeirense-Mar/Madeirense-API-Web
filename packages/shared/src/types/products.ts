import type {
    $Enums,
    DB$Types,
    Products,
    Restaurants
} from "@Madeirense/database/browser";

import type { productCommentType } from "./comments.js";

// ***************************************************************************************************************

export type productType = (
    Products &
    {
        Restaurants?: Partial<Restaurants> | null,
        User_Comments?: ReadonlyArray<productCommentType>,
        _count?: DB$Types.tableCountRecord
    }
);

export type productGroupType = (
    | "menu"
    | "event"
);

export type productPayloadType = {
    product_id: number,
    name: string,
    description: string,
    price: number,
    restaurant_id?: number,
    prep_time_minutes?: number,
    discount?: number,
    thumbnail?: string,
    product_composition: $Enums.Products_product_composition,
    product_type: $Enums.Products_product_type,
};