import {
    SubmitEvent,
    useState,
    type ComponentProps
} from "react";

import {
    resolveClassNames
} from "@Madeirense/shared";

import { useCart } from "contexts/Cart";
import Button from "components/buttons";
import Icon from "components/icon";

import styles from './cartQuantityControl.module.css';
import { variantType } from "components/types";


// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    productId: number,
    buttonVariants?: Partial<Record<("add" | "inc" | "dec" | "clear"), variantType>>
};

enum ACTIONS {
    ADD = "add",
    CLEAR = "clear",
    REMOVE = "remove"
};

const CartQuantityControlForm = ({
    className = undefined,
    productId,
    buttonVariants,
    ...props
}: IPropTypes) => {
    const [state, setState] = useState<"adding" | "clearing" | "removing" | "idle">("idle");

    const {
        add: $additionButtonVariant,
        clear: $clearingButtonVariant,
        dec: $decrementButtonVariant,
        inc: $incrementButtonVariant
    } = buttonVariants ?? {};

    const {
        add,
        remove,
        cart
    } = useCart();

    const { deliveryCart } = cart;

    const quantity = (deliveryCart.find(p => p.product_id === productId)?.quantity ?? 0);

    const assertions = {
        "isCartingEnabled": !deliveryCart.find(p => p.product_id === productId),

        "isWorking": ([
            "adding",
            "clearing",
            "removing"
        ] as (typeof state)[]).includes(state)
    };

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $submitter = e.nativeEvent.submitter as HTMLButtonElement;

        try {
            switch ($submitter.value as ACTIONS) {
                case ACTIONS.ADD:
                    setState("adding");
                    await add(productId);
                    break;

                case ACTIONS.CLEAR:
                    setState("clearing");
                    await remove(productId, quantity);
                    break;

                case ACTIONS.REMOVE:
                    setState("removing");
                    await remove(productId);
                    break;
            }

            setState("idle");
        } catch (error) {
            // something happens here
        }
    };

    return <form
        className={resolveClassNames(styles.form, className)}
        onSubmit={handleSubmit}
        {...props}
        data-carting={!assertions.isCartingEnabled}
    >
        {assertions.isCartingEnabled
            ? <Button value={ACTIONS.ADD} type="submit" variant={$additionButtonVariant} className="w-full">
                {(state === "adding")
                    ? <Icon name="Loading" className="animate-spin" />

                    : <>
                        <Icon name="Add" />

                        Adicionar
                    </>}
            </Button>

            : <>
                <button className={resolveClassNames(styles["action-button"])} value={ACTIONS.CLEAR} type="submit" disabled={assertions.isWorking}>
                    {(state === "clearing") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Trash" />}
                </button>

                {(quantity > 1) && <button className={resolveClassNames(styles["action-button"])} value={ACTIONS.REMOVE} type="submit" disabled={assertions.isWorking}>
                    {(state === "removing") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Minus" />}
                </button>}

                <span>
                    {quantity}
                </span>

                <button className={resolveClassNames(styles["action-button"])} value={ACTIONS.ADD} type="submit" disabled={assertions.isWorking}>
                    {(state === "adding") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Plus" />}
                </button>
            </>}
    </form>
};

export default CartQuantityControlForm;