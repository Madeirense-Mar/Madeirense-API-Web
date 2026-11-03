//#region Imports -----------------------------------------
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentPropsWithoutRef,
    type KeyboardEvent,
    type MouseEvent,
    type SubmitEvent
} from "react";

import {
    useNavigate
} from "react-router-dom";

import ReactPlayer from "react-player";

import {
    defineLocale,
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    APP_TTL_DEFAULT,
    formatUUID_UC_CDN_URL,
    getLabel,
    locales,
    Madeirense$Enumerators,
    resolveClassNames,
    type restaurantEventType,
} from "@Madeirense/shared";

import AppSettings from "settings";
import MXP$App from "configurations";
import dependencies from "configurations/dependencies";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useNotifications } from "contexts/Notifications";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import DescriptionLabel from "components/forms/elements/labels/description";
import RestaurantsSelect from "components/forms/elements/selects/restaurants";

import TicketBuyersList from "components/lists/ticketBuyers";

import CancellationForm from "components/modals/forms/cancel";
import DeletionForm from "components/modals/forms/delete";
import AddRestaurantEventMerchandiseForm from "components/modals/forms/event/addMerchandise";

import panelStyles from "components/panels/BackOffice/index.module.css";
import styles from "./Event.module.css";
import xScrollSectionStyles from "styles/xScrollSection.module.css";

import type {
    Products,
    Restaurant_Events
} from "@Madeirense/database/browser";

import type {
    statusType
} from "components/types";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
type updateType = (
    | "error"
    | "success"
    | "updating"
);

type productPropertyUpdateType = Record<keyof Products, updateType>;
//#endregion

const {
    fileUploaderRegularDefaultProps
} = dependencies["@uploadcare/react-uploader"];

const {
    "restaurant-events": RestaurantEventsAPI
} = MXP$App.Base.Business.endpoints;

defineLocale('pt', async () => {
    return locales.get("pt")?.uploadCare ?? {} as any;
});

const delayMS = 2500;
const today = new Date();

function EventPanel({ id }: { id: number }) {
    //#region Hook and state declarations -----------------
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        fetch,
        get,
        state: appState,
        update_PARTIAL,
    } = useApp();

    const { show } = useModal();
    const { push } = useNotifications();

    const navigate = useNavigate();

    const [freePricing, setFreePricing] = useState<boolean>(false);
    const [freeSpots, setFreeSpots] = useState<boolean>(false);

    const [updater, setUpdater] = useState<keyof Restaurant_Events | "">("");
    const [productUpdater, setProductUpdater] = useState<Record<number, Partial<productPropertyUpdateType>>>({});
    //#endregion

    //#region Variable declarations -----------------------
    const data = get("Restaurant_Events")?.find(({ event_id }) => event_id === id) as restaurantEventType;
    const products = useMemo(() => (data?.Products ?? []).filter(({ product_type }) => product_type === "merchandise"), [data]);

    const {
        event_date,
        event_id,
        status,
        start_time = new Date(),
        end_time = new Date()
    } = data ?? {};

    const [
        sHours,
        sMinutes,
        eHours,
        eMinutes,
    ] = useMemo(() => [
        String(new Date(start_time).getHours()).padStart(2, '0'),
        String(new Date(start_time).getMinutes()).padStart(2, '0'),
        String(new Date(end_time).getHours()).padStart(2, '0'),
        String(new Date(end_time).getMinutes()).padStart(2, '0')
    ], [data]);

    const assertions = {
        "isLoading": [
            "loading",
            "fetching-Restaurant_Events",
            "updating-Restaurant_Events"
        ].includes(appState),
        "hasPassed": [
            (status === "expired"),
            (today > new Date(event_date))
        ].includes(true)
    };
    //#endregion

    //#region Functions -----------------------------------
    //#region Event panel
    function getUpdaterStatusIndicator(...properties: (keyof Restaurant_Events)[]) {
        if (properties.includes(updater as keyof Restaurant_Events)) return (assertions.isLoading)
            ? <Icon name="Loading" className="animate-spin" />
            : <Icon name="Check" />

        return null;
    };

    function handleEvent(e: any) { update(e.target); };

    async function handleEventProductCreation() {
        const callback = async () => fetch("Restaurant_Events");

        show(<AddRestaurantEventMerchandiseForm {...{ callback, event_id }} />, {
            title: `Adicionar merchandise`
        });
    };

    function handleCancellation() {
        const callback = () => {
            fetch("Restaurant_Events");
        };

        show(<CancellationForm
            item="event"
            itemId={data?.event_id as number}
            {...{ callback }}
        />, { title: `Cancelar evento` });
    };

    function handleDeletion() {
        const callback = async () => {
            await fetch("Restaurant_Events");

            navigate(Madeirense$Enumerators.Pages.BackOffice.Restaurant, { replace: true });
        };

        show(<DeletionForm
            item="event"
            itemId={data?.event_id as number}
            {...{ callback }}
        />, { title: `Eliminar evento` });
    };

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key.toLowerCase() !== "enter") return;

        update(e.target as HTMLInputElement, 0);
    };

    function handleSubmitOnChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const $form = e.target.parentElement as HTMLFormElement;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setUpdater("");

        timeoutRef.current = setTimeout(async () => {
            $form.dispatchEvent(new Event("submit", { bubbles: true }));
        }, delayMS);
    };

    function toggleFreePricing() { setFreePricing(f => !f); }
    function toggleFreeSpots() { setFreeSpots(f => !f); }

    function update(element: any, delay: number = delayMS) {
        const property = element.name as (keyof Restaurant_Events | keyof Products);
        const _value = element.value;

        if ((data as restaurantEventType)[property as keyof Restaurant_Events] === _value) return;

        let value;

        switch (property) {
            case "spots":
                if (["", "0"].includes(`${_value}`)) toggleFreeSpots();
                value = _value === "" ? 0 : parseInt(_value, 10);

                if (value > 0 && value < (data?.spots ?? 0)) return push({
                    id: "N#ERROR_UPDATING_EVENT_SPOTS",
                    alert: "O nº de ingressos não pode ser inferior ao nº de ingressos vendidos",
                    type: "alert",
                    options: {
                        variant: "danger",
                        ttl: APP_TTL_DEFAULT
                    }
                });

                break;

            case "price":
                if (["", "0"].includes(`${_value}`)) toggleFreePricing();
                value = _value === "" ? 0 : parseInt(_value, 10);
                break;

            case "restaurant_id":
                value = _value === "" ? 0 : parseInt(_value, 10);
                break;

            default:
                if (_value === "") return;

                else value = _value;

                break;
        };

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            switch ((element as HTMLElement).dataset?.form) {
                case "product":
                    const product_id = parseInt((element as HTMLElement).id.split("-")[0]);

                    try {
                        setProductUpdater(pu => ({
                            ...pu,
                            [product_id]: {
                                ...pu[product_id],
                                [property as keyof Products]: "updating"
                            }
                        }));

                        await RestaurantEventsAPI.updateProduct(event_id, product_id, {
                            [property]: value
                        });
                    } catch (error) {
                        setProductUpdater(pu => ({
                            ...pu,
                            [product_id]: {
                                ...pu[product_id],
                                [property as keyof Products]: "error"
                            }
                        }));
                    } finally {
                        setProductUpdater(pu => ({
                            ...pu,
                            [product_id]: {
                                ...pu[product_id],
                                [property as keyof Products]: undefined
                            }
                        }));
                    }

                    break;

                default:
                    try {
                        setUpdater(property as keyof Restaurant_Events);

                        await update_PARTIAL({
                            id,
                            property: "Restaurant_Events",
                            payload: {
                                [property]: value
                            }
                        });
                    } catch (error) {
                        push({
                            id: "N#ERROR_UPDATING_EVENT",
                            alert: (error as Error).message,
                            type: "alert",
                            options: {
                                variant: "danger",
                                ttl: APP_TTL_DEFAULT
                            }
                        });
                    } finally {
                        setUpdater("");
                    }

                    break;
            }
        }, delay);
    };

    async function $PATCH(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const elements = e.currentTarget.elements as HTMLFormControlsCollection;

        try {
            setUpdater("event_date");

            await update_PARTIAL({
                id,
                property: "Restaurant_Events",
                payload: {
                    event_date: new Date((elements.namedItem("event_date") as HTMLInputElement).value as string),
                    end_time: (elements.namedItem("end_time") as HTMLInputElement).value as string,
                    start_time: (elements.namedItem("start_time") as HTMLInputElement).value as string
                }
            });
        } catch (error) {
            push({
                id: "N#ERROR_UPDATING_EVENT_TIME",
                alert: (error as Error).message,
                type: "alert",
                options: {
                    variant: "danger",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } finally {
            setUpdater("");
        }
    }
    //#endregion

    //#region Product updater management
    function getProductUpdaterStatusIndicator(product_id: number, properties: keyof Products) {
        switch (productUpdater?.[product_id]?.[properties]) {
            case "error":
                return <Icon name="Error" />;

            case "success":
                return <Icon name="Check" />;

            case "updating":
                return <Icon name="Loading" className="animate-spin" />;

            default:
                return null;
        }
    };

    function handleProductThumbnailUpload(product_id: number) {
        return ({ uuid, mimeType, errors }: any) => {
            try {
                if (!uuid) {
                    console.error(errors);

                    throw new Error("Asset UUID is null, the upload possibly failed. Check the logs for more information");
                }

                setProductUpdater(pu => ({
                    ...pu,
                    [product_id]: { ...pu[product_id], thumbnail: "success" }
                }));
            } catch (error) {
                setProductUpdater(pu => ({
                    ...pu,
                    [product_id]: { ...pu[product_id], thumbnail: "error" }
                }));
            } finally {
                setTimeout(() => setProductUpdater(pu => ({
                    ...pu,
                    [product_id]: { ...pu[product_id], thumbnail: undefined }
                })), delayMS);
            }
        }
    };

    function toggleProductThumbnailUpload(product_id: number) {
        return (e: any) => setProductUpdater(pu => ({
            ...pu,
            [product_id]: { ...pu[product_id], thumbnail: "updating" }
        }));
    };
    //#endregion
    //#endregion

    //#region Effects -------------------------------------
    useEffect(() => { const tRef = timeoutRef.current; return () => { if (tRef) clearTimeout(tRef); } }, []);

    useEffect(() => { setFreeSpots(((data?.spots ?? 0) as number) === 0); }, [data?.spots]);
    useEffect(() => { setFreePricing(parseInt(`${data?.price ?? '0'}`) === 0); }, [data?.price]);
    //#endregion

    //#region DOM -----------------------------------------
    switch (appState) {
        case "loading": {
            return <div className="w-full h-full flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </div>
        }

        default: {
            return <section
                className={styles.section}
            >
                <ul className={panelStyles.actions}>
                    <li>
                        <span>Acções</span>
                    </li>

                    <li>
                        <hr />
                    </li>

                    {data.status === "upcoming" && <li>
                        <Button variant="warning" onClick={handleCancellation}>
                            <Icon name="Close" />

                            Cancelar o evento
                        </Button>
                    </li>}

                    {data.status === "cancelled" && <li>
                        <Button variant="danger" onClick={handleDeletion}>
                            <Icon name="Trash" />

                            Eliminar o evento
                        </Button>
                    </li>}
                </ul>

                <section>
                    <ScrollToSection
                        className={resolveClassNames(styles.scroll, "w-full")}
                        event_id={id as number}
                        thumbnail_url={data?.thumbnail_url as string}
                        video_url={data?.video_url as string}
                        hasExpired={assertions.hasPassed}
                    />

                    <Tag>
                        {getLabel(data.status)}

                        {data.status === "cancelled" && <Icon name="OutlinedTimes" />}
                        {data.status === "expired" && <Icon name="History" />}
                        {data.status === "ongoing" && <Icon name="OutlinedDot" />}
                        {data.status === "upcoming" && <Icon name="OutlinedCircle" />}
                    </Tag>

                    <DescriptionLabel
                        className="w-full"
                        title="Nome"
                        description={<>
                            Como se identifica o evento.
                        </>}
                        input={{
                            element: "input",
                            iconElement: getUpdaterStatusIndicator("name"),
                            props: {
                                className: "w-full text-center",
                                name: "name",
                                title: "Nome do restaurant",
                                type: "text",
                                defaultValue: data?.name,
                                onKeyDown: handleKeyDown,
                                onBlur: assertions.hasPassed ? undefined : handleEvent,
                                readOnly: assertions.hasPassed
                            }
                        }}
                    />

                    <label className="flex flex-row justify-start items-center w-full">
                        <div className="flex flex-col justify-start items-start mr-auto">
                            <span className="font-extrabold">
                                Local
                            </span>

                            <span>
                                Em que resturante irá decorrer o evento
                            </span>
                        </div>

                        <div className="flex flex-row justify-start items-center gap-2 opacity-35 hover:opacity-100">
                            {(updater === "restaurant_id")
                                ? getUpdaterStatusIndicator("restaurant_id")
                                : <Icon name="Store" className="text-lg" />
                            }

                            <RestaurantsSelect title="Restaurante" id="restaurant_id" data-element="h1" name="restaurant_id" defaultOptionLabel="Local do evento" defaultValue={""} onChange={handleEvent} withoutDefaultOption disabled={assertions.hasPassed} />
                        </div>
                    </label>

                    <form onSubmit={$PATCH} className={resolveClassNames(styles["datetime-form"], "w-full")}>
                        <div className="flex flex-col justify-start items-start mr-auto">
                            <span className="font-extrabold inline-flex items-center">
                                {getUpdaterStatusIndicator("event_date", "start_time", "end_time")}

                                Data do evento
                            </span>

                            <span>
                                Data, hora (abertura e fecho)
                            </span>
                        </div>

                        <div className="p-2">
                            <input className="text-center" name="event_date" title="Data do evento" type="date" defaultValue={new Date(data?.event_date as Date).toISOString().split('T')[0]} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />
                        </div>

                        <hr />

                        <div className="flex flex-row justify-center items-center gap-3 p-2">
                            <input id="start_time" type="time" name="start_time" placeholder="Início" defaultValue={`${sHours}:${sMinutes}`} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />

                            <Icon name="ArrowRight" />

                            <input id="end_time" type="time" name="end_time" placeholder="Fim" defaultValue={`${eHours}:${eMinutes}`} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />
                        </div>
                    </form>

                    <DescriptionLabel
                        className="w-full"
                        title="Ingresso"
                        description="Preço do ingresso base, o mínimo que qualquer cliente terá de pagar para aceder."
                        alerts={{
                            warning: "Alteração do só afetará os productos que não foram vendidos"
                        }}
                        input={{
                            element: "input",
                            iconElement: getUpdaterStatusIndicator("price"),
                            props: {
                                className: "w-full text-center",
                                name: "spots",
                                title: `Preço do ingresso${(!freePricing) ? " (editável)" : ""}`,
                                ...(freePricing)
                                    ? {
                                        readOnly: true,
                                        type: "text",
                                        value: "Grátis",
                                        onClick: () => toggleFreePricing(),
                                    }
                                    : {
                                        defaultValue: parseFloat(`${data?.price}`),
                                        min: 0,
                                        readOnly: assertions.hasPassed,
                                        type: "number",
                                        onBlur: assertions.hasPassed ? undefined : handleEvent,
                                        onKeyDown: handleKeyDown,
                                    }
                            }
                        }}
                    />

                    <DescriptionLabel
                        className="w-full"
                        title="Nº de ingressos"
                        alerts={{
                            warning: "Nº de ingressos não pode baixar os vendidos"
                        }}
                        icon="User"
                        description={<>
                            Nº limite de pessoas aceite para o evento.
                        </>}
                        input={{
                            element: "input",
                            iconElement: getUpdaterStatusIndicator("spots"),
                            props: {
                                className: "w-full text-center",
                                name: "spots",
                                title: `Nº de ingressos${(!freeSpots) ? " (editável)" : ""}`,
                                ...(freeSpots)
                                    ? {
                                        readOnly: true,
                                        type: "text",
                                        value: "Sem limite",
                                        onClick: () => toggleFreeSpots(),
                                    }
                                    : {
                                        defaultValue: data?.spots ?? 0,
                                        min: data?.spots ?? 0,
                                        readOnly: assertions.hasPassed,
                                        type: "number",
                                        onBlur: assertions.hasPassed ? undefined : handleEvent,
                                        onKeyDown: handleKeyDown,
                                    }
                            }
                        }}
                    />

                    <DescriptionLabel
                        className="w-full"
                        layout="column"
                        title="Nome"
                        description={<>
                            Informação sobre o evento.
                        </>}
                        icon="Notes"
                        input={{
                            element: "textarea",
                            iconElement: getUpdaterStatusIndicator("description"),
                            props: {
                                className: "w-full",
                                name: "description",
                                title: "Descrição",
                                defaultValue: data?.description ?? "",
                                onChange: handleEvent,
                                readOnly: assertions.hasPassed
                            }
                        }}
                    />
                </section>

                <section className={styles.merch}>
                    <header className="w-full flex flex-row justify-between items-center">
                        <h1>Merchandise</h1>

                        {!assertions.hasPassed && <Button onClick={handleEventProductCreation}>
                            <Icon name="Add" />

                            Adicionar producto
                        </Button>}
                    </header>

                    {assertions.hasPassed
                        ? <div data-state="warning" className="w-full flex flex-row justify-center items-center">
                            O event já expirou, não poderá editar os itens de merchandise
                        </div>

                        : (products.length > 0) && <div data-state="warning" className="w-full flex flex-row justify-center items-center">
                            Alteração do só afetará os productos que não foram vendidos
                        </div>}

                    <ul
                        className={styles["products-list"]}
                        {...{
                            ...(assertions.hasPassed)
                                ? { "data-disabled": "" }
                                : {}
                        }}
                    >
                        {!products.length && <li data-empty>
                            <em className="m-auto">Sem products registados para o evento</em>
                        </li>}

                        {products.map(p => <li key={p.product_id}>
                            <div className={resolveClassNames(
                                "flex flex-col justify-center items-center gap-3",
                                (productUpdater?.[p.product_id]?.thumbnail == "updating") ? "animate-pulse" : ""
                            )}>
                                <div style={{ "backgroundImage": `url(${p.thumbnail})` }} data-type="thumbnail">
                                </div>

                                <div className="flex flex-row justify-between items-center gap-2">
                                    {getProductUpdaterStatusIndicator(p.product_id, "thumbnail")}

                                    <FileUploaderRegular
                                        {...fileUploaderRegularDefaultProps}
                                        onFileUploadStart={toggleProductThumbnailUpload(p.product_id)}
                                        onFileUploadSuccess={handleProductThumbnailUpload(p.product_id)}
                                    />
                                </div>
                            </div>

                            <label className={resolveClassNames((productUpdater?.[p.product_id]?.name == "updating") ? "animate-pulse" : "")}>
                                <span>
                                    {getProductUpdaterStatusIndicator(p.product_id, "name")}

                                    Nome
                                </span>

                                <input
                                    data-form="product"
                                    defaultValue={p.name}
                                    id={`${p.product_id}-name`}
                                    name="name"
                                    type="text"
                                    onBlur={handleEvent}
                                    onKeyDown={handleKeyDown}
                                />
                            </label>

                            <label className={resolveClassNames((productUpdater?.[p.product_id]?.price == "updating") ? "animate-pulse" : "")}>
                                <span>
                                    {getProductUpdaterStatusIndicator(p.product_id, "price")}

                                    Preço
                                </span>

                                <input
                                    data-form="product"
                                    defaultValue={p.price.toString()}
                                    id={`${p.product_id}-price`}
                                    name="price"
                                    type="number"
                                    onBlur={handleEvent}
                                    onKeyDown={handleKeyDown}
                                />
                            </label>
                        </li>)}
                    </ul>
                </section>

                <section>
                    <h1>Ingressos comprados</h1>

                    <TicketBuyersList
                        mode="admin"
                        className={resolveClassNames(styles["tickets-list"], "w-full")}
                        defaultEvent={data?.event_id}
                        defaultRestaurant={data?.restaurant_id}
                    />
                </section>
            </section >
        }
    };
    //#endregion
};

//#region Scroll section declarations ---------------------
interface IScrollSectionPropTypes extends ComponentPropsWithoutRef<"section"> {
    callback?: Function;
    event_id: number;
    hasExpired?: boolean;
    onVideoUpdate?: (url: string) => void;
    onThumbnailUpdate?: (url: string) => void;
    thumbnail_url: string;
    video_url: string;
};

type assetType = (
    | "thumbnail"
    | "video"
);

type sectionType = "thumbnail" | "video";

const ScrollToSection = ({
    callback,
    className,
    event_id,
    hasExpired = false,
    onThumbnailUpdate,
    onVideoUpdate,
    thumbnail_url: dt,
    video_url: dv,
    ...props
}: IScrollSectionPropTypes) => {
    //#region Hook and state declarations -----------------
    const {
        update_PARTIAL
    } = useApp();

    const [appState, setState] = useState<statusType<`uploading-${"thumbnail" | "video"}`>>("idle");
    const [pickedSection, setPickedSection] = useState<`event-${sectionType}`>("event-thumbnail");
    const [thumbnail_url, setThumbnailURL] = useState(dt);
    const [video_url, setVideoURL] = useState(dv);
    //#endregion

    //#region Variable declarations -----------------------
    const sections = [
        { key: `Capa`, value: "event-thumbnail", icon: <Icon name="Image" /> },
        { key: "Vídeo", value: "event-video", icon: <Icon name="Video" /> },
    ];
    //#endregion

    //#region Functions -----------------------------------
    function handleProductThumbnailUpload(type: assetType) {
        return async ({ uuid, mimeType, errors }: any) => {
            if (!uuid) {
                console.error(errors);

                throw new Error("Asset UUID is null, the upload possibly failed. Check the logs for more information");
            }

            let url = "";
            switch (type) {
                case "thumbnail":
                    url = formatUUID_UC_CDN_URL(uuid);
                    onThumbnailUpdate?.(url);
                    setThumbnailURL(url);
                    break;

                case "video":
                    url = `${formatUUID_UC_CDN_URL(uuid)}${mimeType.split("/").join(".")}`;
                    onVideoUpdate?.(url);
                    setVideoURL(url);
                    break;

                default: throw new Error("Unknown upload type");
            }

            try {
                await update_PARTIAL({
                    id: event_id as number,
                    property: "Restaurant_Events",
                    payload: {
                        ...(type === "thumbnail" ? { thumbnail_url: url } : {}),
                        ...(type === "video" ? { video_url: url } : {}),
                    }
                })
            }
            catch (error) { }
            finally {
                callback?.();
            }

            setState("idle");
        }
    };

    function pickSection(e: MouseEvent<HTMLButtonElement>) {
        const { value } = (e.target as HTMLButtonElement);

        const $section = document.getElementById(value);

        if (!$section) return;

        $section.scrollIntoView({ behavior: "smooth", block: "nearest" });

        setPickedSection(value as any);
    };

    function toggleProductThumbnailUpload(type: assetType) {
        return (e: any) => {
            switch (type) {
                case "thumbnail": setState("uploading-thumbnail"); break;
                case "video": setState("uploading-video"); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };
    //#endregion

    //#region DOM -----------------------------------------
    return <section className={resolveClassNames(xScrollSectionStyles["x-scroll-section"], className)} {...props}>
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                {kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div data-type="container">
            <section id="event-thumbnail" className="gap-2">
                <div data-type="thumbnail" style={{ height: "300px", backgroundImage: `url(${thumbnail_url})` }} className="w-full flex flex-col justify-center items-center">
                    {appState === "uploading-thumbnail" && <Icon name="Loading" className="animate-spin" />}
                </div>

                {!hasExpired && <FileUploaderRegular
                    {...fileUploaderRegularDefaultProps}
                    className="ml-auto"
                    localeDefinitionOverride={AppSettings.UploadCare.Overrides.update.thumbnail}
                    onFileUploadStart={toggleProductThumbnailUpload("thumbnail")}
                    onFileUploadSuccess={handleProductThumbnailUpload("thumbnail")}
                />}
            </section>

            <section id="event-video" className="gap-y-2">
                {appState === "uploading-video"
                    ? <div data-type="thumbnail" className="w-full flex flex-col justify-center items-center rounded-md min-h-[300px] border">
                        <Icon name="Loading" className="animate-spin" />
                    </div>

                    : <ReactPlayer
                        src={video_url}
                        width="100%"
                        height={300}
                        playing
                        controls
                    />
                }

                {!hasExpired && <FileUploaderRegular
                    {...fileUploaderRegularDefaultProps}
                    className="ml-auto"
                    accept="video/mp4,video/webm,video/mov,video/avi"
                    localeDefinitionOverride={AppSettings.UploadCare.Overrides.update.video}
                    onFileUploadStart={toggleProductThumbnailUpload("video")}
                    onFileUploadSuccess={handleProductThumbnailUpload("video")}
                />}
            </section>
        </div>
    </section>
    //#endregion
};
//#endregion

export default EventPanel;