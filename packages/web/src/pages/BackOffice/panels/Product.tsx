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
    MENU_PRODUCT_COMPOSITIONS,
    MENU_PRODUCT_TYPES,
    formatUUID_UC_CDN_URL,
    getLabel,
    locales,
    resolveClassNames,
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
import Icon from "components/icon";
import Tag from "components/tags";

import ProductCommentsList from "components/lists/productComments";

import DescriptionLabel from "components/forms/elements/labels/description";
import RestaurantsSelect from "components/forms/elements/selects/restaurants";

import DeletionForm from "components/modals/forms/delete";

import env from "env";

import xScrollSectionStyles from "styles/xScrollSection.module.css";

import type {
    Products
} from "@Madeirense/database/browser";

import type {
    statusType
} from "components/types";

import "./Product.css";

// ***************************************************************************************************************

// #region CONSTANTS
const DELAY_MS = 2500;
const UPLOAD_CARE_PUBLIC_KEY = env.UPLOAD_CARE_PUBLIC_KEY;
// #endregion

defineLocale('pt', async () => {
    return locales.get("pt")?.uploadCare ?? {} as any;
});

function ProductPanel({ id }: { id: number }) {
    const { products } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const updaterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const updateStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const [updateStatus, setUpdateStatus] = useState<"idle" | "success" | "error">("idle");
    const [deleting, setDeleting] = useState(false);
    const [freePricing, setFreePricing] = useState<boolean>(false);
    const [pickRestaurant, setPickRestaurant] = useState<boolean>(false);

    const {
        data: fetchedData,
        isFetching
    } = useQuery({
        queryKey: ([
            "App$GetProduct$BackofficePanel",
            "product",
            id
        ] as Queries$Types.queryKey[]),
        queryFn: ApplicationQueries.getItem<productType>,
        enabled: (appState === "idle") && (cachedData === null)
    });

    const data = which(cachedData, fetchedData) as productType;

    function getUpdaterStatusIndicator(...properties: (keyof Products)[]) {
        if (properties.length === 0)
            return null;

        if (properties.includes(updater as keyof Products))
            switch (updateStatus) {
                case "error": return <Icon name="Close" />;
                case "success": return <Icon name="Check" />;

                default: return <Icon name="Loading" className="animate-spin" />;
            };

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

    function update(element: any, delay = DELAY_MS) {
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

        if (updaterTimeoutRef.current) clearTimeout(updaterTimeoutRef.current);
        if (updateStatusTimeoutRef.current) clearTimeout(updateStatusTimeoutRef.current);

        updaterTimeoutRef.current = setTimeout(async () => {
            try {
                setUpdater(property);

                await update_PARTIAL({
                    id: data?.product_id as number,
                    property: "Products",
                    payload: {
                        [property]: value
                    }
                });

                setUpdateStatus("success");
            } catch (error) {
                setUpdateStatus("error");

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
                updateStatusTimeoutRef.current = setTimeout(() => setUpdater(""), delay * 2);
            }
        }, delay);
    };

    useEffect(() => {
        const tRef = updaterTimeoutRef.current;
        const uRef = updateStatusTimeoutRef.current;

        return () => {
            if (tRef) clearTimeout(tRef);
            if (uRef) clearTimeout(uRef);
        }
    }, []);

    useEffect(() => {
        if (updater !== "") return;

        setUpdateStatus("idle");
    }, [updater]);

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
                {(data?.delisted) && <Tag variant="warning" className="w-full">
                    <Icon name="Warning" />

                    <span>Este produto foi ocultado</span>
                </Tag>}

                <h1>
                    Sobre o producto
                </h1>

                <ScrollToSection
                    product_id={id as number}
                    thumbnail_url={data?.thumbnail as string}
                    disabled={data?.delisted || false}
                />

                <fieldset>
                    <legend>
                        <Tag variant="secondary">
                            <Icon name="BookOpenText" />

                            Descrição
                        </Tag>

                        <span className="font-normal italic">Definir a apresentação do producto para clientes</span>
                    </legend>

                    <DescriptionLabel
                        title="Nome"
                        description={<span className="font-normal opacity-60">Nome apresentado para os clientes na lista de productos do menu, nas facturas/recibos, registos de históricos, pedidos e notificações.</span>}
                        input={{
                            icon: getUpdaterStatusIndicator("name"),
                            element: "input",
                            props: {
                                className: "w-full",
                                name: "name",
                                title: "Nome do produto",
                                type: "text",
                                readOnly: data?.delisted || false,
                                defaultValue: data?.name,
                                onKeyDown: handleKeyDown,
                                onBlur: handleEvent
                            }
                        }}
                    />

                    <DescriptionLabel
                        title="Categoria"
                        description={<span className="font-normal opacity-60">Serve para o filtro da lista de productos, agrupa pela categoria de refeição.</span>}
                        input={{
                            icon: getUpdaterStatusIndicator("product_type"),
                            element: "select",
                            options: [
                                {
                                    key: "Tipo do produto",
                                    value: {
                                        data: "",
                                        props: {
                                            hidden: true
                                        }
                                    }
                                },
                                ...MENU_PRODUCT_TYPES.map(t => ({
                                    key: getLabel(t),
                                    value: {
                                        data: t
                                    }
                                }))
                            ],
                            props: {
                                title: "Tipo de produto",
                                id: "product_type",
                                name: "product_type",
                                defaultValue: data?.product_type as string,
                                disabled: data?.delisted || false,
                                required: true,
                                onChange: handleEvent
                            }
                        }}
                    />

                    <DescriptionLabel
                        title="Composição"
                        description={<span className="font-normal opacity-60">Serve para o filtro da lista de productos e muda o tipo de cor como é apresentado.</span>}
                        input={{
                            icon: getUpdaterStatusIndicator("product_composition"),
                            element: "select",
                            options: [
                                {
                                    key: "Composição do producto",
                                    value: {
                                        data: "",
                                        props: {
                                            hidden: true
                                        }
                                    }
                                },
                                ...MENU_PRODUCT_COMPOSITIONS.map(t => ({
                                    key: getLabel(t),
                                    value: {
                                        data: t
                                    }
                                }))
                            ],
                            props: {
                                title: "Tipo de produto",
                                id: "product_composition",
                                name: "product_composition",
                                defaultValue: data?.product_composition as string,
                                disabled: data?.delisted || false,
                                required: true,
                                onChange: handleEvent
                            }
                        }}
                    />

                    <DescriptionLabel
                        title="Descrição"
                        layout="column"
                        description={<span className="font-normal opacity-60">Qual é a história do producto? Melhores aspectos ou características?</span>}
                        input={{
                            icon: getUpdaterStatusIndicator("description"),
                            element: "textarea",
                            props: {
                                className: "w-full",
                                name: "name",
                                id: "description",
                                title: "Descrição",
                                defaultValue: data?.description || "",
                                readOnly: data?.delisted || false,
                                onChange: handleEvent
                            }
                        }}
                    />
                </fieldset >

                {(data?.delisted)
                    ? <>
                        <Button value={id} className="w-full flex flex-row justify-start items-center" variant="success" onClick={handleRecovery} disabled={updater === "delisted"}>
                            {(updater === "delisted") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Recycle" />}

                            Recuperar
                        </Button>
                    </>

                    : <>
                        <hr />

                        <fieldset>
                            <legend>
                                <Tag variant="secondary">
                                    <Icon name="PriceTags" />

                                    Preço
                                </Tag>

                                <span className="font-normal italic">Definir preços e/ou descontos</span>
                            </legend>


                            <DescriptionLabel
                                title="Preço"
                                description={<span className="font-normal opacity-60">Preço do producto que estará registado.</span>}
                                alerts={{ warning: "Alteração do só afetará os produtos que não foram vendidos" }}
                                input={{
                                    icon: getUpdaterStatusIndicator("price"),
                                    element: "input",
                                    props: {
                                        className: "text-right",
                                        name: "price",
                                        ...((freePricing)
                                            ? {
                                                type: "text",
                                                value: "Grátis",
                                                readOnly: true,
                                                onClick: () => toggleFreePricing()
                                            }
                                            : {
                                                type: "number",
                                                min: 1,
                                                defaultValue: parseFloat(`${data?.price}`),
                                                onBlur: handleEvent,
                                                onKeyDown: handleKeyDown
                                            }
                                        )
                                    }
                                }}
                            />

                            <DescriptionLabel
                                title="Desconto"
                                description={<span className="font-normal opacity-60">Percentagem de desconto aplicada para o producto, ficará visível no menu.</span>}
                                input={{
                                    icon: getUpdaterStatusIndicator("discount"),
                                    element: "input",
                                    props: {
                                        className: "text-right",
                                        name: "discount",
                                        title: "Desconto",
                                        type: "number",
                                        defaultValue: parseFloat(`${data?.discount}`),
                                        onBlur: handleEvent,
                                        onKeyDown: handleKeyDown
                                    }
                                }}
                            />
                        </fieldset>

                        <hr />

                        <fieldset>
                            <legend>
                                <Tag variant="secondary">
                                    <Icon name="Restaurant" />

                                    Disponibilidade
                                </Tag>

                                <span className="font-normal italic">Definir a apresentação do producto para clientes</span>
                            </legend>

                            <DescriptionLabel
                                className="p-3"
                                selectable
                                title="Acesso"
                                description={<span className="font-normal opacity-60">Produto será servido por todos os restaurantes?</span>}
                                input={{
                                    element: "input",
                                    props: {
                                        type: "checkbox",
                                        placeholder: "Aonde será servido o produto",
                                        defaultChecked: !pickRestaurant,
                                        onChange: toggleRestaurantPick
                                    }
                                }}
                            />

                            {pickRestaurant && <label className="w-full flex flex-row justify-between items-center gap-5">
                                <div className="flex flex-col justify-start items-start gap-2">
                                    <span className="text-xl">Estabelecimento</span>

                                    <span className="font-normal opacity-60">
                                        Aonde será servido?
                                    </span>
                                </div>

                                <div className="flex flex-col justify-center items-center gap-1 min-w-[200px] max-w-[200px] w-[200px]">
                                    {getUpdaterStatusIndicator("restaurant_id")}

                                    <RestaurantsSelect title="Restaurante" id="restaurant_id" name="restaurant_id" defaultOptionLabel="Escolha um restaurante" defaultValue={""} required onChange={handleEvent} />
                                </div>
                            </label>}
                        </fieldset>

                        <hr />

                        <fieldset>
                            <legend>
                                <Tag variant="secondary">
                                    <Icon name="Clock" />

                                    Tempo
                                </Tag>

                                <span className="font-normal italic">Definir a apresentação do producto para clientes</span>
                            </legend>

                            <DescriptionLabel
                                title="Tempo de preparo (em minutos)"
                                description={<span className="font-normal opacity-60">Representa o tempo de preparo adicionado à estimativa de espera partilhada com o cliente</span>}
                                input={{
                                    icon: getUpdaterStatusIndicator("prep_time_minutes"),
                                    element: "input",
                                    props: {
                                        id: "prep_time_minutes",
                                        name: "prep_time_minutes",
                                        title: "Tempo de preparo (em minutos)",
                                        type: "number",
                                        defaultValue: 3,
                                        min: 3,
                                        required: true,
                                        onKeyDown: handleKeyDown,
                                        onBlur: handleEvent
                                    }
                                }}
                            />
                        </fieldset>

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
            return <section id="product-thumbnail" className={resolveClassNames(xScrollSectionStyles["x-scroll-section"], "w-full")}>
                <header>
                    {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                        {kvp.icon}

                        {kvp.key}
                    </Button>)}
                </header>

                <div data-type="container">
                    <section className="flex flex-col justify-start items-start gap-2 w-full">
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