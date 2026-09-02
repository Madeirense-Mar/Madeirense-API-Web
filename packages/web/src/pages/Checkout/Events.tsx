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

const EventsCheckoutPage = ({ className, ...props }: ComponentProps<"section">) => {
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

    const { flash } = useFlasher();

    const navigate = useNavigate();

    const { create: createUserOrder } = useOrders();

    const { user } = useProfile();

    const [searchParams] = useSearchParams();

    const event_id = searchParams.get('event_id');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [queue, setQueue] = useState<queueEntry[]>([]);

    const restaurant_event = useMemo(() => !event_id ? null : get("Restaurant_Events")?.find(event => event.event_id === parseInt(event_id)), [event_id, get]);
    const restaurant = useMemo(() => !restaurant_event ? null : get("Restaurants")?.find(r => r.restaurant_id === restaurant_event?.restaurant_id), [restaurant_event, get]);
    const tickets = useMemo(() => (restaurant_event?.Products ?? []).filter(({ product_type }) => product_type === "ticket"), [restaurant_event]);

    async function addItem(e: MouseEvent<HTMLButtonElement>) {
        const product_id = parseInt((e.target as HTMLButtonElement).value);

        if (!product_id) return;

        setQueue(q => [...q, { product_id, type: "adding" }]);
        setError(null);

        await add(product_id);

        setQueue(q => q.filter(q => q.product_id !== product_id));
    };

    async function removeItem(e: MouseEvent<HTMLButtonElement>) {
        const product_id = parseInt((e.target as HTMLButtonElement).value);

        setQueue(q => [...q, { product_id, type: "removing" }]);
        setError(null);

        await remove(product_id);

        setQueue(q => q.filter(q => q.product_id !== product_id));
    };

    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        try {
            setIsLoading(true);
            setError(null);

            await createUserOrder({
                cartType: "event",
                restaurant_id: restaurant_event?.restaurant_id as number,
                delivery_address: restaurant?.Delivery_Locations?.location_id as number,
                special_instructions: "",
                event_id: restaurant_event?.event_id as number,
                coupon_id: summary.coupon?.coupon_id,
                payment_method: ((elements.namedItem("payment_method") as RadioNodeList)?.value as $Enums.Payments_payment_method) ?? "Offer",
                contact_phone: [
                    (elements.namedItem("code") as HTMLSelectElement).value as string,
                    parsePhoneNumber((elements.namedItem("phone") as HTMLInputElement).value as string)
                ].join(''),
            });

            flash("RESERVED_EVENT");

            clear$Dry("event");

            navigate("/");
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
                        {restaurant_event && <section>
                            <RestaurantEventCard className="w-full" restaurantEvent={restaurant_event} mode="default" type="component" disableLink disableVideo />

                            <h2 className="mb-3 mt-6">
                                <Icon name="Notes" className="inline-flex mr-1" />

                                Sobre o evento
                            </h2>

                            <p className="w-full">{restaurant_event.description}</p>
                        </section>}

                        <section>
                            <h2 className="mb-3 mt-6">
                                <Icon name="Ticket" className="inline-flex mr-1" />

                                Ingressos e outros
                            </h2>

                            <ul className="w-full flex flex-col justify-start items-center rounded-lg border p-2 gap-2">
                                {tickets.map(t => {
                                    const quantity = cart.find(p => p.product_id === t.product_id)?.quantity ?? 0;

                                    const whileQuantityDecreases = queue.some(q => q.product_id === t.product_id && q.type === "removing");
                                    const whileQuantityIncreases = queue.some(q => q.product_id === t.product_id && q.type === "adding");

                                    const isInQueue = [
                                        whileQuantityDecreases,
                                        whileQuantityIncreases
                                    ].includes(true);

                                    return <li key={t.product_id} className="w-full flex flex-row justify-start items-center gap-3">
                                        <span data-text="tag" className="mr-auto inline-flex items-center gap-1">
                                            <Icon name="Ticket" />

                                            {t.name}
                                        </span>

                                        <span className="font-extrabold">
                                            <Icon name="Money" className="inline-flex mr-1" />

                                            {Boolean(parseInt(t.price.toString())) ? formatNumber(parseFloat(t.price.toString())) : "Grátis"}
                                        </span>

                                        <Button value={t.product_id} onClick={removeItem} data-shape="round" variant="secondary" disabled={isInQueue}>
                                            {whileQuantityDecreases ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Minus" />}
                                        </Button>

                                        <span className="w-[50px] text-center">{quantity}</span>

                                        <Button value={t.product_id} onClick={addItem} data-shape="round" disabled={isInQueue}>
                                            {whileQuantityIncreases ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Plus" />}
                                        </Button>
                                    </li>
                                })}
                            </ul>
                        </section>

                        <section>
                            <h2 className="mb-3 mt-6">
                                <Icon name="ShoppingCart" className="inline-flex mr-1" />

                                Carrinho
                            </h2>

                            <Cart className="w-full" type="event" mode="order" hideInstructions hideTTP />
                        </section>

                        <section>
                            <h2 className="mt-6">
                                <Icon name="Phone" className="inline-flex mr-1" />

                                {`Contacto${!summary.totalPrice ? "" : " e pagamento"}`}
                            </h2>

                            <form onSubmit={POST}>
                                <fieldset>
                                    <legend>Contacto</legend>

                                    <label htmlFor="phone">Nº do telefone</label>

                                    <div className="flex flex-row justify-start items-center w-full">
                                        <select ref={$selectRef} title="Código do telefone" id="code" name="code" required defaultValue={user?.phone ? parsePhoneCode(user?.phone) : ""}>
                                            <option hidden value="">Seleciona um código</option>

                                            {PHONE_CODES.map(({ country, code }) => <option key={code} value={code}>
                                                {`(${code}) ${country}`}
                                            </option>)}
                                        </select>

                                        <input id="phone" type="tel" name="phone" required onChange={selectPhoneCode($selectRef)} placeholder="Nº do telefone com WhatsApp" pattern={stringRegularExpressions.get("PhoneNumber")} defaultValue={user?.phone ? parsePhoneNumber(user?.phone) : ""} className="w-full" />
                                    </div>
                                </fieldset>

                                {(summary.totalPrice > 0) && <fieldset>
                                    <legend>Pagamento</legend>

                                    <PaymentTypesList
                                        mode="eligible"
                                        selectionMode="radio"
                                        className="w-full"
                                        required
                                        selectable
                                    />
                                </fieldset>}

                                {!Boolean(cart.length) && <div data-state="warning" className="w-full flex flex-row justify-center items-center">
                                    <Icon name="Warning" />

                                    <span>Precisa de adicionar pelo menos 1x ingresso no carrinho antes de fazer uma reserva</span>
                                </div>}

                                <footer className="w-full">
                                    <Button type="submit" variant={error ? "danger" : "primary"} className="w-full" disabled={isLoading || !Boolean(cart.length)}>
                                        {error && <Icon name="ExclamationCircle" />}

                                        {isLoading ? <Icon name="Loading" className="animate-spin" /> : error ? error.message : `Reservar ingressos (${!summary.totalPrice ? "Grátis" : formatNumber(summary.totalPrice)})`}

                                        {error && <Icon name="ExclamationCircle" />}
                                    </Button>
                                </footer>
                            </form>
                        </section>
                    </>
                }
            };
        }
    };
};

export default EventsCheckoutPage;