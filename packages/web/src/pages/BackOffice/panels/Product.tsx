import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent
} from "react";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
    defineLocale,
    FileUploaderRegular
} from "@uploadcare/react-uploader";

import {
    APP_TTL_DEFAULT,
    MENU_PRODUCT_TYPES,
    formatUUID_UC_CDN_URL,
    getLabel,
    locales,
    which,
    type productType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, { 
    Queries$Types
} from "configurations/queries";

import AppSettings from "settings";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useNotifications } from "contexts/Notifications";

import Button from "components/buttons";
import RestaurantsSelect from "components/forms/elements/selects/restaurants";
import Icon from "components/icon";
import ProductCommentsList from "components/lists/productComments";

import DeletionForm from "components/modals/forms/delete";

import env from "env";

import type {
    Products
} from "@Madeirense/database/browser";

import type { 
    statusType
} from "components/types";

// ***************************************************************************************************************

const UPLOAD_CARE_PUBLIC_KEY = env.UPLOAD_CARE_PUBLIC_KEY;

defineLocale('pt', async () => {
    return locales.get("pt")?.uploadCare ?? {} as any;
});

const delayMS = 2500;

function ProductPanel({ id }: { id: number }) {
    const { products } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const navigate = useNavigate();

    const {
        fetch,
        get,
        state: appState,
        update_PARTIAL,
    } = useApp();

    const cachedData = get("Products")?.find(({ product_id }) => product_id === id) ?? null;

    const { show } = useModal();
    const { push } = useNotifications();

    const [updater, setUpdater] = useState<keyof Products | "">("");
    const [deleting, setDeleting] = useState(false);
    const [freePricing, setFreePricing] = useState<boolean>(false);
    const [pickRestaurant, setPickRestaurant] = useState<boolean>(false);

    const {
        data: fetchedData,
        isFetching
    } = useQuery({
        queryKey: ([
            "App$GetOrder",
            "product",
            id
        ] as Queries$Types.queryKey[]),
        queryFn: ApplicationQueries.getItem<productType>,
        enabled: (appState === "idle") && (cachedData === null)
    });

    const data = which(cachedData, fetchedData) as productType;

    function getUpdaterStatusIndicator(...properties: (keyof Products)[]) {
        if (properties.includes(updater as keyof Products)) return <Icon name="Loading" className="animate-spin" />;

        return null;
    };

    function handleEvent(e: any) { update(e.target); };

    function handleDeletion() {
        setDeleting(true);

        show(<DeletionForm
            item="product"
            itemId={data?.product_id as number}
            callback={async () => {
                await fetch("Products");

                navigate(`/back-office/products`, { replace: true })
            }}
        />, { title: `Ocultar produto`, onClose: () => setDeleting(false) });
    };

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key.toLowerCase() !== "enter") return;

        update(e.target as HTMLInputElement, 0);
    };

    async function handleRecovery({ target }: MouseEvent<HTMLButtonElement>) {
        try {
            setUpdater("delisted");

            await products.recover(parseInt((target as HTMLButtonElement).value));

            await fetch("Products");
        } catch (error) {
            push({
                id: "N#ERROR_RECOVERING_PRODUCT",
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
    };

    function toggleFreePricing() { setFreePricing(f => !f); }
    function toggleRestaurantPick() { setPickRestaurant(p => !p) };

    function update(element: any, delay = delayMS) {
        const property = element.name as keyof Products;
        const _value = element.value;

        if ((data as productType)[property] === _value) return;

        let value;

        switch (property) {
            case "price":
                if (["", "0"].includes(`${_value}`)) toggleFreePricing();
                value = _value === "" ? 0 : parseFloat(_value);
                break;

            case "discount":
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
                    id: data?.product_id as number,
                    property: "Products",
                    payload: {
                        [property]: value
                    }
                });
            } catch (error) {
                push({
                    id: "N#ERROR_UPDATING_PRODUCT",
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

    useEffect(() => { const tRef = timeoutRef.current; return () => { if (tRef) clearTimeout(tRef); } }, []);

    useEffect(() => { setFreePricing(parseInt(`${data?.price ?? '0'}`) === 0); }, [data?.price]);

    const assertions = {
        "isLoading": [
            deleting,
            isFetching,
            (appState === "loading")
        ].includes(true)
    };

    switch (true) {
        case (assertions.isLoading): {
            return <div className="w-full h-full flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </div>
        }

        default: {
            return <>
                {(data?.delisted) && <div data-appState="warning" className="rounded-md border flex flex-col justify-start items-center p-4 gap-2 w-full">
                    <div className="w-full flex flex-row justify-start items-center gap-3">
                        <Icon name="Warning" className="text-lg" />

                        <span>Este produto foi ocultado</span>
                    </div>
                </div>}

                <ScrollToSection
                    product_id={id as number}
                    thumbnail_url={data?.thumbnail as string}
                    disabled={data?.delisted || false}
                />

                <div className="w-full flex flex-row justify-between items-center gap-3">
                    <label className="flex flex-row justify-start items-center gap-2 w-full">
                        {getUpdaterStatusIndicator("name")}

                        <input className="w-full" name="name" title="Nome do produto" data-element="h1" type="text" defaultValue={data?.name} onKeyDown={handleKeyDown} onBlur={handleEvent} readOnly={data?.delisted || false} />
                    </label>

                    <label htmlFor="product_type" className="flex flex-row justify-start items-centerv gap-2 w-full ">
                        {getUpdaterStatusIndicator("product_type")}

                        <select title="Tipo de produto" id="product_type" name="product_type" data-element="h1" defaultValue={data?.product_type ?? ""} className="w-full text-right" disabled={data?.delisted || false} required>
                            <option hidden value="">Tipo do produto</option>

                            {MENU_PRODUCT_TYPES.map(t => <option key={t} value={t}>
                                {getLabel(t)}
                            </option>)}
                        </select>
                    </label>
                </div>

                {(data?.delisted)
                    ? <>
                        <Button value={id} className="w-full flex flex-row justify-start items-center" variant="success" onClick={handleRecovery} disabled={updater === "delisted"}>
                            {(updater === "delisted") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Recycle" />}

                            Recuperar
                        </Button>
                    </>

                    : <>
                        <label className="flex flex-row justify-start items-center gap-1 w-full border p-2 rounded-lg">
                            <input type="checkbox" placeholder="Aonde será servido o produto" defaultChecked={!pickRestaurant} onChange={toggleRestaurantPick} />

                            <span>Produto será servido por todos os restaurantes</span>
                        </label>

                        {pickRestaurant && <label htmlFor="restaurant_id" className="w-full flex flex-row gap-2 justify-start items-center">
                            <span data-text="tag" className="mr-auto">
                                {getUpdaterStatusIndicator("restaurant_id")}

                                <Icon name="Store" />

                                Restaurante
                            </span>

                            <RestaurantsSelect title="Restaurante" id="restaurant_id" name="restaurant_id" defaultOptionLabel="Escolha um restaurante" defaultValue={""} required />
                        </label>}

                        <label htmlFor="description" className="flex flex-row justify-start items-center gap-2 text-base">
                            {getUpdaterStatusIndicator("description")}

                            <Icon name="Notes" />

                            Sobre
                        </label>

                        <textarea title="Descrição" id="description" data-element="p" name="description" defaultValue={data?.description ?? ""} onChange={handleEvent} className="w-full" />

                        <div className="w-full flex flex-col justify-start items-start gap-2 p-2 border rounded-md">
                            <label htmlFor="prep_time_minutes" className="w-full flex flex-row justify-betw items-center gap-2 border p-2 rounded-lg">
                                {getUpdaterStatusIndicator("prep_time_minutes")}

                                <Icon name="Time" />

                                <span className="mr-auto">Tempo de preparo (em minutos)</span>

                                <input title="Tempo de preparo (em minutos)" id="prep_time_minutes" name="prep_time_minutes" defaultValue={3} min={3} onChange={handleEvent} type="number" required />
                            </label>

                            <label className="flex flex-row justify-start items-center gap-2 w-full p-2 border rounded-md">
                                {getUpdaterStatusIndicator("price")}

                                <Icon name="Money" />

                                <span className="mr-auto text-lg">Preço</span>

                                <div data-appState="warning" className="flex flex-row justify-start items-center gap-2">
                                    <Icon name="Warning" className="text-lg" />

                                    <span className="text-sm">Alteração do só afetará os produtos que não foram vendidos</span>
                                </div>

                                {(freePricing)
                                    ? <input className="text-right" name="price" title="Preço" data-element="p" type="text" value="Grátis" onClick={() => toggleFreePricing()} readOnly />
                                    : <input className="text-right" name="price" title="Preço (editável)" data-element="p" type="number" min={0} defaultValue={parseFloat(`${data?.price}`)} onKeyDown={handleKeyDown} onBlur={handleEvent} />
                                }
                            </label>

                            <label className="flex flex-row justify-start items-center gap-2 w-full p-2 border rounded-md">
                                {getUpdaterStatusIndicator("discount")}

                                <Icon name="Discount" />

                                <span className="mr-auto text-lg">Aplicar desconto</span>

                                <input className="text-right" name="discount" title="Desconto" data-element="p" type="number" min={0} defaultValue={parseFloat(`${data?.discount}`)} onKeyDown={handleKeyDown} onBlur={handleEvent} />
                            </label>
                        </div>

                        <Button className="w-full flex flex-row justify-start items-center" variant="warning" onClick={handleDeletion}>
                            <Icon name="Hide" />

                            Ocultar produto
                        </Button>

                        <hr className="w-full h-[1px]" />

                        <h1>Comentários</h1>

                        <ProductCommentsList product_id={id} mode="admin" className="w-full" trackAppUpdates />
                    </>
                }
            </>
        }
    };
};

type sectionType = "thumbnail";

const ScrollToSection = ({
    callback,
    disabled = false,
    onThumbnailUpdate,
    product_id,
    thumbnail_url: dt,
}: {
    callback?: Function;
    disabled?: boolean;
    onThumbnailUpdate?: (url: string) => void;
    product_id: number;
    thumbnail_url: string;
}) => {
    const {
        update_PARTIAL
    } = useApp();

    const [state, setState] = useState<statusType<`uploading-${"thumbnail"}`>>("idle");
    const [pickedSection, setPickedSection] = useState<`product-${sectionType}`>("product-thumbnail");
    const [thumbnail_url, setThumbnailURL] = useState(dt);

    const sections = [
        { key: `Capa`, value: "product-thumbnail", icon: <Icon name="Image" /> },
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

                default: throw new Error("Unknown upload type");
            }

            try {
                await update_PARTIAL({
                    id: product_id,
                    property: "Products",
                    payload: {
                        thumbnail: url
                    }
                });
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

    function toggleUploadState(type: "thumbnail") {
        return (e: any) => {
            switch (type) {
                case "thumbnail": setState("uploading-thumbnail"); break;

                default: throw new Error("Unknown upload type");
            }
        }
    };

    switch (state) {
        case "loading": {
            return <div className="w-full h-full flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </div>
        }

        default: {
            return <section className="HORIZONTAL_SCROLLTO_SECTION w-full">
                <header>
                    {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                        {kvp.icon}

                        {kvp.key}
                    </Button>)}
                </header>

                <div data-type="container">
                    <section id="event-thumbnail" className="gap-2">
                        <div data-type="thumbnail" style={{ height: "300px", backgroundImage: `url(${thumbnail_url})` }} className="w-full flex flex-col justify-center items-center rounded-md border">
                            {state === "uploading-thumbnail" && <Icon name="Loading" className="animate-spin" />}
                        </div>

                        {!disabled && <FileUploaderRegular
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
                </div>
            </section>
        }
    };
};
export default ProductPanel;