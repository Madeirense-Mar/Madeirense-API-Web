import {
    ChangeEvent,
    useEffect,
    useState,
    type ClipboardEvent,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    DEFAULT_APP_SETTINGS,
    DAYS_OF_THE_WEEK,
    formatUUID_UC_CDN_URL,
    resolveClassNames,
    toTimeDecimal,
    type geocodedPlaceType,
    type parsedAddressObjectType,
    type restaurantType,
    type scheduleType,
} from "@Madeirense/shared";

import env from "env";

import {
    useApp
} from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import DescriptionLabel from "../elements/labels/description";
import AddressSelect from "../elements/selects/address";

import styles from "./restaurant.module.css";

import type {
    IComponentState
} from "components/interface";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    disableActions?: boolean;
    disableLink?: boolean;
    enableEditing?: boolean;
    mode?: "default" | "admin";
    restaurant: restaurantType;
    onSuccess?: (restaurant?: restaurantType) => void;
};

type stateDataType = {
    assumeSameHours: boolean,
    address?: parsedAddressObjectType & { latitude: any, longitude: any },
    uploadedThumbnailURL?: string
};

type statusType = (
    | "adding"
    | "updating"
    | "uploading-thumbnail"
);

const _defaultData: stateDataType = {
    assumeSameHours: true,
    address: undefined,
    uploadedThumbnailURL: undefined
};

type timeType = `${number}:${number}`;

type locationType = NonNullable<stateDataType["address"]>;

/** Optional text fields of the manual location editor, in display order. */
const MANUAL_ADDRESS_FIELDS: { key: keyof parsedAddressObjectType, label: string, placeholder?: string }[] = [
    { key: "address", label: "Endereço completo", placeholder: "Se vazio, é composto a partir dos campos abaixo" },
    { key: "street_name", label: "Rua" },
    { key: "street_number", label: "Número" },
    { key: "neighborhood", label: "Bairro" },
    { key: "city", label: "Cidade / Município" },
    { key: "state", label: "Província" },
    { key: "country", label: "País", placeholder: "Angola" },
    { key: "postal_code", label: "Código postal" },
];

/** Matches a pasted coordinate pair such as `-8.8383, 13.2344` (as copied from most map apps). */
const COORDINATE_PAIR_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

/** Builds the location from the manual editor's inputs (`location_<field>`); coordinates are mandatory. */
function readManualLocation($form: HTMLFormElement): locationType {
    const formData = new FormData($form);

    const text = (key: string): string => ((formData.get(`location_${key}`) as string | null) ?? "").trim();

    const latitude = parseFloat(text("latitude"));
    const longitude = parseFloat(text("longitude"));

    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180)
        throw new Error("Coordenadas inválidas: latitude entre -90 e 90, longitude entre -180 e 180.");

    const parts: parsedAddressObjectType = {
        street_number: text("street_number"),
        street_name: text("street_name"),
        neighborhood: text("neighborhood"),
        city: text("city"),
        state: text("state"),
        country: text("country"),
        postal_code: text("postal_code"),
        address: text("address"),
    };

    const composedAddress = [
        [parts.street_name, parts.street_number].filter(Boolean).join(" "),
        parts.neighborhood,
        parts.city,
        parts.state
    ].filter(Boolean).join(", ");

    return {
        ...parts,
        address: parts.address || composedAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude
    };
}

function RestaurantForm(_props: IPropTypes) {
    const {
        className,
        disableActions = false,
        disableLink = false,
        enableEditing = false,
        mode = "default",
        restaurant,
        onSuccess,
        ...props
    } = _props;

    const {
        get,
        create: createAppProperty,
        update: updateAppProperty
    } = useApp();

    const [form, updateForm] = useState<IComponentState<stateDataType, statusType>>({
        data: _defaultData,
        error: null,
        status: "idle"
    });

    const {
        data,
        error,
        status
    } = form;
    const settings = get("Global_Settings") ?? DEFAULT_APP_SETTINGS;

    /** For places the map/geocoder doesn't know: coordinates + address typed in by the admin. */
    const [manualLocation, toggleManualLocation] = useState<boolean>(false);

    const {
        name,
        restaurant_id,
        Delivery_Locations,
        Restaurant_Hours,
        thumbnail_url,
        ttd,
        ttp
    } = restaurant;

    async function PATCH$POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!data?.uploadedThumbnailURL)
            throw new Error("Cannot create a restaurant without a thumbnail URL");

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        const action = restaurant.restaurant_id !== -1 ? "updating" : "adding";

        updateForm(c => { return { ...c, error: null, status: action } });

        try {
            const name = (elements.namedItem("name") as HTMLInputElement).value;

            const schedule = (data?.assumeSameHours
                ? DAYS_OF_THE_WEEK.map(d => ({
                    day_of_week: d,
                    opening_time: (elements.namedItem("opening_time") as HTMLInputElement).value as timeType,
                    closing_time: (elements.namedItem("closing_time") as HTMLInputElement).value as timeType,
                    is_closed: false
                }))
                : (() => {
                    const opening_times = new FormData($form).getAll("opening_time");
                    const closing_times = new FormData($form).getAll("closing_time");

                    return DAYS_OF_THE_WEEK.map((d, idx) => {
                        const is_closed = [closing_times[idx], opening_times[idx]].includes("");

                        return {
                            closing_time: (is_closed ? "00:00" : closing_times[idx]) as timeType,
                            opening_time: (is_closed ? "00:00" : opening_times[idx]) as timeType,
                            is_closed,
                            day_of_week: d
                        }
                    }) as scheduleType[]
                })()
            );

            const address = manualLocation ? readManualLocation($form) : data?.address;

            if (!address) throw new Error("Seleccione um endereço ou defina a localização manualmente.");

            const location = {
                ...address,
                name,
                preferred: false
            };

            switch (action) {
                case "adding":
                    await createAppProperty({
                        property: "Restaurants",
                        payload: {
                            location,
                            schedule,
                            thumbnail_url: data?.uploadedThumbnailURL,
                            name,
                            ttd: settings.avg_ttd,
                            ttp: settings.avg_ttp
                        }
                    });

                    break;

                case "updating":
                    await updateAppProperty({
                        id: restaurant.restaurant_id,
                        property: "Restaurants",
                        payload: {
                            location,
                            name,
                            schedule,
                            thumbnail_url,
                            ttd,
                            ttp
                        }
                    });

                    break;

                default: break;
            }

            updateForm(c => { return { ...c, status: "success" } });

            onSuccess?.();
        } catch (error) {
            updateForm(c => { return { ...c, status: "error", error: new Error((error as Error).message) } });
        }
    };

    function handleAddressPick(place: geocodedPlaceType) {
        // Only the address fields: the result's id/name/category must not reach the API payload.
        const {
            street_number,
            street_name,
            neighborhood,
            city,
            state,
            country,
            postal_code,
            address,
            latitude,
            longitude
        } = place;

        updateForm(c => {
            return {
                ...c,
                data: {
                    ...(c.data as stateDataType),
                    address: {
                        street_number,
                        street_name,
                        neighborhood,
                        city,
                        state,
                        country,
                        postal_code,
                        address,
                        latitude,
                        longitude
                    }
                }
            }
        });
    };

    /** Pasting "lat, lng" into the latitude field fills both coordinate inputs. */
    function handleCoordinatesPaste(event: ClipboardEvent<HTMLInputElement>) {
        const match = COORDINATE_PAIR_PATTERN.exec(event.clipboardData.getData("text"));

        const $longitude = event.currentTarget.form?.elements.namedItem("location_longitude");

        if (!match || !($longitude instanceof HTMLInputElement)) return;

        event.preventDefault();

        event.currentTarget.value = match[1] ?? "";
        $longitude.value = match[2] ?? "";
    };

    function handleHoursChoice({ target }: ChangeEvent<HTMLInputElement>) {
        updateForm(c => {
            return {
                ...c,
                data: {
                    ...(c.data as stateDataType),
                    assumeSameHours: target.checked
                }
            }
        });
    };

    function handleUpload(type: ("thumbnail" | "video")) {
        return ({ uuid, mimeType, errors }: any) => {
            if (!uuid) {
                console.error(errors);

                throw new Error("Asset UUID is null, the upload possibly failed. Check the logs for more information");
            }

            switch (type) {
                case "thumbnail": updateForm(f => {
                    return {
                        ...f,
                        status: "idle",
                        data: {
                            ...f.data,
                            uploadedThumbnailURL: formatUUID_UC_CDN_URL(uuid)
                        }
                    }
                }); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    function toggleUploadState(type: ("thumbnail" | "video")) {
        return (e: any) => {
            switch (type) {
                case "thumbnail": updateForm(f => {
                    return {
                        ...f,
                        status: "uploading-thumbnail",
                        data: {
                            ...f.data,
                            uploadedThumbnailURL: ""
                        }
                    }
                }); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    useEffect(() => {
        if (restaurant.restaurant_id === -1 || !enableEditing) return;

        const $input = document.getElementById("assumeSameHours") as HTMLInputElement;

        if (!$input) return;

        const defaultCloseTime = `${toTimeDecimal(new Date((restaurant.Restaurant_Hours ?? [])[0].closing_time as Date).getHours())}:${toTimeDecimal(new Date((restaurant.Restaurant_Hours ?? [])[0].closing_time as Date).getMinutes())}`;
        const defaultOpeningTime = `${toTimeDecimal(new Date((restaurant.Restaurant_Hours ?? [])[0].opening_time as Date).getHours())}:${toTimeDecimal(new Date((restaurant.Restaurant_Hours ?? [])[0].opening_time as Date).getMinutes())}`;

        const match = restaurant.Restaurant_Hours?.filter(({ opening_time, closing_time }) => {
            const cTime = `${toTimeDecimal(new Date(closing_time as Date).getHours())}:${toTimeDecimal(new Date(closing_time as Date).getMinutes())}`;
            const oTime = `${toTimeDecimal(new Date(opening_time as Date).getHours())}:${toTimeDecimal(new Date(opening_time as Date).getMinutes())}`;

            return cTime === defaultCloseTime && defaultOpeningTime === oTime;
        }).length;

        const assumeSameHours = match === (restaurant.Restaurant_Hours ?? []).length;

        $input.checked = assumeSameHours;

        updateForm(c => {
            return {
                ...c,
                data: {
                    assumeSameHours,
                    address: restaurant.Delivery_Locations as any,
                    base64URL: null,
                    thumbnail_url: restaurant.thumbnail_url
                }
            }
        });
    }, [mode, restaurant, enableEditing])

    const assertions = {
        "isWorking": ([
            "adding",
            "loading",
            "updating",
            "uploading-thumbnail"
        ] as (typeof form.status)[]).includes(status),

        "hasThumbnail": [
            data?.uploadedThumbnailURL
        ].some(v => v !== null)
    };

    const $formProps = {
        ...((assertions.isWorking) ? { "data-status": "disabled" } : {}),
        ...props
    };

    return <form
        className={resolveClassNames(styles.form, className)}
        onSubmit={PATCH$POST}
        {...$formProps}
    >
        <fieldset>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Restaurant" />

                    Restaurante
                </Tag>

                <hr className="w-full" />
            </legend>

            <div
                className="flex flex-col justify-center items-center"
                data-type="thumbnail"
                style={{ backgroundImage: `url(${data?.uploadedThumbnailURL})` }}
            >
                {assertions.isWorking
                    ? <Icon name="Loading" className="animate-spin" />

                    : !data?.uploadedThumbnailURL && <FileUploaderRegular
                        filesViewMode="grid"
                        multipleMin={1}
                        multipleMax={1}
                        localeName="pt"
                        onFileUploadStart={toggleUploadState("thumbnail")}
                        onFileUploadSuccess={handleUpload("thumbnail")}
                        pubkey={env.UPLOAD_CARE_PUBLIC_KEY}
                        sourceList="local, facebook, gdrive"
                        confirmUpload
                        gridShowFileNames
                        imgOnly
                        useCloudImageEditor
                    />
                }
            </div>

            <DescriptionLabel
                className="w-full"
                title="Nome do restaurante"
                description="Estabelecimento de onder serão feitas as entregas para os clientes"
                icon="Restaurant"
                input={{
                    element: "input",
                    props: {
                        className: "w-full text-center",
                        type: "text",
                        id: "name",
                        name: "name",
                        title: "Nome do restaurant",
                        defaultValue: name,
                        required: true
                    }
                }}
            />
        </fieldset>

        <fieldset>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Clock" />

                    Tempo e entrega
                </Tag>

                <hr className="w-full" />
            </legend>

            <DescriptionLabel
                className="w-full"
                title="Tempo de preparo (em minutos)"
                description="O tempo de preparo médio que será considerado para todos os pedidos."
                icon="Timer"
                input={{
                    element: "input",
                    props: {
                        className: "w-full text-center",
                        type: "number",
                        id: "ttp",
                        name: "ttp",
                        title: "Tempo de preparo (em minutos)",
                        defaultValue: DEFAULT_APP_SETTINGS.avg_ttp,
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full"
                title="Tempo de entrega*"
                description="O tempo de entrega médio que será considerado para todos os pedidos."
                icon="Delivery"
                alerts={{ warning: "O tempo de médio de entrega é relevante à distância de pelo menos 10km entre o restaurante e o local de destino" }}
                input={{
                    element: "input",
                    props: {
                        className: "w-full text-center",
                        type: "number",
                        id: "ttd",
                        name: "ttd",
                        title: "Tempo de entrega",
                        defaultValue: DEFAULT_APP_SETTINGS.avg_ttd,
                        required: true
                    }
                }}
            />

            <section className={styles.schedule}>
                <label data-variant="selectable" className="flex flex-row justify-start items-center gap-2 w-full p-3">
                    <span>Assumir mesmo horário para todos os dias</span>

                    <input id="assumeSameHours" type="checkbox" className="ml-auto" defaultChecked={data?.assumeSameHours ?? undefined} onChange={handleHoursChoice} />
                </label>

                {data?.assumeSameHours
                    ? <>
                        <DescriptionLabel
                            className="w-full"
                            title="Abertura"
                            description="Tempo de abertura do restaurante."
                            icon="Clock"
                            alerts={{ warning: "Não será possível fazer pedidos fora do período de abertura" }}
                            input={{
                                element: "input",
                                props: {
                                    className: "w-full text-center",
                                    type: "time",
                                    id: "opening_time",
                                    name: "opening_time",
                                    title: "Tempo de abertura",
                                    defaultValue: restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[0].opening_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[0].opening_time as Date).getMinutes())}`,
                                    required: true
                                }
                            }}
                        />

                        <DescriptionLabel
                            className="w-full"
                            title="Fecho"
                            description="Tempo de fecho do restaurante."
                            icon="ClockOff"
                            input={{
                                element: "input",
                                props: {
                                    className: "w-full text-center",
                                    type: "time",
                                    id: "closing_time",
                                    name: "closing_time",
                                    title: "Tempo de fecho",
                                    defaultValue: restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[0].closing_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[0].closing_time as Date).getMinutes())}`,
                                    required: true
                                }
                            }}
                        />
                    </>

                    : <>
                        <p>Deixe os campos vazios para assumir o dia como <span className="italic font-black">fechado</span>.</p>

                        <ul className="w-full flex flex-col justify-start items-start gap-3">
                            {DAYS_OF_THE_WEEK.map((d, i) => <li key={d}>
                                <label>
                                    <span>Abertura ({d})</span>

                                    <input
                                        type="time"
                                        name="opening_time"
                                        defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[i].opening_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[i].opening_time as Date).getMinutes())}`}
                                    />
                                </label>

                                <label>
                                    <span>Fecho ({d})</span>

                                    <input
                                        type="time"
                                        name="closing_time"
                                        defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[i].closing_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[i].closing_time as Date).getMinutes())}`}
                                    />
                                </label>
                            </li>)}
                        </ul>
                    </>
                }
            </section>
        </fieldset>

        <fieldset className="relative z-10">
            <legend>
                <Tag variant="secondary">
                    <Icon name="MapCheck" />

                    Localização
                </Tag>

                <hr className="w-full" />
            </legend>

            <label data-variant="selectable" className="flex flex-row justify-start items-center gap-2 w-full p-3">
                <span>Definir localização manualmente (coordenadas)</span>

                <input id="manualLocation" type="checkbox" className="ml-auto" checked={manualLocation} onChange={({ target }) => toggleManualLocation(target.checked)} />
            </label>

            {manualLocation
                ? <section className={styles.location}>
                    <p>Para locais que não aparecem na pesquisa. Cole as coordenadas (ex.: <span className="italic">-8.838333, 13.234444</span>) no campo da latitude para preencher ambas.</p>

                    <div className={styles.coordinates}>
                        <label>
                            <span>Latitude*</span>

                            <input
                                type="number"
                                name="location_latitude"
                                step="any"
                                min={-90}
                                max={90}
                                placeholder="-8.838333"
                                defaultValue={data?.address?.latitude != null ? `${data.address.latitude}` : ""}
                                onPaste={handleCoordinatesPaste}
                                required
                            />
                        </label>

                        <label>
                            <span>Longitude*</span>

                            <input
                                type="number"
                                name="location_longitude"
                                step="any"
                                min={-180}
                                max={180}
                                placeholder="13.234444"
                                defaultValue={data?.address?.longitude != null ? `${data.address.longitude}` : ""}
                                required
                            />
                        </label>
                    </div>

                    <div className={styles.fields}>
                        {MANUAL_ADDRESS_FIELDS.map(({ key, label, placeholder }) => <label key={key} data-field={key}>
                            <span>{label}</span>

                            <input
                                type="text"
                                name={`location_${key}`}
                                defaultValue={data?.address?.[key] ?? ""}
                                {...{ placeholder }}
                            />
                        </label>)}
                    </div>
                </section>

                : <AddressSelect
                    className="w-full"
                    defaultValue={restaurant_id === -1 ? "" : (data?.address?.address ?? Delivery_Locations?.address ?? "")}
                    onPick={handleAddressPick}
                    placeholder="Pesquisar endereço do restaurante..."
                    required
                />
            }
        </fieldset>

        <Button type="submit" variant={error ? "danger" : "primary"} className="w-full">
            {error
                ? error.message
                : <>
                    {restaurant_id === -1 ? "Criar" : "Atualizar"}

                    {assertions.isWorking && <Icon name="Loading" className="animate-spin" />}
                </>
            }
        </Button>
    </form >;
};

export default RestaurantForm;