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
import Icon from "components/icon";
import Tag from "components/tags";

import RestaurantEventCard from "components/cards/restaurantEvent";

import PaymentTypesList from "components/lists/paymentOptions";

import Cart from "components/tables/cart";

import styles from "./Events.module.css";

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

    const {
        create: createUserOrder
    } = useOrders();

    const {
        user
    } = useProfile();

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

    switch (true) {
        case (!event_id): {
            return <div data-state="warning" className="w-full flex flex-col justify-center items-center gap-2 h-full">
                <Icon name="ExclamationCircle" />

                Não foi seleccionado um evento para fazer checkout
            </div>
        }

        default: {
            switch (state) {
                case "loading": {
                    return <section className={resolveClassNames("w-full h-full", className)} {...props}>
                        <div className="w-full h-full flex flex-col justify-center items-center gap-2">
                            <Icon name="Loading" className="animate-spin" />
                        </div>
                    </section>
                }

                default: {
                    return <>
                        {restaurant_event && <section className={styles.info}>
                            <RestaurantEventCard
                                className="w-full"
                                restaurantEvent={restaurant_event}
                                mode="default"
                                type="component"
                                disableLink
                                disableVideo
                            />

                            <p className="w-full">
                                {restaurant_event.description}
                            </p>
                        </section>}

                        {!Boolean(cart.length) && <div data-state="warning" className="w-full flex flex-row justify-center items-center gap-3 p-3">
                            <Icon name="Warning" className="text-2xl" />

                            <span>Precisa de adicionar pelo menos 1x ingresso no carrinho antes de fazer uma reserva</span>
                        </div>}

                        <section className={styles.tickets}>
                            <header>
                                <h2>
                                    Ingressos e outros
                                </h2>
                            </header>

                            <div className="w-full flex flex-col justify-start items-start">
                                <ul>
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

                                            <span className="w-[52px] text-center">{quantity}</span>

                                            <Button value={t.product_id} onClick={addItem} data-shape="round" disabled={isInQueue}>
                                                {whileQuantityIncreases ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Plus" />}
                                            </Button>
                                        </li>
                                    })}
                                </ul>

                                <Cart
                                    className={resolveClassNames(styles.cart, "w-full")}
                                    mode="order"
                                    type="event"
                                    hideQuantityControls
                                    hideInstructions
                                    hideTTP
                                />
                            </div>

                            <form onSubmit={POST} className="w-full">
                                <fieldset>
                                    <legend>
                                        <Tag variant="secondary">
                                            <Icon name="Phone" />

                                            Contacto
                                        </Tag>
                                    </legend>

                                    <div className={styles["contact-fields"]}>
                                        <label className="flex flex-col justify-start items-start" htmlFor="phone">
                                            <span className="font-extrabold">Nº do telefone</span>

                                            <span>Contacto passado por defeito para o Multicaixa express e também mantido como ponto principal para ligações ou envio de mensagens</span>
                                        </label>

                                        <div className="flex flex-row justify-start items-center">
                                            <select ref={$selectRef} title="Código do telefone" id="code" name="code" defaultValue={user?.phone ? parsePhoneCode(user?.phone) : ""} required>
                                                <option hidden value="">Seleciona um código</option>

                                                {PHONE_CODES.map(({ code }) => <option key={code} value={code}>
                                                    {code}
                                                </option>)}
                                            </select>

                                            <input
                                                className="w-full text-center"
                                                defaultValue={user?.phone ? parsePhoneNumber(user?.phone) : ""}
                                                name="phone"
                                                id="phone"
                                                pattern={stringRegularExpressions.get("PhoneNumber")}
                                                placeholder="Nº do telefone com WhatsApp"
                                                type="tel"
                                                required
                                                onChange={selectPhoneCode($selectRef)}
                                            />
                                        </div>
                                    </div>
                                </fieldset>

                                {(summary.totalPrice > 0) && <fieldset className="w-full">
                                    <legend>
                                        <Tag variant="secondary">
                                            <Icon name="Money" />

                                            Pagamento
                                        </Tag>
                                    </legend>

                                    <PaymentTypesList
                                        mode="eligible"
                                        selectionMode="radio"
                                        className="w-full"
                                        required
                                        selectable
                                    />
                                </fieldset>}

                                <Button
                                    className="w-full"
                                    disabled={isLoading || !Boolean(cart.length)}
                                    type="submit"
                                    variant={error ? "danger" : "primary"}
                                >
                                    {error && <Icon name="ExclamationCircle" />}

                                    {isLoading
                                        ? <Icon name="Loading" className="animate-spin" />
                                        : (error)
                                            ? error.message
                                            : `Reservar ingressos (${!summary.totalPrice ? "Grátis" : formatNumber(summary.totalPrice)})`
                                    }
                                </Button>
                            </form>
                        </section>
                    </>
                }
            }
        }
    };
};

export default EventsCheckoutPage;