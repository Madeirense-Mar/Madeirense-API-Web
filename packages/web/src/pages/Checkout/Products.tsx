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
    ILocator,
    type restaurantType,
} from "@Madeirense/shared";

import {
    selectPhoneCode
} from "components/utilities/DOM";

import MXP$App from "configurations";

import useCurrentLocation from "hooks/useCurrentLocation";

import { useFlasher } from "contexts/Flasher";

import Button from "components/buttons";
import RestaurantCard from "components/cards/restaurant";

import DropOffFieldset, {
    DropOffFieldset$Types
} from "components/forms/elements/fieldsets/dropOff";

import Icon from "components/icon";

import DeliveryLocationsSelector from "components/forms/elements/selects/deliveryLocations";

import PaymentTypesList from "components/lists/paymentOptions";

import Cart from "components/tables/cart";

import { useProfile } from "contexts/Profile";
import { useCart } from "contexts/Cart";
import { useOrders } from "contexts/Orders";
import { useApp } from "contexts/App";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type { IPageState } from "components/interface";
import Tag from "components/tag";

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

    const [page, updatePage] = useState<IPageState<DropOffFieldset$Types.location, ("splitting" | "ordering")>>({
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

            if (!page.data) throw new Error("Must select a valid address");

            switch (true) {
                case (elements.namedItem("location_id") !== null):
                    location_id = parseInt((elements.namedItem("location_id") as HTMLSelectElement).value);

                    break;

                default:
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

        if (!currentLocation || !restaurants) return;

        function getNearestRestaurant(location: ILocator, restaurants: restaurantType[]) {
            return findNearestRestaurant(location, restaurants);
        };

        setRestaurant(getNearestRestaurant(currentLocation, restaurants));

        return () => { };
    }, [currentLocation, getAppProperties]);

    return <>
        <section className="flex flex-col justify-center items-center py-6 w-full">
            {!restaurant && <Tag variant="danger">
                Não estamos a aceiter pedidos por agora, tente mais tarde
            </Tag>}

            {restaurant && <RestaurantCard className="w-full" {...{ restaurant }} />}
        </section>

        <Cart className="w-full" mode="order" type="delivery" />

        <form onSubmit={POST} className="w-full flex flex-col justify-start items-center gap-7">
            <fieldset className="w-full">
                <legend>Contacto</legend>

                <div className="flex flex-row justify-start items-center w-full gap-3">
                    <select ref={$selectRef} title="Código do telefone" id="code" name="code" required defaultValue={user?.phone ? parsePhoneCode(user?.phone) : ""}>
                        <option hidden value="">Seleciona um código</option>

                        {PHONE_CODES.map(({ country, code }) => <option key={code} value={code}>
                            {`(${code}) ${country}`}
                        </option>)}
                    </select>

                    <input
                        id="phone"
                        type="tel"
                        name="phone"
                        required
                        onChange={selectPhoneCode($selectRef)}
                        placeholder="Nº do telefone com WhatsApp"
                        pattern={stringRegularExpressions.get("PhoneNumber")}
                        defaultValue={user?.phone ? parsePhoneNumber(user?.phone) : ""}
                        className="w-full"
                    />
                </div>
            </fieldset>

            {(showMap)
                ? <>
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
                        onLocationSelect={(address) => updatePage(c => { return { ...c, data: address } })}
                    />
                </>

                : <fieldset className="w-full">
                    <legend>Localização</legend>

                    <div className="w-full flex flex-row justify-start items-center gap-3">
                        {user?.Delivery_Locations && <DeliveryLocationsSelector
                            locations={user.Delivery_Locations}
                            defaultLocationId={preferredLocation}
                            name="location_id"
                            id="location_id"
                        />}

                        <Button shape="circle" variant="secondary" onClick={() => toggleMap(t => !t)}>
                            <Icon name="MapMarker" />
                        </Button>
                    </div>
                </fieldset>
            }

            <fieldset className="w-full">
                <legend>Pagamento</legend>

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
        </form>
    </>
};

export default ProductsCheckoutPage;