//#region Imports -----------------------------------------
import {
    type ComponentProps
} from "react";

import {
    resolveClassNames,
    toDayOfTheWeek,
    toTimeDecimal,
    type restaurantType,
} from "@Madeirense/shared";

import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./withoutNavigation.module.css";

import type {
    $Enums,
    Restaurant_Hours
} from "@Madeirense/database/browser";

import type {
    withVariant
} from "components/types";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
export interface ICardPropTypes extends ComponentProps<"div"> {
    restaurant: restaurantType;
};
//#endregion

function RestaurantCardWithoutNavigation ({
    className,
    restaurant,
    variant = "primary",
    ...props
}: withVariant<ICardPropTypes>) {
    //#region Variable declarations -----------------------
    const {
        name,
        Delivery_Locations,
        Restaurant_Hours,
        thumbnail_url,
    } = restaurant;

    const { 
        closing_time, 
        opening_time
    } = ((Restaurant_Hours ?? []) as Restaurant_Hours[])[new Date().getDay()];
    
    const cTime = `${toTimeDecimal(new Date(closing_time).getHours())}:${toTimeDecimal(new Date(closing_time).getMinutes())}`;
    const oTime = `${toTimeDecimal(new Date(opening_time).getHours())}:${toTimeDecimal(new Date(opening_time).getMinutes())}`;
    //#endregion

    //#region DOM -----------------------------------------
    return <div className={resolveClassNames(styles[variant], className)} style={{ backgroundImage: `url(${thumbnail_url})` }} {...props}>
        <h4>{name}</h4>

        <ul>
            {(Restaurant_Hours ?? []).map((h, idx) => <li key={h.hours_id}>
                <Tag variant={(idx === new Date().getDay()) ? "selected" : "secondary"}>
                    {toDayOfTheWeek(h.day_of_week as $Enums.Restaurant_Hours_day_of_week)}
                </Tag>
            </li>)}
        </ul>

        <div className="flex flex-row justify-start items-start gap-2">
            <Tag title="Abertura" variant="secondary">
                <Icon name="Clock" />

                {oTime}
            </Tag>

            <Tag title="Fecho" variant="secondary">
                <Icon name="ClockOff" />

                {cTime}
            </Tag>
        </div>

        <Tag>
            <Icon name="MapMarker" />

            {Delivery_Locations?.address}
        </Tag>
    </div>
    //#endregion
};

export default RestaurantCardWithoutNavigation;