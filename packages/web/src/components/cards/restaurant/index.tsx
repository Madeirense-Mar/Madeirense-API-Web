//#region Imports -----------------------------------------
import {
    type MouseEvent
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    Madeirense$Enumerators,
} from "@Madeirense/shared";

import RestaurantCardWithoutNavigation, {
    type ICardPropTypes
} from "./withoutNavigation";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
interface IPropTypes extends ICardPropTypes {
    disableLink?: boolean;
    mode?: "default" | "admin";
};
//#endregion

function RestaurantCard ({
    disableLink = false,
    mode = "default",
    onClick,
    restaurant,
    ...props
}: IPropTypes) {
    //#region Hooks and state declarations ----------------
    const navigate = useNavigate();
    //#endregion

    //#region Functions -----------------------------------
    function handleClick(event: MouseEvent<HTMLDivElement>) {
        if (disableLink || mode === "admin") {
            onClick?.(event);

            return;
        };

        navigate(`${Madeirense$Enumerators.Pages.BackOffice.Restaurant}/${restaurant.restaurant_id}`);
    };
    //#endregion

    //#region DOM -----------------------------------------
    return <RestaurantCardWithoutNavigation onClick={handleClick} {...props} {...{ restaurant }} />
    //#endregion
};

export default RestaurantCard;