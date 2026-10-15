import {
    type ComponentProps,
    type MouseEvent
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
        onClick,
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

    function handleClick (event: MouseEvent<HTMLDivElement>) {
        if (disableLink) {
            onClick?.(event);

            return;
        }

        navigate(profileLink);
    }

    return <div
        className={resolveClassNames(styles[variant], className, disableLink ? undefined : "cursor-pointer")}
        onClick={handleClick}
        style={{ backgroundImage: `url(${thumbnail_url})` }}
        {...props}
    >
        {mode === "admin" && <Link to={profileLink}>{name}</Link>}
        {mode === "default" && <h4>{name}</h4>}

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
};

export default RestaurantCard;