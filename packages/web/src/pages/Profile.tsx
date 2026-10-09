import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type SubmitEvent,
    type MouseEvent
} from "react";

import { useSearchParams } from "react-router-dom";

import {
    APP_TTL_DEFAULT,
    DEFAULT_APP_PREFERENCES,
    PHONE_CODES,
    generateRandomNumbers,
    resolveClassNames,
    type appPreferencesType,
    type keyValuePair,
    type parsedGoogleAddressObjectType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import {
    selectPhoneCode
} from "components/utilities/DOM";

import useCurrentLocation from "hooks/useCurrentLocation";

import { useApp } from 'contexts/App';
import { useFlasher } from "contexts/Flasher";
import { useModal } from "contexts/Modal";
import { useNotifications } from "contexts/Notifications";
import { useOrders } from "contexts/Orders";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import ProductCard from "components/cards/product";
import Icon from "components/icon";
import SliderPicker from "components/pickers/slider";
import Tag from "components/tags";

import DropOffFieldset from "components/forms/elements/fieldsets/dropOff";
import productGridStyles from "components/grids/products/menu.module.css";
import DeletionForm from "components/modals/forms/delete";

import { Root$Enumerators } from "styles/enumerators";

import type {
    Delivery_Locations
} from "@Madeirense/database/browser";

import type { IPageState } from "components/interface";


import "./Profile.css";

// ***************************************************************************************************************

type menuType = (
    | "profile"
    | "locations"
    | "favorites"
    | "orders"
    | "settings"
);

type partialDeliveryLocationType = Omit<Delivery_Locations, (
    | "latitude"
    | "location_id"
    | "longitude"
    | "user_id"
)> & {
    latitude: number,
    longitude: number
};

type stateType = {
    deliveryLocations: (Partial<Delivery_Locations>)[],
    menu: menuType,
    preferences: appPreferencesType
};

const defaultData: partialDeliveryLocationType = {
    address: "",
    city: "",
    country: "Angola",
    created_at: new Date(),
    updated_at: new Date(),
    name: "",
    neighborhood: "",
    postal_code: "",
    preferred: false,
    street_name: "",
    street_number: "",
    special_instructions: "",
    state: null,
    latitude: 0,
    longitude: 0,
};

function ProfilePage() {
    const $selectRef = useRef<HTMLSelectElement | null>(null);

    const { get } = useApp();

    const currentLocation = useCurrentLocation();

    const { flash } = useFlasher();

    const { orders } = useOrders();

    const {
        removeDeliveryLocation,
        requestLocationPermission,
        unsubscribe,
        update,
        upsertDeliveryLocation,
        user,
    } = useProfile();

    const { show } = useModal();
    const { push } = useNotifications();

    const [searchParams, updateSearchParams] = useSearchParams();

    const profileMenu = (searchParams.get("menu") ?? "profile") as menuType;

    const { Storage } = useMemo(() => MXP$App, []);

    const [page, updatePage] = useState<IPageState<stateType, `${("deleting" | "saving")}-${menuType}`>>({
        data: {
            menu: profileMenu,
            deliveryLocations: [],
            preferences: DEFAULT_APP_PREFERENCES
        },
        status: "idle",
        error: null
    });

    const {
        preferences = DEFAULT_APP_PREFERENCES,
        deliveryLocations = [],
        menu = profileMenu,
    } = page.data ?? {};

    const [pickedDeliveryLocation, setPickedDeliveryLocation] = useState<{
        special_instructions?: string,
        name?: string,
        location_id?: number,
        latitude: number,
        longitude: number
    } & parsedGoogleAddressObjectType | null>(null);

    const [showDeliveryLocationMap, toggleDeliveryLocationMap] = useState(false);

    const favoriteProducts = useMemo(() => (get("Products") ?? []).filter(({ product_id }) => user?.Favorites?.map(p => p.product_id).includes(product_id)), [user, get]);

    const defaultPhoneCode = PHONE_CODES.find(pc => (user?.phone || "").includes(pc.code))?.code ?? "";

    function handleDeletion() {
        show(<DeletionForm
            item="profile"
            itemId={user?.user_id as number}
            requireAuthentication
        />, { title: `Eliminar conta Madeirense` });
    };

    function handleFormReset(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        console.log("resetting", e);
    };

    async function handleLocationUpdate(delivery_location: { latitude: number, longitude: number } & parsedGoogleAddressObjectType) {
        setPickedDeliveryLocation(dl => ({ ...dl, ...delivery_location }));
    };

    function hideMap() {
        toggleDeliveryLocationMap(false);
        setPickedDeliveryLocation(null);
    };

    function handleMenuChange(type: string) {
        updatePage(p => ({ ...p, data: ({ ...p.data, menu: type as menuType } as stateType) }));

        searchParams.delete("menu");

        updateSearchParams(searchParams);
    };

    async function handleLocationPermissionUpdate({ target }: MouseEvent<HTMLButtonElement>) {
        await requestLocationPermission((result, error) => {
            if (result) updatePage(p => ({
                ...p, data: ({
                    ...p.data, preferences: {
                        ...p.data?.preferences,
                        location: "allowed" as appPreferencesType["location"]
                    }
                }) as stateType
            }));

            else switch ((error as GeolocationPositionError).code) {
                case GeolocationPositionError.PERMISSION_DENIED:
                    updatePage(p => ({
                        ...p, data: ({
                            ...p.data, preferences: {
                                ...p.data?.preferences,
                                location: "denied" as appPreferencesType["location"]
                            }
                        }) as stateType
                    }));
                    break;

                case GeolocationPositionError.POSITION_UNAVAILABLE:
                case GeolocationPositionError.TIMEOUT:
                    updatePage(p => ({
                        ...p, data: ({
                            ...p.data, preferences: {
                                ...p.data?.preferences,
                                location: "deferred" as appPreferencesType["location"]
                            }
                        }) as stateType
                    }));
                    break;

                default:
                    break;
            }
        });
    };

    async function handleNotificationSubscriptionUpdate({ target }: MouseEvent<HTMLButtonElement>) {
        switch ((target as HTMLButtonElement).value as appPreferencesType["notifications"]) {
            case "allowed":
                await unsubscribe("push-notification");

                const preferences = (await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

                Storage.setItem<appPreferencesType>("L_APP$PREFERENCES", {
                    ...preferences,
                    notifications: "deferred"
                });

                updatePage(p => ({ ...p, data: ({ ...p.data, preferences }) as stateType }));

                break;

            case "default":
            case "deferred":
            case "denied":
                flash("PUSH_NOTIFICATION_REQUEST");
                break;

            default:
                break;
        }
    };

    function showMap() {
        toggleDeliveryLocationMap(true)
    };

    function addLocation({ target }: MouseEvent<HTMLButtonElement>) {
        setPickedDeliveryLocation({
            ...defaultData as any,
            name: (target as HTMLButtonElement).id,
            location_id: parseInt((target as HTMLButtonElement).value),
            latitude: currentLocation?.latitude as number,
            longitude: currentLocation?.longitude as number,
            special_instructions: ""
        });

        showMap();
    };

    function editLocation({ target }: MouseEvent<HTMLButtonElement>) {
        const { longitude, latitude, ...location } = deliveryLocations.find(({ location_id }) => location_id?.toString() === (target as HTMLButtonElement).value) ?? {};

        setPickedDeliveryLocation({
            ...defaultData as any,
            ...location,
            latitude: parseFloat(`${latitude}`),
            longitude: parseFloat(`${longitude}`)
        });

        showMap();
    };

    async function removeLocation({ target }: MouseEvent<HTMLButtonElement>) {
        try {
            updatePage(p => ({ ...p, status: "saving-locations" }));

            await removeDeliveryLocation(parseInt((target as HTMLButtonElement).value));
        } catch (error) {
            push({
                id: "N#ERROR_REMOVING_DELIVERY_LOCATION",
                alert: (error as Error).message,
                type: "alert",
                options: {
                    variant: "danger",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } finally {
            updatePage(p => ({ ...p, status: "idle", data: ({ ...p.data, deliveryLocations: [] } as stateType) }));
        }
    };

    async function setPreferredLocation({ target }: MouseEvent<HTMLButtonElement>) {
        try {
            updatePage(p => ({ ...p, status: "saving-locations" }));

            const delivery_location = deliveryLocations.find(({ location_id: lId }) => lId === parseInt((target as HTMLButtonElement).value));

            if (!delivery_location) throw new Error("Unable to fin delivery_location")

            await upsertDeliveryLocation({ ...(delivery_location as any), preferred: true });
        } catch (error) {
            push({
                id: "N#ERROR_UPSERTING_DELIVERY_LOCATION",
                alert: (error as Error).message,
                type: "alert",
                options: {
                    variant: "danger",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } finally {
            updatePage(p => ({
                ...p,
                status: "idle",
                data: ({ ...p.data, deliveryLocations: [] } as stateType)
            }));
        }
    };

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);
        const $submitter = ((e.nativeEvent as any).submitter as HTMLButtonElement);

        if (!user) return;

        try {
            updatePage(p => ({ ...p, status: `saving-${$submitter.value as menuType}` }));

            switch ($submitter.value as menuType) {
                case "profile":
                    await update({
                        ...user,
                        name: $form_data.get("name") as string,
                        email: $form_data.get("e-mail") as string,
                        phone: [
                            $form_data.get("code") as string,
                            $form_data.get("phone") as string
                        ].join(''),
                    });
                    break;

                case "locations":
                    await upsertDeliveryLocation({
                        ...deliveryLocations.find(({ location_id }) => location_id?.toString() === $form.id) as any,
                        ...pickedDeliveryLocation,
                        name: $form_data.get("delivery_location_name") as string,
                        special_instructions: $form_data.get("delivery_special_instructions") ?? ""
                    });

                    hideMap();

                    break;

                case "favorites":
                    break;

                case "orders":
                    break;

                case "settings":
                    break;

                default:
                    break;
            };
        } catch (error) {
            switch ($submitter.value as menuType) {
                case "profile":
                    push({
                        id: "N#ERROR_UPDATING_PROFILE",
                        alert: (error as Error).message,
                        type: "alert",
                        options: {
                            variant: "danger",
                            ttl: APP_TTL_DEFAULT
                        }
                    });
                    break;

                case "locations":
                    push({
                        id: "N#ERROR_UPDATING_DELIVERY_LOCATION",
                        alert: (error as Error).message,
                        type: "alert",
                        options: {
                            variant: "danger",
                            ttl: APP_TTL_DEFAULT
                        }
                    });

                    break;

                case "favorites":
                    break;

                case "orders":
                    break;

                case "settings":
                    break;

                default:
                    break;
            };
        } finally {
            updatePage(p => ({
                ...p,
                status: "idle",
                data: ({ ...p.data, deliveryLocations: [] } as stateType)
            }));
        }
    };

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.profile
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    useEffect(() => {
        async function loadAppPreferences() {
            const preferences = (await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES")) ?? DEFAULT_APP_PREFERENCES;

            updatePage(p => ({
                ...p,
                data: ({ ...p.data, preferences }) as stateType
            }));
        };

        loadAppPreferences();
    }, [Storage]);

    useEffect(() => {
        if (page.data?.deliveryLocations.length !== 0) return;

        const home = user?.Delivery_Locations?.find(d => d.name === "Casa") ?? { ...defaultData, user_id: user?.user_id, location_id: generateRandomNumbers(6), name: "Casa" };
        const work = user?.Delivery_Locations?.find(d => d.name === "Trabalho") ?? { ...defaultData, user_id: user?.user_id, location_id: generateRandomNumbers(6), name: "Trabalho" };

        updatePage(p => ({
            ...p,
            data: {
                ...p.data,
                deliveryLocations: [
                    home,
                    work,
                    ...(user?.Delivery_Locations ?? []).filter(d => !["Casa", "Trabalho"].includes(d.name))
                ]
            } as stateType
        }));
    }, [
        page.data?.deliveryLocations,
        user
    ]);

    const menuList = [
        {
            key: "Perfil", value: {
                value: "profile",
                icon: (page.status === "saving-profile")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="User" />
            }
        },
        {
            key: "Pontos de entrega", value: {
                value: "locations",
                icon: (page.status === "saving-locations")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="MapMarker" />
            }
        },
        {
            key: "Favoritos", value: {
                value: "favorites",
                icon: (page.status === "saving-favorites")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="HeartFilled" />
            }
        },
        {
            key: "Definições", value: {
                value: "settings",
                icon: (page.status === "saving-settings")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="Settings" />
            }
        }
    ] as keyValuePair<string, { value: menuType, icon: any }>[];

    switch (user) {
        case undefined: {
            return <main className="flex flex-col justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </main>
        }

        default: {
            return <main className="flex flex-col justify-start items-start gap-6">
                <ProfilePictureButton src={user.profile_photo ?? "#"} size="xl" className="mx-auto" enableUpload />

                <SliderPicker defaultValue={profileMenu} list={menuList} onPick={handleMenuChange} />

                {(menu === "profile") && <section id={menu}>
                    <form onSubmit={PATCH} onReset={handleFormReset} className="w-full flex flex-col justify-start items-start gap-10" data-state={page.status === "saving-profile" ? "disabled" : "idle"}>
                        <fieldset className="flex flex-col justify-start items-start gap-3 w-full">
                            <legend className="flex flex-row justify-start items-center gap-2 text-2xl pb-2">
                                <Icon name="User" />

                                Conta
                            </legend>

                            <label className="flex flex-col justify-between items-start w-full">
                                <span>Nome</span>

                                <input name="name" type="text" data-element="h2" defaultValue={user.name} className="w-full" />
                            </label>
                        </fieldset>

                        <fieldset className="flex flex-col justify-start items-start gap-3 w-full">
                            <legend className="flex flex-row justify-start items-center gap-2 text-2xl pb-2">
                                <Icon name="Phone" />

                                Contato
                            </legend>

                            <label className="flex flex-col justify-between items-start w-full">
                                <span>E-mail</span>

                                <input name="e-mail" type="email" data-element="h2" defaultValue={user.email} className="w-full" />
                            </label>

                            <div className="w-full flex flex-col justify-between items-start">
                                <label htmlFor="phone">
                                    <span>Nº do telefone</span>
                                </label>

                                <div className="flex flex-row justify-start items-center w-full gap-2">
                                    <select ref={$selectRef} title="Código do telefone" id="code" name="code" data-element="h2" defaultValue={defaultPhoneCode} required className="text-center">
                                        <option hidden value="">Seleciona um código</option>

                                        {PHONE_CODES.map(({ country, code }) => <option key={code} value={code}>
                                            {code}
                                        </option>)}
                                    </select>

                                    <input defaultValue={user.phone.substring(defaultPhoneCode.length)} id="phone" className="w-full" type="tel" data-element="h2" name="phone" onChange={selectPhoneCode($selectRef)} placeholder="Nº do telefone" pattern="^(\+?\d{1,4}\s?)?\d{6,15}$" required />
                                </div>
                            </div>
                        </fieldset>

                        <fieldset className="flex flex-col justify-start items-start gap-3 w-full">
                            <legend className="flex flex-row justify-start items-center gap-2 text-2xl pb-2">
                                <Icon name="Lock" />

                                Privacidade
                            </legend>

                            <ul className="w-full flex flex-col justify-start items-start">
                                <li className="w-full flex flex-row justify-between items-center gap-2">
                                    <div>
                                        <span className="font-medium">Eliminar os meus dados</span>

                                        <p className="opacity-70">Esta ação é irreversível.</p>
                                    </div>

                                    <Button type="button" value={menu} variant="danger" className="w-1/3" onClick={handleDeletion}>
                                        {page.status === "deleting-profile" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Close" />}

                                        Eliminar a minha conta
                                    </Button>
                                </li>
                            </ul>
                        </fieldset>

                        <div className="w-full flex flex-row justify-between items-center">
                            <Button type="reset" value={menu} variant="secondary" className="opacity-45 hover:opacity-100">
                                <Icon name="Clean" />

                                Reverter alterações
                            </Button>

                            <Button type="submit" value={menu} className="w-1/3">
                                {page.status === "saving-profile" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Save" />}

                                Salvar
                            </Button>
                        </div>
                    </form>
                </section>}

                {(menu === "locations") && <section id={menu} className="flex flex-col w-full justify-start items-start gap-10">
                    <section>
                        <header>
                            <Icon name="MapMarked" />

                            Permissões
                        </header>

                        <div>
                            <p>
                                <span className="font-medium">Partilhar a minha localização</span>

                                <br />

                                <span className="opacity-70">
                                    Nós precisamos da tua localização para saber onde envair os motoristas com os teus pedidos, sem esta permissão terás de especificar a tua localização sempre que fizeres um pedido.

                                    <span className="italic underline ml-1">
                                        Para re-ativar/desativar a permissão da localização deve fazê-lo nas configurações de permissões do seu navegador.
                                    </span>
                                </span>
                            </p>

                            <Button
                                value={preferences.location}
                                className="ml-auto"
                                onClick={["default", "deferred"].includes(preferences.location) ? handleLocationPermissionUpdate : undefined}
                                variant={["default", "deferred"].includes(preferences.location) ? "primary" : preferences.location === "allowed" ? "success" : "danger"}
                            >
                                {(preferences.location === "allowed") && <>
                                    <Icon name="MapCheck" />

                                    A partilhar
                                </>}

                                {["default", "deferred"].includes(preferences.location) && <>
                                    <Icon name="MapCheck" />

                                    Partilhar
                                </>}

                                {(preferences.location === "denied") && <>
                                    <Icon name="MapOff" />

                                    Desativado
                                </>}
                            </Button>
                        </div>
                    </section>

                    <section>
                        <header className="w-full">
                            <Icon name="MapMarker" />

                            Pontos de entrega

                            {["default", "deferred", "denied"].includes(preferences.location) && <Tag variant="warning" className="ml-auto">
                                <Icon name="Warning" />

                                <p>Para usares esta funcionalidade precisas de partilhar a tua localização</p>
                            </Tag>}
                        </header>

                        {!showDeliveryLocationMap && <ul className="w-full flex flex-col justify-start items-start gap-1" data-state={["default", "deferred", "denied"].includes(preferences.location) ? "disabled" : "idle"}>
                            {deliveryLocations.map(d => {
                                const WASNT_DEFINED = [(d.latitude ?? "0").toString(), (d.longitude ?? "0").toString()].map(parseInt).some(v => v === 0);

                                return <li key={d.location_id} className="w-full flex flex-row justify-start items-center gap-2 rounded-md p-2">
                                    {(d.name === "Casa") ? <Icon name="Home" /> :
                                        (d.name === "Trabalho") ? <Icon name="Work" /> :
                                            ((d.name ?? "").includes("Madeirense")) ? <Icon name="Restaurant" /> :
                                                <Icon name="MapMarker" />
                                    }

                                    <span className="mr-auto font-bold text-2xl">
                                        {d.name}
                                    </span>

                                    {!WASNT_DEFINED && <Button
                                        id={d.name}
                                        value={d.location_id}
                                        shape="circle"
                                        variant={d.preferred ? "primary" : "secondary"}
                                        disabled={page.status === "saving-locations" || ["default", "deferred", "denied"].includes(preferences.location)}
                                        onClick={["default", "deferred", "denied"].includes(preferences.location) ? undefined : setPreferredLocation}
                                    >
                                        {d.preferred ? <Icon name="HeartFilled" className="pointer-events-none" /> : <Icon name="HeartEmpty" className="pointer-events-none" />}
                                    </Button>}

                                    <Button
                                        id={d.name}
                                        value={d.location_id}
                                        shape="circle"
                                        variant={WASNT_DEFINED ? "primary" : "secondary"}
                                        disabled={page.status === "saving-locations" || ["default", "deferred", "denied"].includes(preferences.location)}
                                        onClick={["default", "deferred", "denied"].includes(preferences.location) ? undefined : WASNT_DEFINED ? addLocation : editLocation}
                                    >
                                        {WASNT_DEFINED ? <Icon name="Plus" className="pointer-events-none" /> : <Icon name="Edit" className="pointer-events-none" />}
                                    </Button>

                                    <Button
                                        value={d.location_id}
                                        shape="circle"
                                        variant="danger"
                                        disabled={WASNT_DEFINED || page.status === "saving-locations" || ["default", "deferred", "denied"].includes(preferences.location)}
                                        onClick={(WASNT_DEFINED || ["default", "deferred", "denied"].includes(preferences.location)) ? undefined : removeLocation}
                                    >
                                        <Icon name="Trash" className="pointer-events-none" />
                                    </Button>
                                </li>
                            })}

                            <li className="w-full">
                                <Button onClick={["default", "deferred", "denied"].includes(preferences.location) ? undefined : showMap} className="w-full" variant="secondary" disabled={page.status === "saving-locations" || ["default", "deferred", "denied"].includes(preferences.location)}>
                                    <Icon name="Plus" />

                                    Adicionar localização de entrega
                                </Button>
                            </li>
                        </ul>}

                        {showDeliveryLocationMap && <form id={(pickedDeliveryLocation?.location_id ?? "").toString()} onSubmit={PATCH} className="w-full flex flex-col justify-start items-start gap-10">
                            <DropOffFieldset
                                className="w-full"
                                presetName={["Casa", "Trabalho"].includes(pickedDeliveryLocation?.name ?? "") ? pickedDeliveryLocation?.name : undefined}
                                defaultName={["Casa", "Trabalho"].includes(pickedDeliveryLocation?.name ?? "") ? undefined : pickedDeliveryLocation?.name}
                                defaultSpecialInstructions={pickedDeliveryLocation?.special_instructions}
                                initialLocation={(!pickedDeliveryLocation) ? undefined : {
                                    latitude: pickedDeliveryLocation.latitude,
                                    longitude: pickedDeliveryLocation.longitude
                                }}
                                onLocationSelect={handleLocationUpdate}
                                hideLegend
                                save
                            />

                            <div className="w-full flex flex-row justify-between items-center mt-4">
                                <Button onClick={hideMap} value={menu} variant="secondary" className="opacity-45 hover:opacity-100" disabled={page.status === "saving-locations"}>
                                    <Icon name="Close" />

                                    Cancelar
                                </Button>

                                <Button type="submit" value={menu} className="w-1/3" disabled={page.status === "saving-locations"}>
                                    {page.status === "saving-locations" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Save" />}

                                    Salvar
                                </Button>
                            </div>
                        </form>}
                    </section>
                </section>}

                {(menu === "favorites") && <section id={menu}>
                    {!favoriteProducts.length && <div data-state="empty">
                        <span>Ainda não tens produtos favoritos</span>
                    </div>}

                    <div className={resolveClassNames(productGridStyles.grid, "w-full")}>
                        {favoriteProducts.map(p => <ProductCard key={p.product_id} product={p} />)}
                    </div>
                </section>}

                {(menu === "settings") && <section id={menu}>
                    <header className="flex flex-row justify-start items-center gap-2 text-2xl font-black pb-2">
                        <Icon name="NotificationCircle" />

                        Notificações
                    </header>

                    <div>
                        <p>
                            <span className="font-medium">A minha subscrição</span> 
                            
                            <br/>

                            <span className="opacity-70">
                                Usamos subscrições para enviar notificações sobre os teus pedidos, novidades e avisos para o teu navegador. <span className="italic">Podes sempre rever a tua subscrição a qualquer altura.</span>
                            </span>
                        </p>

                        <Button
                            value={preferences.notifications}
                            className="ml-auto"
                            onClick={handleNotificationSubscriptionUpdate}
                            variant={["default", "deferred"].includes(preferences.notifications) ? "primary" : preferences.notifications === "allowed" ? "danger" : "secondary"}
                        >
                            {(preferences.notifications === "allowed") && <>
                                <Icon name="NotificationOff" />

                                Terminar subscrição
                            </>}

                            {["default", "deferred"].includes(preferences.notifications) && <>
                                <Icon name="Notification" />

                                Subscrever às notificações
                            </>}

                            {(preferences.notifications === "denied") && <>
                                <Icon name="NotificationActive" />

                                Ativar subscrição
                            </>}
                        </Button>
                    </div>

                </section>}
            </main>
        }
    };
};

export default ProfilePage;