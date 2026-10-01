import {
    Popup,
    PopupProps
} from "react-leaflet";

import { 
    resolveClassNames
} from "@Madeirense/shared";

import Icon from "components/icon";
import Tag from "components/tags";

import type {
    Restaurants
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

interface IPropTypes extends PopupProps {
    restaurant: Restaurants;
};

const MadeirenseRestaurantPopup = (_props: IPropTypes) => {
    const {
        className,
        restaurant,
        ...props
    } = _props;

    const {
        name,
        thumbnail_url
    } = restaurant;

    return <Popup className={resolveClassNames("leaflet-popup-madeirense-restaurant", className)} {...props}>
        <div>
            <img src={thumbnail_url ?? "#"} alt={name} />

            <Tag className="w-full">
                <Icon name="Restaurant" />

                {name}
            </Tag>
        </div>
    </Popup>
};

export default MadeirenseRestaurantPopup;