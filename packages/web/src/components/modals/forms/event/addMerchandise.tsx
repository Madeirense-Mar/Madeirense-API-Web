//#region Imports -----------------------------------------
import {
    useState,
    type ComponentProps,
    type SubmitEvent
} from "react";

import {
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    formatUUID_UC_CDN_URL,
    resolveClassNames
} from "@Madeirense/shared";

import env from "env";

import MXP$App from "configurations";

import {
    useModal
} from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tags";

import DescriptionLabel from "components/forms/elements/labels/description";

import styles from "./addMerchandise.module.css";

import type {
    IComponentState
} from "components/interface";
//#endregion

// ***************************************************************************************************************

//#region Interfaces and types ----------------------------
interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
    event_id: number;
};

type ModalState = {
    uploadedThumbnailURL?: string
};
//#endregion

const {
    "restaurant-events": RestaurantEventsAPI
} = MXP$App.Base.Business.endpoints;

const AddRestaurantEventMerchandiseForm = ({ callback, className, event_id, onSubmit, ...props }: IPropTypes) => {
    //#region Hooks and state declarations ----------------
    const { eject } = useModal();

    const [form, updateForm] = useState<IComponentState<ModalState, "uploading-thumbnail">>({
        data: {
            uploadedThumbnailURL: ""
        },
        status: "idle",
        error: null
    });
    //#endregion

    //#region Variable declarations -----------------------
    const {
        data,
        error,
        status
    } = form;

    const assertions = {
        "areButtonsDisabled": [
            error !== null,
            status === "loading",
            status === "syncing",
            status === "updating",
            status === "uploading-thumbnail",
        ].includes(true),

        "isWorking": [
            "uploading-thumbnail"
        ].includes(status)
    };
    //#endregion

    //#region Functions -----------------------------------
    function handleCallback() {
        eject();

        callback?.();
    };

    const handleUpload = ({ uuid, mimeType, errors }: any) => {
        try {
            if (!uuid) {
                console.error(errors);

                throw new Error("Asset UUID is null, the upload possibly failed. Check the logs for more information");
            }

            updateForm(f => ({
                ...f,
                data: {
                    ...f.data,
                    uploadedThumbnailURL: formatUUID_UC_CDN_URL(uuid)
                },
                status: "idle",
            }));
        } catch (error) {
            updateForm(f => ({
                ...f,
                error: error as Error,
                data: {
                    ...f.data,
                    uploadedThumbnailURL: ""
                },
                status: "error",
            }));
        }
    };

    const toggleUploadState = (e: any) => {
        updateForm(f => {
            return {
                ...f,
                status: "uploading-thumbnail",
                data: { ...f.data, uploadedThumbnailURL: "" }
            }
        });
    };

    async function $POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;

        try {
            updateForm(p => { return { ...p, status: "loading" } });

            if (data?.uploadedThumbnailURL == "")
                throw new Error("O evento deve ter uma imagem de capa.");

            const _price = (elements.namedItem("price") as HTMLInputElement).value as string;
            const price = _price === "" ? 0 : parseFloat(`${_price}`);

            await RestaurantEventsAPI.createProduct(
                event_id,
                {
                    name: (elements.namedItem("name") as HTMLInputElement).value as string,
                    description: (elements.namedItem("description") as HTMLInputElement).value as string,
                    thumbnail_url: data?.uploadedThumbnailURL ?? "",
                    price
                }
            );

            updateForm(p => { return { ...p, status: "idle" } });

            handleCallback();
        } catch (error) {
            updateForm(p => { return { ...p, status: "error", error: new Error((error as Error).message) } });
        } finally {
            onSubmit?.(e);
        }
    };
    //#endregion

    //#region DOM -----------------------------------------
    return <form
        className={resolveClassNames(styles.form, className)}
        onSubmit={$POST}
        {...props}
    >
        <fieldset data-state={assertions.isWorking ? "disabled" : "idle"}>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Image" />

                    Capa
                </Tag>

                <hr className="w-full" />
            </legend>

            <div data-type="thumbnail" style={{ backgroundImage: `url(${data?.uploadedThumbnailURL})` }} className="flex flex-col justify-center items-center">
                {(status === "uploading-thumbnail") && <Icon name="Loading" className="animate-spin" />}
            </div>

            <FileUploaderRegular
                className="ml-auto"
                filesViewMode="grid"
                multipleMin={1}
                multipleMax={1}
                localeName="pt"
                onFileUploadStart={toggleUploadState}
                onFileUploadSuccess={handleUpload}
                pubkey={env.UPLOAD_CARE_PUBLIC_KEY}
                sourceList="local, facebook, gdrive"
                confirmUpload
                gridShowFileNames
                imgOnly
                useCloudImageEditor
            />
        </fieldset>

        <fieldset>
            <legend>
                <Tag variant="secondary">
                    <Icon name="Party" />

                    Merchandise
                </Tag>

                <hr className="w-full" />
            </legend>


            <DescriptionLabel
                className="w-full"
                title="Nome"
                description="Como se chama o producto."
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
                description="Informação sobre o producto."
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

            <DescriptionLabel
                className="w-full"
                title="Preço"
                description={
                    <span className="italic opacity-45 text-sm">(Deixar vazio se for gratuito)</span>
                }
                input={{
                    element: "input",
                    props: {
                        id: "price",
                        type: "number",
                        min: 0,
                        name: "price",
                        placeholder: "Preço",
                        className: "w-full"
                    }
                }}
            />
        </fieldset>

        {error && <Tag className="mx-auto" variant="danger">
            <Icon name="ExclamationCircle" />

            {error.message}
        </Tag>}

        <div
            className="w-full flex flex-row justify-between items-start gap-3"
            {...{
                ...(assertions.areButtonsDisabled)
                    ? { "data-disabled": "" }
                    : {}
            }}
        >
            <Button variant="secondary" onClick={handleCallback}>
                <Icon name="Close" />

                Cancelar
            </Button>

            <Button type="submit">
                {(status === "loading")
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="Add" />
                }

                Criar merchandise
            </Button>
        </div>
    </form>
    //#endregion
};

export default AddRestaurantEventMerchandiseForm;