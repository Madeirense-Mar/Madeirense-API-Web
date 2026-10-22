import {
    type ComponentProps
} from "react";

import { useModal } from "contexts/Modal";

import AddForm from "components/forms/add/restaurantEvent";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
};

const AddRestaurantEventForm = ({
    callback,
    ...props
}: IPropTypes) => {
    const { eject } = useModal();

    function handleCallback() {
        eject();

        callback?.();
    };

    return <AddForm
        callback={handleCallback}
        hideTitle
        {...props}
    />
};

export default AddRestaurantEventForm;