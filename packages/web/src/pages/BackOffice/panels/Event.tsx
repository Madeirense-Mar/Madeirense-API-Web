import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type SubmitEvent,
    type KeyboardEvent,
    type MouseEvent
} from "react";

import { useNavigate } from "react-router-dom";

import ReactPlayer from "react-player";

import {
    defineLocale,
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    APP_TTL_DEFAULT,
    formatNumber,
    formatUUID_UC_CDN_URL,
    getLabel,
    locales,
    type restaurantEventType,
} from "@Madeirense/shared";

import AppSettings from "settings";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useNotifications } from "contexts/Notifications";

import Button from "components/buttons";
import RestaurantsSelect from "components/forms/elements/selects/restaurants";
import Icon from "components/icon";
import TicketBuyersList from "components/lists/ticketBuyers";

import DeletionForm from "components/modals/forms/delete";
import CancellationForm from "components/modals/forms/cancel";

import Tag from "components/tags";

import env from "env";

import type {
    Restaurant_Events
} from "@Madeirense/database/browser";

import type { statusType } from "components/types";

// ***************************************************************************************************************

const UPLOAD_CARE_PUBLIC_KEY = env.UPLOAD_CARE_PUBLIC_KEY;

defineLocale('pt', async () => {
    return locales.get("pt")?.uploadCare ?? {} as any;
});

const delayMS = 2500;
const today = new Date();

function EventPanel({ id }: { id: number }) {
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

    const [updater, setUpdater] = useState<keyof Restaurant_Events | "">("");
    const [freeSpots, setFreeSpots] = useState<boolean>(false);
    const [freePricing, setFreePricing] = useState<boolean>(false);

    const data = get("Restaurant_Events")?.find(({ event_id }) => event_id === id) as restaurantEventType;

    const ticket = (data?.Products ?? []).find(p => p.product_type === "ticket");

    const {
        event_date,
        status
    } = data ?? {};

    const [
        sHours,
        sMinutes,
        eHours,
        eMinutes,
    ] = useMemo(() => [
        String(new Date(data?.start_time as Date).getHours()).padStart(2, '0'),
        String(new Date(data?.start_time as Date).getMinutes()).padStart(2, '0'),
        String(new Date(data?.end_time as Date).getHours()).padStart(2, '0'),
        String(new Date(data?.end_time as Date).getMinutes()).padStart(2, '0'),
    ], [data]);

    function getUpdaterStatusIndicator(...properties: (keyof Restaurant_Events)[]) {
        if (properties.includes(updater as keyof Restaurant_Events)) return assertions.isLoading
            ? <Icon name="Check" />
            : <Icon name="Loading" className="animate-spin" />
            ;

        return null;
    };

    function handleEvent(e: any) { update(e.target); };

    function handleCancellation() {
        show(<CancellationForm
            item="event"
            itemId={data?.event_id as number}
            callback={() => {
                fetch("Restaurant_Events");
            }}
        />, { title: `Cancelar evento` });
    };

    function handleDeletion() {
        show(<DeletionForm
            item="event"
            itemId={data?.event_id as number}
            callback={async () => {
                await fetch("Restaurant_Events");
                navigate(`/back-office/restaurants`, { replace: true });
            }}
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
        const property = element.name as keyof Restaurant_Events;
        const _value = element.value;

        if ((data as restaurantEventType)[property] === _value) return;

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
            try {
                setUpdater(property);

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
        }, delay);
    };

    async function PATCH_EVENTS(e: SubmitEvent<HTMLFormElement>) {
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

    useEffect(() => { const tRef = timeoutRef.current; return () => { if (tRef) clearTimeout(tRef); } }, []);

    useEffect(() => { setFreeSpots(((data?.spots ?? 0) as number) === 0); }, [data?.spots]);
    useEffect(() => { setFreePricing(parseInt(`${data?.price ?? '0'}`) === 0); }, [data?.price]);

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

    switch (appState) {
        case "loading": {
            return <div className="w-full h-full flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </div>
        };

        default: {
            return <>
                <ScrollToSection
                    event_id={id as number}
                    thumbnail_url={data?.thumbnail_url as string}
                    video_url={data?.video_url as string}
                    hasExpired={assertions.hasPassed}
                />

                <div className="w-full flex flex-row justify-start items-center">
                    <Tag>
                        {getLabel(data.status)}

                        {data.status === "cancelled" && <Icon name="OutlinedTimes" />}
                        {data.status === "expired" && <Icon name="History" />}
                        {data.status === "ongoing" && <Icon name="OutlinedDot" />}
                        {data.status === "upcoming" && <Icon name="OutlinedCircle" />}
                    </Tag>
                </div>

                <div className="w-full flex flex-row justify-between items-center gap-9">
                    <label className="flex flex-row justify-start items-center gap-2 w-full">
                        {getUpdaterStatusIndicator("name")}

                        <input className="w-full" name="name" title="Nome do restaurant" data-element="h1" type="text" defaultValue={data?.name} onKeyDown={handleKeyDown} onBlur={assertions.hasPassed ? undefined : handleEvent} readOnly={assertions.hasPassed} />
                    </label>

                    <label className="flex flex-row justify-start items-center gap-2 opacity-35 hover:opacity-100">
                        {getUpdaterStatusIndicator("restaurant_id")}

                        <Icon name="Store" className="text-lg" />

                        <RestaurantsSelect title="Restaurante" id="restaurant_id" data-element="h1" name="restaurant_id" defaultOptionLabel="Local do evento" defaultValue={""} onChange={handleEvent} withoutDefaultOption disabled={assertions.hasPassed} />
                    </label>
                </div>

                <div className="w-full flex flex-col justify-start items-center gap-2 border rounded-md p-2">
                    <form onSubmit={PATCH_EVENTS} className="flex flex-row justify-start items-center gap-2 w-full text-lg">
                        {getUpdaterStatusIndicator("event_date", "start_time", "end_time")}

                        <Icon name="Calendar1" />

                        <span className="mr-auto text-lg">Data do evento (Começo/Fim)</span>

                        <input className="text-center" name="event_date" title="Data do evento" type="date" defaultValue={new Date(data?.event_date as Date).toISOString().split('T')[0]} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />

                        <input id="start_time" type="time" name="start_time" placeholder="Início" defaultValue={`${sHours}:${sMinutes}`} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />

                        <Icon name="ArrowRight" />

                        <input id="end_time" type="time" name="end_time" placeholder="Fim" defaultValue={`${eHours}:${eMinutes}`} onChange={handleSubmitOnChange} required readOnly={assertions.hasPassed} />
                    </form>

                    <hr />

                    <label className="flex flex-row justify-start items-center gap-2 w-full text-lg">
                        {getUpdaterStatusIndicator("spots")}

                        <Icon name="User" />

                        <span className="mr-auto text-lg">Nº de ingressos</span>

                        <div data-appState="warning" className="flex flex-row justify-start items-center gap-3">
                            <Icon name="Warning" className="text-lg" />

                            <span className="text-sm">Nº de ingressos não pode baixar os vendidos</span>
                        </div>

                        {(freeSpots)
                            ? <input className="text-right" name="spots" title="Nº de ingressos" data-element="p" type="text" value="Sem limite" onClick={() => toggleFreeSpots()} readOnly />
                            : <input className="text-right" name="spots" title="Nº de ingressos (editável)" data-element="p" min={(data?.spots ?? 0) as number} type="number" defaultValue={(data?.spots ?? 0) as number} onKeyDown={handleKeyDown} onBlur={assertions.hasPassed ? undefined : handleEvent} readOnly={assertions.hasPassed} />
                        }
                    </label>

                    <label className="flex flex-row justify-start items-center gap-2 w-full text-lg">
                        {getUpdaterStatusIndicator("price")}

                        <Icon name="Money" />

                        <span className="mr-auto text-lg">Ingresso</span>

                        <div data-appState="warning" className="flex flex-row justify-start items-center gap-3">
                            <Icon name="Warning" className="text-lg" />

                            <span className="text-sm">Alteração do só afetará os ingressos que não foram vendidos</span>
                        </div>

                        {(freePricing)
                            ? <input className="text-right" name="price" title="Preço do ingresso" data-element="p" type="text" value="Grátis" onClick={() => toggleFreePricing()} readOnly />
                            : <input className="text-right" name="price" title="Preço do ingresso (editável)" data-element="p" type="number" min={0} defaultValue={parseFloat(`${data?.price}`)} onKeyDown={handleKeyDown} onBlur={assertions.hasPassed ? undefined : handleEvent} readOnly={assertions.hasPassed} />
                        }
                    </label>
                </div>

                <label htmlFor="description" className="flex flex-row justify-start items-center gap-2 text-base">
                    {getUpdaterStatusIndicator("description")}

                    <Icon name="Notes" />

                    Sobre
                </label>

                <textarea title="Descrição" id="description" data-element="p" name="description" defaultValue={data?.description ?? ""} onChange={handleEvent} className="w-full" readOnly={assertions.hasPassed} />

                {data.status === "ongoing" ? null : <>
                    {data.status === "upcoming" && <Button className="w-full flex flex-row justify-start items-center" variant="warning" onClick={handleCancellation}>
                        <Icon name="Close" />

                        Cancelar o evento
                    </Button>}

                    {data.status === "cancelled" && <Button className="w-full flex flex-row justify-start items-center" variant="danger" onClick={handleDeletion}>
                        <Icon name="Trash" />

                        Eliminar o evento
                    </Button>}
                </>}

                <hr className="w-full h-[1px]" />

                <h1>Ingressos comprados</h1>

                {ticket && <div className="w-full flex flex-row justify-start items-center gap-2">
                    <Tag>
                        <Icon name="Party" />

                        {ticket.name}
                    </Tag>

                    <span className="ml-auto" data-text="tag">{getLabel(ticket.product_type)}</span>

                    <Tag>
                        <Icon name="Money" />

                        {Boolean(parseInt(`${ticket.price}`)) ? formatNumber(parseFloat(`${ticket.price}`)) : "Grátis"}
                    </Tag>
                </div>}

                <TicketBuyersList
                    mode="admin"
                    className="w-full"
                    defaultEvent={data?.event_id}
                    defaultRestaurant={data?.restaurant_id}
                />
            </>
        };
    };
};

type sectionType = "thumbnail" | "video";
const ScrollToSection = ({
    callback,
    event_id,
    hasExpired = false,
    onThumbnailUpdate,
    onVideoUpdate,
    thumbnail_url: dt,
    video_url: dv,
}: {
    callback?: Function;
    event_id: number;
    hasExpired?: boolean;
    onVideoUpdate?: (url: string) => void;
    onThumbnailUpdate?: (url: string) => void;
    thumbnail_url: string;
    video_url: string;
}) => {
    const {
        update_PARTIAL
    } = useApp();

    const [appState, setState] = useState<statusType<`uploading-${"thumbnail" | "video"}`>>("idle");
    const [pickedSection, setPickedSection] = useState<`event-${sectionType}`>("event-thumbnail");
    const [thumbnail_url, setThumbnailURL] = useState(dt);
    const [video_url, setVideoURL] = useState(dv);

    const sections = [
        { key: `Capa`, value: "event-thumbnail", icon: <Icon name="Image" /> },
        { key: "Vídeo", value: "event-video", icon: <Icon name="Video" /> },
    ];

    function handleUpload(type: ("thumbnail" | "video")) {
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
    }

    function toggleUploadState(type: ("thumbnail" | "video")) {
        return (e: any) => {
            switch (type) {
                case "thumbnail": setState("uploading-thumbnail"); break;
                case "video": setState("uploading-video"); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    return <section className="HORIZONTAL_SCROLLTO_SECTION w-full">
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant="text" data-selected={pickedSection === kvp.value}>
                {kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div data-type="container">
            <section id="event-thumbnail" className="gap-2">
                <div data-type="thumbnail" style={{ height: "300px", backgroundImage: `url(${thumbnail_url})` }} className="w-full flex flex-col justify-center items-center rounded-md border">
                    {appState === "uploading-thumbnail" && <Icon name="Loading" className="animate-spin" />}
                </div>

                {!hasExpired && <FileUploaderRegular
                    className="ml-auto"
                    filesViewMode="grid"
                    multipleMin={1}
                    multipleMax={1}
                    localeName="pt"
                    localeDefinitionOverride={AppSettings.UploadCare.Overrides.update.thumbnail}
                    onFileUploadStart={toggleUploadState("thumbnail")}
                    onFileUploadSuccess={handleUpload("thumbnail")}
                    pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                    sourceList="local, facebook, gdrive"
                    confirmUpload
                    gridShowFileNames
                    imgOnly
                    useCloudImageEditor
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
                        className="rounded-md border"
                        playing
                        controls
                    />
                }

                {!hasExpired && <FileUploaderRegular
                    className="ml-auto"
                    accept="video/mp4,video/webm,video/mov,video/avi"
                    filesViewMode="grid"
                    multipleMin={1}
                    multipleMax={1}
                    localeName="pt"
                    localeDefinitionOverride={AppSettings.UploadCare.Overrides.update.video}
                    onFileUploadStart={toggleUploadState("video")}
                    onFileUploadSuccess={handleUpload("video")}
                    pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                    sourceList="local, facebook, gdrive"
                    confirmUpload
                    gridShowFileNames
                />}
            </section>
        </div>
    </section>
};

export default EventPanel;