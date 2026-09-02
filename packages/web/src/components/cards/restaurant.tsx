import {
    type ComponentProps
} from "react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import {
    resolveClassNames,
    toDayOfTheWeek,
    toTimeDecimal,
    Madeirense$Enumerators,
    type restaurantType,
} from "@Madeirense/shared";

import Icon from "components/icon";
import Tag from "components/tags";

import type {
    withVariant
} from "components/types";

import styles from "./restaurant.module.css";

import type {
    $Enums,
    Restaurant_Hours
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    disableLink?: boolean;
    mode?: "default" | "admin";
    restaurant: restaurantType;
    onSuccess?: (restaurant?: restaurantType) => void;
};

function RestaurantCard(_props: withVariant<IPropTypes>) {
    const {
        className,
        disableLink = false,
        mode = "default",
        restaurant,
        onSuccess,
        variant = "primary",
        ...props
    } = _props;

    const {
        name,
        restaurant_id,
        Delivery_Locations,
        Restaurant_Hours,
        thumbnail_url,
    } = restaurant;

    const profileLink = `${Madeirense$Enumerators.Pages.BackOffice.Restaurant}/${restaurant_id}`;

    const { closing_time, opening_time } = ((Restaurant_Hours ?? []) as Restaurant_Hours[])[new Date().getDay()];
    const cTime = `${toTimeDecimal(new Date(closing_time).getHours())}:${toTimeDecimal(new Date(closing_time).getMinutes())}`;
    const oTime = `${toTimeDecimal(new Date(opening_time).getHours())}:${toTimeDecimal(new Date(opening_time).getMinutes())}`;

    const navigate = useNavigate();

    return <div className={resolveClassNames(styles[variant], className)} {...props}>
        <div
            className={disableLink ? undefined : "cursor-pointer"}
            onClick={disableLink ? undefined : () => { navigate(profileLink) }}
            style={{ backgroundImage: `url(${thumbnail_url})` }}
            data-section="thumbnail"
        ></div>

        {mode === "admin" && <Link to={profileLink}>{name}</Link>}
        {mode === "default" && <h4>{name}</h4>}

        <section>
            <div className="w-full flex flex-row justify-start items-start">
                {(Restaurant_Hours ?? []).map((h, idx) => <Tag key={h.hours_id} variant={(idx === new Date().getDay()) ? "selected" : "primary"}>
                    {toDayOfTheWeek(h.day_of_week as $Enums.Restaurant_Hours_day_of_week)}
                </Tag>)}
            </div>

            <div className="w-full flex flex-row justify-start items-start">
                <div className="w-full flex flex-col justify-start items-start">
                    <span className="font-semibold">Abertura</span>
                    <span>{oTime}</span>
                </div>

                <div className="w-full flex flex-col justify-start items-start">
                    <span className="font-semibold">Fecho</span>
                    <span>{cTime}</span>
                </div>
            </div>

            <div className="w-full flex flex-row justify-start items-start">
                <Icon name="MapMarker" />

                <span className="font-semibold">
                    {Delivery_Locations?.address}
                </span>
            </div>
        </section>
    </div>
};

export default RestaurantCard;