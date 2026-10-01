import {
    type ComponentProps
} from "react";

import Icon, { 
    type iconNameType 
} from "components/icon";

import type { 
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

type labelType = (
    | $Enums.Orders_status
    | $Enums.Products_product_type
);

export function getLabelIcon<T = labelType>(label: T, props?: Omit<ComponentProps<typeof Icon>, "name">) {
    let name: iconNameType;

    switch (label) {
        case "assigned": name = "Running"; break;
        case "cancelled": name = "Close"; break;
        case "confirmed": name = "Circle"; break;
        case "delivered": name = "Check"; break;
        case "preparing": name = "Kitchen"; break;
        case "pending": name = "PendingActions"; break;
        case "ready": name = "CheckList"; break;
        case "starter": name = "Circle"; break;
        case "beverage": name = "Drink"; break;
        case "garnish": name = "Salad"; break;
        case "dessert": name = "Dessert"; break;
        case "ticket": name = "Ticket"; break;
        case "main": name = "Food"; break;

        default: return null;
    }

    return <Icon {...{ name }} {...props} />;
};
