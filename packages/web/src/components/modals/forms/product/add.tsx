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
} from "@Madeirense/shared";

import env from "env";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";
import RestaurantsSelector from "components/forms/elements/selects/restaurants";

import type {
    $Enums
} from "@Madeirense/database/browser";

import type { IComponentState } from "components/interface";

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
    }

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

    return <form onSubmit={POST} className="h-ful w-full flex flex-col justify-start items-start gap-4" {...props}>
        <fieldset data-state={assertions.isWorking ? "disabled" : "idle"} className="w-full flex flex-col justify-start items-start gap-6 rounded-md">
            <legend>Sobre</legend>

            <header className="w-full flex flex-row justify-between items-center">
                <h5>Imagem da capa</h5>

                <FileUploaderRegular
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
            </header>

            {[
                status === "uploading-thumbnail",
                data?.uploadedThumbnailURL !== ""
            ].includes(true) && <div data-type="thumbnail" style={{ backgroundImage: `url(${data?.uploadedThumbnailURL})` }} className="w-full flex flex-col justify-center items-center rounded-md min-h-[300px]">
                    {status === "uploading-thumbnail" && <Icon name="Loading" className="animate-spin" />}
                </div>}

            <label htmlFor="name" className="w-full text-left">
                <input id="name" className="w-full" name="name" title="Nome do prato" data-element="h3" type="text" placeholder="Nome do produto" required />
            </label>

            <div className="w-full flex flex-row justify-between items-center gap-5">
                <label htmlFor="product_type" className="w-full text-left">
                    <select onChange={handleProductTypePick} title="Tipo de produto" id="product_type" name="product_type" data-element="h3" defaultValue={""} className="w-full" required>
                        <option hidden value="">Tipo do produto</option>

                        {MENU_PRODUCT_TYPES.map(t => <option key={t} value={t}>
                            {getLabel(t)}
                        </option>)}
                    </select>
                </label>

                <label htmlFor="product_composition" className="w-full text-left">
                    <select disabled={!Boolean(form.data?.pickedProductType)} title="Composição do produto" id="product_composition" name="product_composition" data-element="h3" defaultValue={""} className="w-full" required>
                        <option hidden value="">Composição do produto</option>

                        {MENU_PRODUCT_COMPOSITIONS.filter(_ONLY_APPLICABLE_PRODUCT_COMPOSITIONS(form.data?.pickedProductType)).map(t => <option key={t} value={t}>
                            {getLabel(t)}
                        </option>)}
                    </select>
                </label>
            </div>

            <label htmlFor="description" className="w-full text-left">
                <span>Descrição</span>

                <br />

                <textarea id="description" name="description" placeholder="Descrição..." data-element="p" className="w-full p-2" required />
            </label>
        </fieldset>

        <fieldset className="w-full flex flex-row justify-between items-center gap-2 border rounded-lg">
            <legend>Preço</legend>

            <label htmlFor="price" className="text-lg flex flex-row justify-start items-center gap-2">
                <Icon name="Money" />

                <span>Preço</span>
            </label>

            <input title="Preço" id="price" name="price" defaultValue={0} min={0} type="number" data-element="h3" required />
        </fieldset>

        <fieldset className="w-full flex flex-col justify-start items-start gap-2 border rounded-md">
            <legend>Outros</legend>

            <label htmlFor="prep_time_minutes" className="w-full flex flex-row justify-between items-center gap-2 p-2">
                <Icon name="Time" />

                <span className="mr-auto">Tempo de preparo (em minutos)</span>

                <input title="Tempo de preparo (em minutos)" id="prep_time_minutes" name="prep_time_minutes" defaultValue={3} min={3} type="number" required />
            </label>

            <label className="flex flex-row justify-start items-center gap-1 w-full p-2">
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
            {error && <p data-state="error" className="w-full flex flex-row justify-start items-center gap-4">
                <Icon name="ExclamationCircle" />

                {error.message}
            </p>}

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