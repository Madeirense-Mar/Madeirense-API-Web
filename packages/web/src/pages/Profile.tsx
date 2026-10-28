import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type MouseEvent,
    type SubmitEvent
} from "react";

import {
    APP_TTL_DEFAULT,
    DEFAULT_APP_PREFERENCES,
    PHONE_CODES,
    generateRandomNumbers,
    resolveClassNames,
    type appPreferencesType,
    type parsedAddressObjectType
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
import { useProfile } from "contexts/Profile";

import { Root$Enumerators } from "styles/enumerators";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import ProductCard from "components/cards/product";
import Icon from "components/icon";
import Tag from "components/tags";

import DropOffFieldset from "components/forms/elements/fieldsets/dropOff";
import DescriptionLabel from "components/forms/elements/labels/description";

import productGridStyles from "components/grids/products/menu.module.css";
import DeletionForm from "components/modals/forms/delete";

import styles from "./Profile.module.css";

import type {
    Delivery_Locations,
    Users
} from "@Madeirense/database/browser";

import type {
    IPageState
} from "components/interface";

// ***************************************************************************************************************

enum Forms {
    "profile" = "profile",
    "locations" = "locations",
    "favorites" = "favorites",
    "orders" = "orders",
    "settings" = "settings"
};

enum UniqueFields {
    email = "email",
    phone = "phone"
}

type forms = keyof typeof Forms;

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
    preferences: appPreferencesType,
    alerts?: Partial<Record<keyof typeof UniqueFields, string>>
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
    const $accountFormRef = useRef<HTMLFormElement | null>(null);
    const $accountSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const $selectRef = useRef<HTMLSelectElement | null>(null);

    const { get } = useApp();
    const { users: usersAPI } = MXP$App.Base.Business.endpoints;

    const currentLocation = useCurrentLocation();

    const { flash } = useFlasher();

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

    const { Storage } = useMemo(() => MXP$App, []);

    const [page, updatePage] = useState<IPageState<stateType, `${("deleting" | "saving")}-${forms}`>>({
        data: {
            alerts: undefined,
            deliveryLocations: [],
            preferences: DEFAULT_APP_PREFERENCES
        },
        status: "idle",
        error: null
    });

    const {
        alerts,
        deliveryLocations,
        preferences
    } = page.data ?? {};

    const [pickedDeliveryLocation, setPickedDeliveryLocation] = useState<{
        special_instructions?: string,
        name?: string,
        location_id?: number,
        latitude: number,
        longitude: number
    } & parsedAddressObjectType | null>(null);

    const [showDeliveryLocationMap, toggleDeliveryLocationMap] = useState(false);
    const [validationStates, setValidationStates] = useState<Record<UniqueFields, boolean>>(Object.fromEntries([
        ...Object.values(UniqueFields).map(v => [v, false])
    ]));

    const favoriteProducts = useMemo(() => (get("Products") ?? []).filter(({ product_id }) => user?.Favorites?.map(p => p.product_id).includes(product_id)), [user, get]);

    const defaultPhoneCode = PHONE_CODES.find(pc => (user?.phone || "").includes(pc.code))?.code ?? "";

    const assertions = {
        "cannotPerformAccountUpdate": [
            ...Object.values(UniqueFields).map(v => alerts?.[v] != undefined),
            ...Object.values(validationStates)
        ].includes(true),

        "isAccountFormDisabled": [
            page.status === "saving-profile",
            ...Object.values(validationStates)
        ].includes(true)
    };

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

    async function handleLocationUpdate(delivery_location: { latitude: number, longitude: number } & parsedAddressObjectType) {
        setPickedDeliveryLocation(dl => ({ ...dl, ...delivery_location }));
    };

    function hideMap() {
        toggleDeliveryLocationMap(false);
        setPickedDeliveryLocation(null);
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

    function handlePhoneNumberChange(event: ChangeEvent<HTMLInputElement>) {
        selectPhoneCode($selectRef)(event);

        validateUniqueFields(event);
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

    function validateUniqueFields({ target }: ChangeEvent<HTMLElement>) {
        if ($accountSearchTimeoutRef.current)
            clearTimeout($accountSearchTimeoutRef.current);

        $accountSearchTimeoutRef.current = setTimeout(async () => {
            let foundUser: Users | null = null;
            let searchKey: string = "";

            try {
                switch (target.tagName.toLowerCase()) {
                    case "input":
                        if ((target as HTMLInputElement).value === "") break;
                        
                        searchKey = (target as HTMLInputElement).name;

                        setValidationStates(vs => ({ ...vs, [searchKey]: true }));

                        foundUser = await usersAPI.search({
                            [(target as HTMLInputElement).name]: (target as HTMLInputElement).value
                        });

                        break;

                    case "select":
                        if (!$accountFormRef.current) break;

                        const $formData = new FormData($accountFormRef.current);

                        if ($formData.get("phone") as string == "") break;
                        
                        searchKey = "phone";
                        
                        setValidationStates(vs => ({ ...vs, [searchKey]: true }));
                        
                        foundUser = await usersAPI.search({
                            "phone": [
                                $formData.get("code") as string,
                                $formData.get("phone") as string
                            ].join('')
                        });

                        break;
                }

                updatePage(p => ({
                    ...p,
                    data: {
                        ...p.data,
                        alerts: {
                            [searchKey]: (foundUser && foundUser.user_id != user?.user_id) ? `Já existe uma conta com este ${searchKey}` : undefined
                        }
                    },
                    error: null,
                }));
            } catch (error) {
                updatePage(p => ({ ...p, error: error as Error }));
            } finally {
                setValidationStates(vs => ({ ...vs, [searchKey]: false }));
            }
        }, 5000);
    };

    async function PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $form_data = new FormData($form);
        const $submitter = ((e.nativeEvent as any).submitter as HTMLButtonElement);

        if (!user) return;

        try {
            updatePage(p => ({ ...p, status: `saving-${$submitter.value as forms}` }));

            switch ($submitter.value as forms) {
                case "profile":
                    await update({
                        ...user,
                        name: $form_data.get("name") as string,
                        email: $form_data.get("email") as string,
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

                default:
                    throw new Error(`Unknown form submitter: ${$submitter.value}`);
            };
        } catch (error) {
            switch ($submitter.value as forms) {
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

    switch (user) {
        case undefined: {
            return <main className="flex flex-col justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </main>
        }

        default: {
            return <main className={styles.page}>
                <ProfilePictureButton src={user.profile_photo ?? "#"} size="xl" className="mx-auto" enableUpload />

                <section>
                    <form ref={$accountFormRef} onSubmit={PATCH} onReset={handleFormReset} data-state={assertions.isAccountFormDisabled ? "disabled" : "idle"}>
                        <fieldset>
                            <legend>
                                <Tag>
                                    <Icon name="User" />

                                    Conta
                                </Tag>

                                <hr />
                            </legend>


                            <DescriptionLabel
                                className="w-full"
                                title="Nome"
                                description={"Como lhe vamos chamar e o nome que será mostrados nas facturas e comunicações."}
                                input={{
                                    element: "input",
                                    props: {
                                        name: "name",
                                        type: "text",
                                        defaultValue: user.name,
                                        className: "w-full"
                                    }
                                }}
                            />
                        </fieldset>

                        <fieldset>
                            <legend>
                                <Tag>
                                    <Icon name="Phone" />

                                    Contacto
                                </Tag>

                                <hr />
                            </legend>


                            <DescriptionLabel
                                className="w-full"
                                title="E-mail"
                                description={"Endereço para onde serão enviados e-mails e algumas notificações."}
                                alerts={{
                                    error: alerts?.[UniqueFields.email]
                                }}
                                input={{
                                    element: "input",
                                    iconElement: validationStates[UniqueFields.email] ? <Icon name="Loading" className="animate-spin" /> : undefined,
                                    props: {
                                        className: "w-full",
                                        defaultValue: user.email,
                                        id: UniqueFields.email,
                                        name: UniqueFields.email,
                                        type: "email",
                                        onChange: validateUniqueFields
                                    }
                                }}
                            />

                            <div className={styles["contact-fields"]}>
                                <label className="flex flex-col justify-start items-start" htmlFor="phone">
                                    <span className="font-extrabold">Nº do telefone</span>

                                    <span>Contacto passado por defeito para o Multicaixa express e também mantido como ponto principal para ligações ou envio de mensagens</span>

                                    {alerts?.[UniqueFields.phone] && <Tag variant="danger">
                                        {alerts?.[UniqueFields.phone]}
                                    </Tag>}
                                </label>

                                <div className="flex flex-row justify-start items-center">
                                    {validationStates[UniqueFields.phone] && <Icon name="Loading" className="animate-spin" />}

                                    <select ref={$selectRef} title="Código do telefone" id="code" name="code" onChange={validateUniqueFields} defaultValue={defaultPhoneCode} required>
                                        <option hidden value="">Seleciona um código</option>

                                        {PHONE_CODES.map(({ code }) => <option key={code} value={code}>
                                            {code}
                                        </option>)}
                                    </select>

                                    <input
                                        defaultValue={user.phone.substring(defaultPhoneCode.length)}
                                        id={UniqueFields.phone}
                                        name={UniqueFields.phone}
                                        className="text-center"
                                        onChange={handlePhoneNumberChange}
                                        pattern="^(\+?\d{1,4}\s?)?\d{6,15}$"
                                        placeholder="Nº do telefone"
                                        type="tel"
                                        required
                                    />
                                </div>
                            </div>
                        </fieldset>

                        <div className="w-full flex flex-row justify-between items-center">
                            <Button type="reset" value={Forms.profile} variant="secondary" className="opacity-45 hover:opacity-100">
                                <Icon name="Clean" />

                                Reverter alterações
                            </Button>

                            <Button type="submit" value={Forms.profile} className="w-1/3" disabled={assertions.cannotPerformAccountUpdate}>
                                {page.status === "saving-profile"
                                    ? <Icon name="Loading" className="animate-spin" />
                                    : <Icon name="Save" />
                                }

                                Salvar
                            </Button>
                        </div>
                    </form>
                </section>

                <section>
                    <fieldset>
                        <legend>
                            <Tag>
                                <Icon name="MapMarked" />

                                Permissões
                            </Tag>

                            <hr />
                        </legend>

                        <DescriptionLabel
                            className="w-full"
                            title="Partilhar a minha localização"
                            description={<span className="opacity-70">
                                Nós precisamos da tua localização para saber onde envair os motoristas com os teus pedidos, sem esta permissão terás de especificar a tua localização sempre que fizeres um pedido.

                                <span className="italic underline ml-1">
                                    Para re-ativar/desativar a permissão da localização deve fazê-lo nas configurações de permissões do seu navegador.
                                </span>
                            </span>}
                            input={{
                                element: "button",
                                props: {
                                    value: preferences.location,
                                    className: "ml-auto",
                                    onClick: ["default", "deferred"].includes(preferences.location) ? handleLocationPermissionUpdate : undefined,
                                    variant: ["default", "deferred"].includes(preferences.location) ? "primary" : preferences.location === "allowed" ? "success" : "danger"
                                },
                                label: <>
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
                                </>
                            }}
                        />
                    </fieldset>

                    <fieldset>
                        <legend>
                            <Tag>
                                <Icon name="MapMarker" />

                                Pontos de entrega
                            </Tag>

                            <hr />
                        </legend>

                        {["default", "deferred", "denied"].includes(preferences.location) && <div data-state="warning" className="w-full flex flex-row justify-center items-center gap-3 p-3">
                            <Icon name="Warning" />

                            <p>Para usares esta funcionalidade precisas de partilhar a tua localização</p>
                        </div>}

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
                                <Button onClick={hideMap} variant="secondary" className="opacity-45 hover:opacity-100" disabled={page.status === "saving-locations"}>
                                    <Icon name="Close" />

                                    Cancelar
                                </Button>

                                <Button type="submit" value={Forms.locations} className="w-1/3" disabled={page.status === "saving-locations"}>
                                    {page.status === "saving-locations" ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Save" />}

                                    Salvar
                                </Button>
                            </div>
                        </form>}
                    </fieldset>
                </section>

                <section>
                    <fieldset>
                        <legend>
                            <Tag>
                                <Icon name="Product" />

                                Lista dos favoritos
                            </Tag>

                            <hr />
                        </legend>

                        {!favoriteProducts.length && <div data-state="empty">
                            <span>Ainda não tens produtos favoritos</span>
                        </div>}

                        <div className={resolveClassNames(productGridStyles.grid, "w-full")}>
                            {favoriteProducts.map(p => <ProductCard key={p.product_id} product={p} />)}
                        </div>
                    </fieldset>
                </section>

                <section>
                    <fieldset>
                        <legend>
                            <Tag>
                                <Icon name="Notification" />

                                Notificações
                            </Tag>

                            <hr />
                        </legend>

                        <DescriptionLabel
                            className="w-full"
                            title="A minha subscrição"
                            description={<span className="opacity-70">
                                Usamos subscrições para enviar notificações sobre os teus pedidos, novidades e avisos para o teu navegador. <span className="italic">Podes sempre rever a tua subscrição a qualquer altura.</span>
                            </span>}
                            input={{
                                element: "button",
                                props: {
                                    className: "w-full",
                                    value: preferences.notifications,
                                    onClick: handleNotificationSubscriptionUpdate,
                                    variant: ["default", "deferred"].includes(preferences.notifications) ? "primary" : preferences.notifications === "allowed" ? "danger" : "secondary"
                                },
                                label: <>
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
                                </>
                            }}
                        />

                    </fieldset>
                </section>

                <section className={styles["danger-zone"]}>
                    <fieldset>
                        <legend>
                            <Tag variant="danger">
                                <Icon name="Warning" />

                                Zona de perigo
                            </Tag>
                        </legend>

                        <DescriptionLabel
                            className="w-full"
                            title="Eliminar conta"
                            description={"Endereço para onde serão enviados e-mails e algumas notificações."}
                            alerts={{
                                warning: "Esta ação é irreversível."
                            }}
                            input={{
                                element: "button",
                                iconElement: (page.status === "deleting-profile") ? <Icon name="Loading" className="animate-spin" /> : undefined,
                                label: <>
                                    Eliminar a minha conta
                                </>,
                                props: {
                                    value: Forms.profile,
                                    variant: "danger",
                                    onClick: handleDeletion,
                                    type: "button",
                                    className: "w-full"
                                }
                            }}
                        />
                    </fieldset>
                </section>
            </main >
        }
    };
};

export default ProfilePage;