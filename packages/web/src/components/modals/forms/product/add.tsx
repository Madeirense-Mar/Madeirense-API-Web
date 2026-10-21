import {
    useState,
    type ComponentProps,
    type ChangeEvent,
    type SubmitEvent
} from "react";

import {
    defineLocale,
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    MENU_PRODUCT_COMPOSITIONS,
    MENU_PRODUCT_TYPES,
    getLabel,
    formatUUID_UC_CDN_URL,
    locales,
    resolveClassNames,
} from "@Madeirense/shared";

import env from "env";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";

import DescriptionLabel from "components/forms/elements/labels/description";
import RestaurantsSelector from "components/forms/elements/selects/restaurants";

import styles from "./add.module.css";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type {
    IComponentState
} from "components/interface";
import Tag from "components/tags";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    callback?: () => void;
};

type assetType = "thumbnail";

type stateType = {
    uploadedThumbnailURL?: string,
    pickRestaurant?: boolean,
    pickedProductType?: $Enums.Products_product_type
};

const UPLOAD_CARE_PUBLIC_KEY = env.UPLOAD_CARE_PUBLIC_KEY;

defineLocale('pt', async () => {
    return locales.get("pt")?.uploadCare as any;
});

const AddProductForm = ({
    callback,
    ...props
}: IPropTypes) => {
    const { create } = useApp();
    const { show, eject } = useModal();

    const [form, updateForm] = useState<IComponentState<stateType, `uploading-${assetType}`>>({
        data: {
            pickedProductType: undefined,
            pickRestaurant: false,
            uploadedThumbnailURL: "",
        },
        status: "idle",
        error: null
    });

    const {
        data,
        error,
        status
    } = form;

    const assertions = {
        isWorking: [
            "uploading-thumbnail"
        ].includes(status)
    };

    const _ONLY_APPLICABLE_PRODUCT_COMPOSITIONS = (product_type?: $Enums.Products_product_type) => {
        if (!product_type) return (comp: $Enums.Products_product_composition) => true;

        return (comp: $Enums.Products_product_composition) => {
            switch (product_type) {
                case "beverage":
                    return ([
                        "alcoholic",
                        "non_alcoholic"
                    ] as $Enums.Products_product_composition[]).includes(comp);

                default:
                    return !([
                        "alcoholic",
                        "non_alcoholic",
                        "merchandise"
                    ] as $Enums.Products_product_composition[]).includes(comp);
            }
        }
    };

    const handleProductTypePick = ({ target }: ChangeEvent<HTMLSelectElement>) => updateForm(p => {
        return {
            ...p,
            data: {
                ...p.data,
                pickedProductType: target.value as $Enums.Products_product_type
            }
        }
    });

    const handleRestaurantToggle = ({ target }: ChangeEvent<HTMLInputElement>) => updateForm(p => {
        return {
            ...p,
            data: {
                ...p.data,
                pickRestaurant: !target.checked
            }
        }
    });

    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const elements = $form.elements;
        const $submitter = ((e.nativeEvent as any).submitter as HTMLButtonElement);

        try {
            updateForm(p => { return { ...p, status: "loading" } });

            await create({
                property: "Products",
                payload: {
                    name: (elements.namedItem("name") as HTMLInputElement).value as string,
                    description: (elements.namedItem("description") as HTMLInputElement).value as string,
                    price: parseFloat((elements.namedItem("price") as HTMLInputElement).value as string),
                    prep_time_minutes: parseInt((elements.namedItem("prep_time_minutes") as HTMLInputElement).value as string),
                    restaurant_id: !data?.pickRestaurant ? undefined : parseInt((elements.namedItem("restaurant_id") as HTMLSelectElement).value as string),
                    discount: 0,
                    product_composition: (elements.namedItem("product_composition") as HTMLInputElement).value as $Enums.Products_product_composition,
                    product_type: (elements.namedItem("product_type") as HTMLInputElement).value as $Enums.Products_product_type,
                    thumbnail: data?.uploadedThumbnailURL,
                }
            });

            updateForm(p => { return { ...p, status: "idle" } });

            callback?.();

            eject();

            if ($submitter.value === "another") setTimeout(() => {
                show(<AddProductForm />, { title: `Adicionar um novo produto` });
            }, 2500);
        } catch (error) {
            updateForm(p => {
                return {
                    ...p,
                    status: "error",
                    error: new Error((error as Error).message)
                }
            });
        }
    };

    function toggleUploadState(type: ("thumbnail" | "video")) {
        return (e: any) => {
            switch (type) {
                case "thumbnail": updateForm(f => { return { ...f, status: "uploading-thumbnail", data: { ...f.data, uploadedThumbnailURL: "" } } }); break;

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

                default: throw new Error("Unknown upload type");
            }
        }
    };

    return <form onSubmit={POST} className={resolveClassNames(styles.form, "h-ful w-full flex flex-col justify-start items-start gap-11")} {...props}>
        <fieldset className="w-full flex flex-col justify-start items-center gap-5">
            <div data-type="thumbnail" style={{ backgroundImage: `url(${data?.uploadedThumbnailURL})` }} className="flex flex-col justify-center items-center">
                {assertions.isWorking
                    ? <Icon name="Loading" className="animate-spin" />

                    : !data?.uploadedThumbnailURL && <FileUploaderRegular
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

            {data?.uploadedThumbnailURL && <FileUploaderRegular
                className="ml-auto"
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

        <fieldset data-state={assertions.isWorking ? "disabled" : "idle"} className="w-full flex flex-col justify-start items-center gap-5">
            <DescriptionLabel
                className="w-full"
                title="Nome do producto"
                description="O que estará descrito na lista, nas facturas."
                icon="Product"
                layout="column"
                input={{
                    element: "input",
                    props: {
                        id: "name",
                        className: "w-full",
                        name: "name",
                        title: "Nome do prato",
                        type: "text",
                        placeholder: "Nome do produto",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full"
                title="Tipo"
                description="Serve para o filtro e caracterização. Ajuda os clientes a encontram-no facilmente."
                icon="ProductType"
                input={{
                    element: "select",
                    options: [
                        { key: "Tipo do producto", value: { data: "", props: { hidden: true } } },
                        ...MENU_PRODUCT_TYPES.map(t => ({
                            key: getLabel(t), value: { data: t }
                        }))
                    ],
                    props: {
                        id: "product_type",
                        className: "w-full text-center",
                        name: "product_type",
                        title: "Tipo de producto",
                        defaultValue: "",
                        onChange: handleProductTypePick,
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full"
                title="Composição"
                description="Serve para o filtro e caracterização. Ajuda os clientes a encontram-no facilmente."
                icon="ProductComposition"
                input={{
                    element: "select",
                    options: [
                        { key: "Composição do producto", value: { data: "", props: { hidden: true } } },
                        ...MENU_PRODUCT_COMPOSITIONS.filter(_ONLY_APPLICABLE_PRODUCT_COMPOSITIONS(form.data?.pickedProductType)).map(t => ({
                            key: getLabel(t), value: { data: t }
                        }))
                    ],
                    props: {
                        id: "product_composition",
                        className: "w-full text-center",
                        name: "product_composition",
                        title: "Tipo de composição",
                        defaultValue: "",
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                layout="column"
                className="w-full"
                title="Descrição"
                description="Informação sobre o producto. Contem alergénicos? Para quantas pessoas serve? Tem algum facto ou história interessante?"
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

        <hr className="w-full opacity-30" />

        <fieldset className="w-full flex flex-col justify-start items-center gap-5">
            <DescriptionLabel
                className="w-full"
                title="Preço"
                description={<span>
                    Quanto custa? Preencha com <span className="font-black">0</span> para ser grátis.
                </span>}
                icon="PriceTags"
                input={{
                    element: "input",
                    props: {
                        id: "price",
                        className: "w-full text-center",
                        name: "price",
                        title: "Preço",
                        type: "number",
                        defaultValue: 0,
                        min: 0,
                        required: true
                    }
                }}
            />

            <DescriptionLabel
                className="w-full"
                title="Tempo de preparo (em minutos)"
                description={<span>
                    Tempo de demora para preparar o producto. Em caso de producto para restaurantes, o tempo de demora é determinado pelo producto no carrinho que mais demora.
                </span>}
                icon="Time"
                input={{
                    element: "input",
                    props: {
                        id: "prep_time_minutes",
                        className: "w-full text-center",
                        name: "prep_time_minutes",
                        title: "Tempo de preparo",
                        type: "number",
                        defaultValue: 3,
                        min: 3,
                        required: true
                    }
                }}
            />
        </fieldset>

        <hr className="w-full opacity-30" />

        <fieldset className="w-full flex flex-col justify-start items-center gap-5">
            <label className="flex flex-row justify-start items-center gap-1 w-full p-2" data-variant="selectable">
                <input type="checkbox" placeholder="Aonde será servido o produto" defaultChecked={!data?.pickRestaurant} onChange={handleRestaurantToggle} />

                <span>Produto será servido por todos os restaurantes</span>
            </label>

            {data?.pickRestaurant && <label htmlFor="restaurant_id" className="w-full text-left">
                <span>Restaurante</span>

                <br />

                <RestaurantsSelector className="w-full" title="Restaurante" id="restaurant_id" data-element="h1" name="restaurant_id" defaultOptionLabel="Local do evento" defaultValue={""} withoutDefaultOption />
            </label>}
        </fieldset>

        <div className="flex flex-col justify-start items-start w-full gap-2 mt-auto">
            {error && <Tag variant="danger">
                <Icon name="ExclamationCircle" />

                {error.message}
            </Tag>}

            {(status === "loading")
                ? <Button className="w-full" disabled>
                    <Icon name="Loading" className="animate-spin" />
                </Button>

                : <div className="w-full flex flex-row justify-between items-center gap-2">
                    <Button value="another" type="submit" variant="secondary">
                        Submeter e adicionar outro
                    </Button>

                    <Button value="once" type="submit">
                        Adicionar
                    </Button>
                </div>
            }
        </div>
    </form>
};

export default AddProductForm;