import {
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type SubmitEvent,
    type MouseEvent
} from "react";

import {
    useNavigate,
    useSearchParams
} from "react-router-dom";

import {
    PHONE_CODES,
    parsePhoneCode,
    formatNumber,
    parsePhoneNumber,
    stringRegularExpressions,
    resolveClassNames
} from "@Madeirense/shared";

import { selectPhoneCode } from "components/utilities/DOM";

import { useApp } from "contexts/App";
import { useCart } from "contexts/Cart";
import { useFlasher } from "contexts/Flasher";
import { useOrders } from "contexts/Orders";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";

import RestaurantCard from "components/cards/restaurant";
import RestaurantEventCard from "components/cards/restaurantEvent";

import Icon from "components/icon";

import PaymentTypesList from "components/lists/paymentOptions";

import Cart from "components/tables/cart";

import type {
    $Enums
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

type queueEntry = {
    product_id: number,
    type: "adding" | "removing",
};

const ResortCheckoutPage = ({ className, ...props }: ComponentProps<"section">) => {
    const $selectRef = useRef<HTMLSelectElement | null>(null);

    const {
        get,
        state,
    } = useApp();

    const {
        add,
        cart: _c,
        clear$Dry,
        remove
    } = useCart();

    const {
        eventCart: cart,
        eventSummary: summary
    } = _c;

    const { user } = useProfile();

    const [searchParams] = useSearchParams();

    const event_id = searchParams.get('event_id');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);


    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        try {

        } catch (e) {
            setError(new Error((e as Error).message));
        } finally {
            setIsLoading(false);
        }
    };

    const $sectionProps = {
        "className": resolveClassNames(className),
        ...props
    };

    switch (true) {
        case (!event_id): {
            return <section {...$sectionProps}>
                <p data-state="error" className="p-2 w-full flex flex-row justify-start items-center gap-2">
                    <Icon name="ExclamationCircle" />

                    Não foi seleccionado um evento para fazer checkout
                </p>
            </section>
        };

        default: {
            switch (state) {
                case "loading": {
                    const {
                        className: cn,
                        ...$sp
                    } = $sectionProps;

                    return <section className={resolveClassNames("w-full h-full", cn)} {...$sp}>
                        <div className="w-full h-full flex flex-col justify-center items-center gap-2">
                            <Icon name="Loading" className="animate-spin" />
                        </div>
                    </section>
                };

                default: {
                    return <>
                        resort
                    </>
                }
            };
        }
    };
};

export default ResortCheckoutPage;