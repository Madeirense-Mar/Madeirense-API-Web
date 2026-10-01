import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import type {
    $Enums,
    Restaurant_Hours
} from "@Madeirense/database/browser";

import {
    DEFAULT_APP_SETTINGS,
    DAYS_OF_THE_WEEK,
    toBase64,
    toDayOfTheWeek,
    toTimeDecimal,
    type parsedGoogleAddressObjectType,
    type restaurantType,
    type restaurantPayloadType,
    type scheduleType,
    resolveClassNames,
    which,
} from "@Madeirense/shared";

import {
    useApp,
    type App$Types
} from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import GoogleAddressSelect from "../elements/selects/googleAddress";

import type {
    IComponentState
} from "components/interface";

import type {
    withVariant
} from "components/types";

import styles from "./restaurant.module.css";

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
    address?: parsedGoogleAddressObjectType & { latitude: any, longitude: any },
    base64URL: string | null,
    thumbnail_url: string | null
};

type statusType = (
    | "adding"
    | "updating"
);

const _defaultData: stateDataType = {
    assumeSameHours: true,
    address: undefined,
    base64URL: null,
    thumbnail_url: null
};

type timeType = `${number}:${number}`;

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

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

            const thumbnail_url = which(data?.base64URL, data?.thumbnail_url, "") as string;

            const { address = undefined } = data ?? {};

            if (!address) throw new Error("Address cannot be undefined");

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
                            thumbnail_url,
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

    async function uploadImage(e: ChangeEvent<HTMLInputElement>) {
        let base64URL: string;

        const $input = e.target as HTMLInputElement;

        if (!$input.files || $input.files.length === 0) {
            console.error("No file selected.");

            return;
        }

        const file = $input.files[0];

        try {
            base64URL = await toBase64(file);
        } catch (error) {

        }

        updateForm(c => {
            return {
                ...c,
                status: c.status,
                data: {
                    ...c.data as stateDataType,
                    ...(base64URL ? { base64URL } : {})
                }
            }
        });
    };

    function updateImageThumbnailURL(e: ChangeEvent<HTMLInputElement>) {
        const { target } = e;

        if (timeoutRef.current) clearInterval(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            updateForm(c => { return { ...c, data: { ...(c.data as stateDataType), thumbnail_url: target.value } } });
        }, 3500);
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
        "isWorking": [
            "adding",
            "loading",
            "updating"
        ].includes(status),

        "hasThumbnail": [
            data?.base64URL ?? null,
            data?.thumbnail_url ?? null
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
        <div
            data-section="thumbnail"
            onClick={!assertions.hasThumbnail ? undefined : () => { document.getElementById("thumbnail_url")?.click() }}
            style={{ backgroundImage: `url(${data?.base64URL ?? data?.thumbnail_url})` }}
        >
            <input
                title="Restaurant thumbnail"
                type="file"
                name="base64URL"
                onChange={uploadImage}
                required={!assertions.hasThumbnail}
            />

            <div className="w-full flex flex-row justify-center items-center gap-2">
                <hr className="w-full h-[1px]" />

                ou

                <hr className="w-full h-[1px]" />
            </div>

            <input
                className="w-full"
                pattern="https?://.*\.(jpg|jpeg|png|gif|webp|svg)"
                title="Escreva aqui uma URL da imagem (e.g., https://example.com/image.jpg)"
                placeholder="Escreva aqui uma URL da imagem (e.g., https://example.com/image.jpg)"
                type="url"
                name="thumbnail_url"
                defaultValue={thumbnail_url ?? undefined}
                onChange={updateImageThumbnailURL}
                required={!assertions.hasThumbnail}
            />
        </div>

        <input type="text" id="name" name="name" title="Nome do restaurant" defaultValue={name} required />

        <fieldset>
            <div className="w-full flex flex-row justify-start items-center gap-2">
                <label>
                    <span>Tempo de preparo</span>

                    <br />

                    <input
                        type="number"
                        name="ttp"
                        defaultValue={DEFAULT_APP_SETTINGS.avg_ttp}
                        required
                    />
                </label>

                <label>
                    <span>Tempo entrega*</span>

                    <br />

                    <input
                        type="number"
                        name="ttd"
                        defaultValue={DEFAULT_APP_SETTINGS.avg_ttd}
                        required
                    />
                </label>
            </div>

            <p data-state="warning" className="italic border border-dotted p-1 text-sm opacity-75 w-full text-center">
                O tempo de médio de entrega é relevante à distância de pelo menos 10km entre o restaurante e o local de destino
            </p>

            <div className="w-full flex flex-row justify-start items-center gap-2">
                <label htmlFor="assumeSameHours" className="flex flex-row justify-start items-center gap-2">
                    <input defaultChecked={data?.assumeSameHours ?? undefined} id="assumeSameHours" type="checkbox" onChange={({ target }) => updateForm(c => { return { ...c, data: { ...(c.data as stateDataType), assumeSameHours: target.checked } } })} />

                    <span>Assumir mesmo horário para todos os dias</span>
                </label>
            </div>

            {data?.assumeSameHours
                ? <div className="w-full flex flex-row justify-start items-center gap-2">
                    <label>
                        <span>Abertura</span>

                        <br />

                        <input
                            type="time"
                            name="opening_time"
                            defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[0].opening_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[0].opening_time as Date).getMinutes())}`}
                            required />
                    </label>

                    <label>
                        <span>Fecho</span>

                        <br />

                        <input
                            type="time"
                            name="closing_time"
                            defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[0].closing_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[0].closing_time as Date).getMinutes())}`}
                            required
                        />
                    </label>
                </div>
                : <>
                    <hr className="w-full h-[1px]" />

                    <p>Deixe os campos vazios para assumir o dia como <span className="italic">fechado</span>.</p>

                    {DAYS_OF_THE_WEEK.map((d, i) => <div key={d} className="w-full flex flex-row justify-start items-center gap-2">
                        <label>
                            <span>Abertura ({d})</span>

                            <br />

                            <input
                                type="time"
                                name="opening_time"
                                defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[i].opening_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[i].opening_time as Date).getMinutes())}`}
                            />
                        </label>

                        <label>
                            <span>Fecho ({d})</span>

                            <br />

                            <input
                                type="time"
                                name="closing_time"
                                defaultValue={restaurant_id === -1 ? "" : !Restaurant_Hours ? "" : `${toTimeDecimal(new Date(Restaurant_Hours[i].closing_time as Date).getHours())}:${toTimeDecimal(new Date(Restaurant_Hours[i].closing_time as Date).getMinutes())}`}
                            />
                        </label>
                    </div>)}

                    <hr className="w-full h-[1px]" />
                </>}

            <label>
                <div className="flex flex-row justify-start items-start gap-2">
                    <Icon name="MapMarker" />

                    <span>
                        Localização
                    </span>
                </div>

                <GoogleAddressSelect defaultValue={restaurant_id === -1 ? "" : Delivery_Locations?.address} className="w-full" onPick={(a) => updateForm(c => { return { ...c, data: { ...(c.data as stateDataType), address: a } } })} />
            </label>

            <Button type="submit" variant={error ? "danger" : "primary"} className="w-full">
                {error
                    ? error.message
                    : <>
                        {restaurant_id === -1 ? "Criar" : "Atualizar"}

                        {assertions.isWorking && <Icon name="Loading" className="animate-spin" />}
                    </>
                }
            </Button>
        </fieldset>
    </form>;
};

export default RestaurantForm;