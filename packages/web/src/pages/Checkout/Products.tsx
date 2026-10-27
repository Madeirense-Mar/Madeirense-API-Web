import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    PHONE_CODES,
    calculateDistance,
    findNearestRestaurant,
    formatNumber,
    generateRandomNumbers,
    parsePhoneCode,
    parsePhoneNumber,
    stringRegularExpressions,
    type ILocator,
    type restaurantType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useCart } from "contexts/Cart";
import { useFlasher } from "contexts/Flasher";
import { useOrders } from "contexts/Orders";
import { useProfile } from "contexts/Profile";

import useCurrentLocation from "hooks/useCurrentLocation";

import {
    selectPhoneCode
} from "components/utilities/DOM";

import Button from "components/buttons";
import Tag from "components/tags";
import Icon from "components/icon";

import RestaurantCard from "components/cards/restaurant";

import DropOffFieldset, { type DropOffFieldset$Types } from "components/forms/elements/fieldsets/dropOff";
import DeliveryLocationsSelector from "components/forms/elements/selects/deliveryLocations";

import PaymentTypesList from "components/lists/paymentOptions";

import Cart from "components/tables/cart";

import styles from "./Products.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type { IPageState } from "components/interface";

// ***************************************************************************************************************

const ProductsCheckoutPage = ({ className, ...props }: ComponentProps<"section">) => {
    const $selectRef = useRef<HTMLSelectElement | null>(null);

    const {
        get: getAppProperties
    } = useApp();

    const {
        cart,
        clear$Dry,
        state: cartState,
    } = useCart();

    const currentLocation = useCurrentLocation();

    const { flash } = useFlasher();

    const {
        create: createUserOrder
    } = useOrders();

    const { user } = useProfile();

    const navigate = useNavigate();

    const {
        deliverySummary: summary
    } = cart;

    const {
        "delivery-locations": deliveryLocations
    } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const [page, updatePage] = useState<IPageState<DropOffFieldset$Types.location | null, ("splitting" | "ordering")>>({
        data: null,
        error: null,
        status: "idle"
    });

    const [restaurant, setRestaurant] = useState<restaurantType | null>(null);
    const [showMap, toggleMap] = useState<boolean>(!Boolean((user?.Delivery_Locations ?? []).length));

    const assertions = {
        "isLoading": [
            [
                "applying-coupon"
            ].includes(cartState),
            [
                "ordering"
            ].includes(page.status)
        ].includes(true),
        "hasSuccessfullySubmitted": (page.status === "success")
    };

    const preferredLocation = useMemo(() => {
        const preferred_location = user?.Delivery_Locations?.find(({ preferred = false }) => preferred)?.location_id ?? null;

        if (preferred_location) return preferred_location;

        if (!currentLocation) return undefined;

        const distances = ((user?.Delivery_Locations ?? []).map(d => calculateDistance(
            { latitude: currentLocation?.latitude, longitude: currentLocation?.longitude },
            { latitude: parseFloat(`${d.latitude}`), longitude: parseFloat(`${d.longitude}`) }
        )));

        const index = distances.indexOf(Math.min(...distances));

        return (user?.Delivery_Locations ?? [])[index]?.location_id ?? undefined;
    }, [
        currentLocation,
        user
    ]);

    const handleLocationUpdate = (address: typeof page.data) => {
        updatePage(c => { return { ...c, data: address } })
    };

    const handleMapToggle = () => toggleMap(t => !t);

    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;

        const elements = $form.elements;

        let location_id: number;

        const waitForCartIdleState = () => {
            return new Promise<void>((resolve) => {
                switch (cartState) {
                    case "error":
                    case "idle": resolve(); return;

                    default: const intervalId = setInterval(() => {
                        if (`${cartState}` === "idle") {
                            clearInterval(intervalId);

                            resolve();
                        }
                    }, 100);
                };
            });
        };

        try {
            updatePage(c => { return { ...c, error: null, state: "ordering" } });

            await waitForCartIdleState();

            switch (true) {
                case (elements.namedItem("location_id") !== null):
                    location_id = parseInt((elements.namedItem("location_id") as HTMLSelectElement).value);

                    break;

                default:
                    if (!page.data) throw new Error("Must select a valid address");

                    const useTempName = !(elements.namedItem("save_dropoff_location") as HTMLInputElement).checked;

                    ({ location_id } = (
                        await deliveryLocations.create({
                            name: useTempName
                                ? `REF-LOCATION-${generateRandomNumbers(7)}`
                                : (elements.namedItem("delivery_location_name") as HTMLInputElement).value,
                            special_instructions: (elements.namedItem("delivery_special_instructions") as HTMLTextAreaElement).value,
                            preferred: true,
                            ...page.data as any
                        }) ?? { location_id: -1 }
                    ));

                    break;
            }

            await createUserOrder({
                cartType: "delivery",
                restaurant_id: restaurant?.restaurant_id as number,
                delivery_address: location_id,
                coupon_id: summary.coupon?.coupon_id,
                payment_method: ((elements.namedItem("payment_method") as RadioNodeList).value as $Enums.Payments_payment_method),
                special_instructions: (document.querySelector(`textarea[name="special_instructions"]`) as HTMLTextAreaElement).value,
                contact_phone: [
                    (elements.namedItem("code") as HTMLSelectElement).value as string,
                    parsePhoneNumber((elements.namedItem("phone") as HTMLInputElement).value as string)
                ].join(''),
            });

            clear$Dry("delivery");

            flash("PLACED_ORDER");

            updatePage(c => { return { ...c, status: "success" } });

            navigate("/");
        } catch (e) {
            updatePage(c => { return { ...c, status: "error", error: new Error((e as Error).message) } });
        }
    }

    // TODO: Implement split bill function
    // async function splitBill() { }

    useEffect(() => {
        const restaurants = getAppProperties("Restaurants");

        if (!restaurants) return;

        if (!currentLocation) {
            setRestaurant(restaurants[0]);

            return;
        }

        function getNearestRestaurant(location: ILocator, restaurants: restaurantType[]) {
            return findNearestRestaurant(location, restaurants);
        };

        setRestaurant(getNearestRestaurant(currentLocation, restaurants));

        return () => { };
    }, [currentLocation, getAppProperties]);

    return <>
        <section className={styles.info}>
            <header>
                <h2>Pedido</h2>
            </header>

            {restaurant
                ? <RestaurantCard className="w-full" {...{ restaurant }} />
                : <Tag variant="danger" className="m-auto">
                    Não estamos a aceiter pedidos por agora, tente mais tarde
                </Tag>
            }

            <Cart className="w-full" mode="order" type="delivery" />
        </section>

        <section className={styles["contact-payment"]}>
            <header>
                <h2>Contacto e endereço</h2>
            </header>

            <form onSubmit={POST} className={styles.form}>
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
                                className="w-full"
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

                {(showMap)
                    ? <div className="flex flex-col justify-start items-start w-full">
                        {Boolean((user?.Delivery_Locations ?? []).length) && <Button
                            className="ml-auto"
                            variant="secondary"
                            onClick={() => toggleMap(t => !t)}
                        >
                            Fechar o mapa
                        </Button>}

                        <DropOffFieldset
                            className="w-full"
                            initialLocation={(!currentLocation)
                                ? undefined
                                : {
                                    latitude: currentLocation.latitude,
                                    longitude: currentLocation.longitude
                                }
                            }
                            onLocationSelect={handleLocationUpdate}
                        />
                    </div>

                    : <fieldset>
                        <legend>
                            <Tag variant="secondary">
                                <Icon name="MapMarked" />

                                Seleccionar ponto de entrega
                            </Tag>
                        </legend>

                        <div className={styles["location-fields"]}>
                            <label className="flex flex-col justify-start items-start" htmlFor="location_id">
                                <span className="font-extrabold">Endereços salvos</span>

                                <span>Seleccionar o endereço pre-definido de entrega. O seu endereço mais próximo do restaurante já foi escolhido por defeito</span>
                            </label>

                            {user?.Delivery_Locations && <DeliveryLocationsSelector
                                locations={user.Delivery_Locations}
                                defaultLocationId={preferredLocation}
                                name="location_id"
                                id="location_id"
                            />}
                        </div>

                        <Button className="ml-auto" variant="secondary" onClick={handleMapToggle}>
                            <Icon name="MapMarker" />

                            Seleccionar endereço alternativo no mapa
                        </Button>
                    </fieldset>
                }

                <fieldset className="w-full">
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
                </fieldset>

                <Button
                    type={(assertions.hasSuccessfullySubmitted) ? "button" : "submit"}
                    variant={(assertions.hasSuccessfullySubmitted) ? "success" : page.error ? "danger" : "primary"}
                    className="w-full"
                    disabled={assertions.isLoading}
                >
                    {page.error && <Icon name="ExclamationCircle" />}

                    {(assertions.isLoading)
                        ? <Icon name="Loading" className="animate-spin" />
                        : (assertions.hasSuccessfullySubmitted)
                            ? "Pedido feito"
                            : page.error
                                ? page.error.message
                                : `Fazer pedido (${formatNumber(summary.totalPrice)})`
                    }

                    {page.error && <Icon name="ExclamationCircle" />}
                </Button>

                {/* 
            TODO: Implement bill splitting trigger
            <footer>
            <Button className="w-1/4" variant="secondary" onClick={splitBill} disabled={isLoading}>
                Dividir conta
            </Button> 
            </footer>
            */}
            </form >
        </section>
    </>
};

export default ProductsCheckoutPage;