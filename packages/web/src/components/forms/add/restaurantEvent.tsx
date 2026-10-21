import {
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import ReactPlayer from "react-player";

import {
    defineLocale,
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    formatUUID_UC_CDN_URL,
    locales,
    resolveClassNames
} from "@Madeirense/shared";

import env from "env";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import AppSettings from "settings";

import RestaurantsSelector from "../elements/selects/restaurants";

import styles from "./restaurantEvent.module.css";

import type {
    IComponentState
} from "components/interface";
import DescriptionLabel from "../elements/labels/description";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
    hideTitle?: boolean,
};

type AssetType = "thumbnail" | "video";

type ModalState = {
    uploadedThumbnailURL?: string
    uploadedVideoURL?: string
};

const UPLOAD_CARE_PUBLIC_KEY = env.UPLOAD_CARE_PUBLIC_KEY;

defineLocale('pt', async () => {
    return (locales.get("pt")?.uploadCare ?? {}) as any;
});

const AddRestaurantEventForm = ({
    callback,
    hideTitle = false,
    ...props
}: IPropTypes) => {
    const { create } = useApp();
    const [form, updateForm] = useState<IComponentState<ModalState, `uploading-${AssetType}`>>({
        data: {
            uploadedThumbnailURL: "",
            uploadedVideoURL: ""
        },
        status: "idle",
        error: null
    });

    const { data, error, status } = form;

    const isWorking = [
        "uploading-thumbnail",
        "uploading-video"
    ].includes(status);

    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        try {
            updateForm(p => { return { ...p, status: "loading" } });

            if ([data?.uploadedThumbnailURL, data?.uploadedVideoURL].includes("")) throw new Error("O evento deve ter uma imagem de capa e um vídeo promocional");

            const _price = (elements.namedItem("price") as HTMLInputElement).value as string;
            const price = _price === "" ? 0 : parseFloat(`${_price}`);

            const _spots = (elements.namedItem("spots") as HTMLInputElement).value as string;
            const spots = _spots === "" ? 0 : parseFloat(`${_spots}`);

            await create({
                property: "Restaurant_Events",
                payload: {
                    restaurant_id: parseInt(`${(elements.namedItem("restaurant_id") as HTMLInputElement).value as string}`),
                    name: (elements.namedItem("name") as HTMLInputElement).value as string,
                    description: (elements.namedItem("description") as HTMLInputElement).value as string,
                    event_date: new Date((elements.namedItem("event_date") as HTMLInputElement).value as string),
                    end_time: (elements.namedItem("end_time") as HTMLInputElement).value as string,
                    start_time: (elements.namedItem("start_time") as HTMLInputElement).value as string,
                    thumbnail_url: data?.uploadedThumbnailURL ?? "",
                    video_url: data?.uploadedVideoURL ?? "",
                    price,
                    spots
                }
            });

            updateForm(p => { return { ...p, status: "idle" } });

            callback?.();
        } catch (error) {
            updateForm(p => { return { ...p, status: "error", error: new Error((error as Error).message) } });
        }
    };

    function toggleUploadState(type: ("thumbnail" | "video")) {
        return (e: any) => {
            switch (type) {
                case "thumbnail": updateForm(f => { return { ...f, status: "uploading-thumbnail", data: { ...f.data, uploadedThumbnailURL: "" } } }); break;
                case "video": updateForm(f => { return { ...f, status: "uploading-video", data: { ...f.data, uploadedVideoURL: "" } } }); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    function handleUpload(type: ("thumbnail" | "video")) {
        return ({ uuid, mimeType, errors }: any) => {
            if (!uuid) {
                console.error(errors);

                throw new Error("Asset UUID is null, the upload possibly failed. Check the logs for more information");
            }

            switch (type) {
                case "thumbnail": updateForm(f => { return { ...f, status: "idle", data: { ...f.data, uploadedThumbnailURL: formatUUID_UC_CDN_URL(uuid) } } }); break;
                case "video": updateForm(f => { return { ...f, status: "idle", data: { ...f.data, uploadedVideoURL: `${formatUUID_UC_CDN_URL(uuid)}${mimeType.split("/").join(".")}` } } }); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    return <form onSubmit={POST} className={styles.form} {...props}>
        {!hideTitle && <h2>Evento</h2>}

        <fieldset data-state={isWorking ? "disabled" : "idle"}>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Image" />

                    Capa
                </Tag>

                <hr className="w-full" />
            </legend>

            <div data-type="thumbnail" style={{ backgroundImage: `url(${data?.uploadedThumbnailURL})` }} className="w-full flex flex-col justify-center items-center rounded-md min-h-[300px] border">
                {status === "uploading-thumbnail"
                    ? <Icon name="Loading" className="animate-spin" />
                    : <FileUploaderRegular
                        filesViewMode="grid"
                        multipleMin={1}
                        multipleMax={1}
                        localeName="pt"
                        onFileUploadStart={toggleUploadState("thumbnail")}
                        onFileUploadSuccess={handleUpload("thumbnail")}
                        pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                        sourceList="local, facebook, gdrive"
                        confirmUpload
                        gridShowFileNames
                        imgOnly
                        useCloudImageEditor
                    />
                }
            </div>

            {[
                status === "uploading-thumbnail",
                data?.uploadedThumbnailURL !== ""
            ].includes(true) && <FileUploaderRegular
                    filesViewMode="grid"
                    multipleMin={1}
                    multipleMax={1}
                    localeName="pt"
                    onFileUploadStart={toggleUploadState("thumbnail")}
                    onFileUploadSuccess={handleUpload("thumbnail")}
                    pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                    sourceList="local, facebook, gdrive"
                    confirmUpload
                    gridShowFileNames
                    imgOnly
                    useCloudImageEditor
                />}
        </fieldset>

        <fieldset data-state={isWorking ? "disabled" : "idle"}>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Video" />

                    Vídeo promocional
                </Tag>

                <hr className="w-full" />
            </legend>

            {(data?.uploadedVideoURL !== "")
                ? <>
                    <ReactPlayer
                        src={data?.uploadedVideoURL}
                        width="100%"
                        height={300}
                        className="rounded-md border"
                        playing
                        controls
                    />

                    <FileUploaderRegular
                        className="ml-auto"
                        accept="video/mp4,video/webm,video/mov,video/avi"
                        filesViewMode="grid"
                        multipleMin={1}
                        multipleMax={1}
                        localeName="pt"
                        localeDefinitionOverride={AppSettings.UploadCare.Overrides.video}
                        onFileUploadStart={toggleUploadState("video")}
                        onFileUploadSuccess={handleUpload("video")}
                        pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                        sourceList="local, facebook, gdrive"
                        confirmUpload
                        gridShowFileNames
                    />
                </>

                : <div data-type="thumbnail" className="w-full flex flex-col justify-center items-center rounded-md min-h-[300px] border">
                    {status === "uploading-video"
                        ? <Icon name="Loading" className="animate-spin" />
                        : <FileUploaderRegular
                            accept="video/mp4,video/webm,video/mov,video/avi"
                            filesViewMode="grid"
                            multipleMin={1}
                            multipleMax={1}
                            localeName="pt"
                            localeDefinitionOverride={AppSettings.UploadCare.Overrides.video}
                            onFileUploadStart={toggleUploadState("video")}
                            onFileUploadSuccess={handleUpload("video")}
                            pubkey={UPLOAD_CARE_PUBLIC_KEY as string}
                            sourceList="local, facebook, gdrive"
                            confirmUpload
                            gridShowFileNames
                        />
                    }
                </div>
            }
        </fieldset>

        <fieldset className="w-full flex flex-col justify-start items-start gap-2">
            <legend>
                <Tag variant="secondary">
                    <Icon name="Party" />

                    Evento
                </Tag>

                <hr className="w-full" />
            </legend>

            <DescriptionLabel
                className="w-full"
                title="Nome"
                description="Como se chama o evento."
                layout="column"
                input={{
                    element: "input",
                    props: {
                        id: "name",
                        className: "w-full",
                        name: "name",
                        title: "Nome",
                        type: "text",
                        placeholder: "Nome...",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                layout="column"
                className="w-full"
                title="Descrição"
                description="Informação sobre o evento."
                input={{
                    element: "textarea",
                    props: {
                        id: "description",
                        className: "w-full",
                        name: "description",
                        title: "Descrição",
                        placeholder: "Descrição...",
                        required: true
                    }
                }}
            />
        </fieldset>

        <fieldset className="w-full flex flex-row justify-start items-start gap-2">
            <legend>
                <Tag variant="secondary">
                    <Icon name="Calendar1" />

                    Localização, Data e horário
                </Tag>

                <hr className="w-full" />
            </legend>

            <label htmlFor="restaurant_id" className="w-full text-left">
                <span className="font-extrabold">Restaurante</span>

                <br />

                <span>
                    Em que restaurante acontecerá o evento?
                </span>

                <RestaurantsSelector title="Restaurante" id="restaurant_id" name="restaurant_id" defaultOptionLabel="Local do evento" defaultValue={""} className="w-full" required hideDefaultOption />
            </label>

            <label htmlFor="event_date" className="w-full text-left">
                <span className="font-extrabold">Data do evento</span>

                <br />

                <input id="event_date" type="date" min={new Date().toISOString().split('T')[0]} name="event_date" placeholder="Data do evento" className="w-full" required />
            </label>

            <div className="flex flex-row justify-start items-center gap-2 w-full">
                <label htmlFor="start_time" className="w-full">
                    <span className="font-extrabold">Hora de começo</span>

                    <br />

                    <input id="start_time" type="time" name="start_time" placeholder="Começo" className="w-full text-center" />
                </label>

                <label htmlFor="end_time" className="w-full">
                    <span className="font-extrabold">Hora do fim</span>

                    <br />

                    <input id="end_time" type="time" name="end_time" placeholder="Fim" className="w-full text-center" />
                </label>
            </div>
        </fieldset>

        <fieldset className="w-full flex flex-row justify-start items-start gap-2">
            <legend>
                <Tag variant="secondary">
                    <Icon name="PriceTags" />

                    Preço de entrada e capacidade
                </Tag>

                <hr className="w-full" />
            </legend>

            <DescriptionLabel
                className="w-full"
                title="Preço"
                description={
                    <span className="italic opacity-45 text-sm">(Deixar vazio se o ingresso for grátis)</span>
                }
                input={{
                    element: "input",
                    props: {
                        id: "price",
                        type: "number",
                        min: 0,
                        name: "price",
                        placeholder: "Preço",
                        className: "w-full",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full"
                title="Capacidade"
                description={
                    <span className="italic opacity-45 text-sm">(Deixar vazio se não tiver limite)</span>
                }
                input={{
                    element: "input",
                    props: {
                        id: "spots",
                        type: "number",
                        min: 0,
                        name: "spots",
                        placeholder: "Capacidade",
                        className: "w-full",
                        required: true
                    }
                }}
            />
        </fieldset>

        {error && <Tag className="mx-auto" variant="danger">
            <Icon name="ExclamationCircle" />

            {error.message}
        </Tag>}

        <Button type="submit" className="w-full" disabled={status === "loading"}>
            Postar evento

            {status === "loading" && <Icon name="Loading" className="animate-spin" />}
        </Button>
    </form>
};

export default AddRestaurantEventForm;