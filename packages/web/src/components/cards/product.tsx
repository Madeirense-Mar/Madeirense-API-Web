import {
    useState,
    type ComponentProps,
    type MouseEvent
} from "react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import {
    APP_TTL_DEFAULT,
    formatNumber,
    getLabel,
    locales,
    Madeirense$Enumerators,
    resolveClassNames
} from "@Madeirense/shared";

import Button from "components/buttons";
import Icon from "components/icon";
import Tag from "components/tag";

import { useApp } from "contexts/App";
import { useCart } from "contexts/Cart";
import { useNotifications } from "contexts/Notifications";
import { useProfile } from "contexts/Profile";

import styles from './product.module.css';

import type {
    Products
} from "@Madeirense/database/browser";

import type { variantType, withVariant } from "components/types";

// ***************************************************************************************************************

interface IProductCardProps extends withVariant<ComponentProps<"div">> {
    disableLink?: boolean;
    disableActions?: boolean;
    mode?: "default" | "admin";
    product: Products;
};

function ProductCard(_props: IProductCardProps) {
    const {
        className,
        disableActions = false,
        disableLink = false,
        mode = "default",
        product,
        variant = "primary",
        ...props
    } = _props;

    const {
        LoginToOrder
    } = locales.get("pt")?.strings ?? {};

    const navigate = useNavigate();
    const location = useLocation();

    const {
        state: appState,
        get
    } = useApp();

    const {
        add,
        remove,
        cart
    } = useCart();

    const { deliveryCart } = cart;

    const { push } = useNotifications();

    const {
        user,
        favorite,
        unfavorite
    } = useProfile();

    const [state, setState] = useState<"adding" | "removing" | "favoriting" | "idle">("idle");

    const quantity = deliveryCart.find(p => p.product_id === product.product_id)?.quantity;

    const {
        delisted = false,
        discount: _d,
        name,
        price: _p,
        thumbnail,
        product_id,
        product_composition,
        product_type,
        restaurant_id
    } = product;

    const discount = parseFloat(_d.toString());
    const price = parseFloat(_p.toString());
    const discountedPrice = !discount ? 0 : price - (price * discount) / 100;
    const restaurant = get("Restaurants")?.find(r => r.restaurant_id === restaurant_id);

    const assertions = {
        "isAddingToCartDisabled": [
            "adding",
            "removing",
            "favoriting",
        ].includes(state),

        "isProductCarted": deliveryCart.some(p => p.product_id === product.product_id),
        "isProductAvailableToBeCarted": user && !deliveryCart.find(p => p.product_id === product.product_id),

        "isSaved": user?.Favorites?.find(({ product_id: pId }) => pId === product_id) !== undefined,

        "isWorking": [
            "adding",
            "removing"
        ].includes(state),

        "hasNotifications": [delisted].some(Boolean)
    };

    const $additionButtonVariant = ((composition: typeof product_composition): variantType => {
        switch (composition) {
            case "meat": return "danger";
            case "wheat": return "success";
            case "vegan": return "warning";

            default: return "primary";
        }
    })(product_composition);

    const $tagVariant = ((composition: typeof product_composition): variantType => {
        switch (composition) {
            case "meat": return "danger";
            case "wheat": return "success";
            case "vegan": return "warning";

            default: return "primary";
        }
    })(product_composition);

    async function addToCart() {
        setState("adding");

        await add(product.product_id);

        setState("idle");
    };

    async function removeFromCart() {
        setState("removing");

        await remove(product.product_id);

        setState("idle");
    };

    function handleNavigation() {
        navigate(location.pathname.includes("back-office")
            ? `${Madeirense$Enumerators.Pages.BackOffice.Products}/${product.product_id}` :
            `${Madeirense$Enumerators.Pages.App.Product}/${product.product_id}`
        );
    };

    async function toggleProductFavoriting({ target }: MouseEvent<HTMLButtonElement>) {
        try {
            setState("favoriting");

            switch ((target as HTMLButtonElement).value as ("save" | "remove")) {
                case "remove": await unfavorite(product_id); break;

                case "save": await favorite(product_id); break;

                default: break;
            }

            push({
                id: "N#SAVED_PRODUCT",
                alert: "Produto está na tua lista de favoritos",
                type: "alert",
                options: {
                    variant: "success",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } catch (error) {
            push({
                id: "N#UNABLE_TO_SAVE_PRODUCT",
                alert: (error as Error).message,
                type: "alert",
                options: {
                    variant: "danger",
                    ttl: APP_TTL_DEFAULT
                }
            });
        } finally {
            setState("idle");
        }
    }

    return <div className={resolveClassNames(
        styles[variant],
        !product_composition ? null : styles[product_composition],
        className
    )} {...props}>
        <div
            className={resolveClassNames(
                disableLink ? undefined : "cursor-pointer",
                "flex flex-row justify-end items-start gap-2",
                "p-2"
            )}
            onClick={(disableLink || (state === "favoriting")) ? undefined : handleNavigation}
            style={{ backgroundImage: `url(${thumbnail})` }}
            data-section="thumbnail"
        >
            {(!disableActions && (user !== undefined)) && <div className="mr-auto">
                <Button
                    size="s"
                    value={assertions.isSaved ? "remove" : "save"}
                    onClick={(state === "favoriting") ? undefined : toggleProductFavoriting}
                    shape="circle"
                    disabled={(state === "favoriting")}
                >
                    {((state === "favoriting"))
                        ? <Icon name="Loading" className="animate-spin" />
                        : (assertions.isSaved)
                            ? <Icon name="HeartFilled" className="pointer-events-none" />
                            : <Icon name="HeartEmpty" className="pointer-events-none" />
                    }
                </Button>
            </div>}

            <div data-section="notification">
                {(discount > 0) && <Tag variant={$tagVariant}>
                    <Icon name="Discount" />

                    {`${discount}%`}
                </Tag>}

                {(appState === "syncing-Products") && <Tag variant={$tagVariant}>
                    <Icon name="Loading" className="animate-spin" />
                </Tag>}

                {assertions.hasNotifications && delisted && <Tag data-placing="notification" variant="warning">
                    <Icon name="ExclamationCircle" />

                    Ocultado
                </Tag>}
            </div>
        </div>

        <div data-section="tags">
            {["updating", "fetching"].some(s => appState.includes(s)) && <Tag variant={$tagVariant}>
                <Icon name="Loading" className="animate-spin" />
            </Tag>}

            <Tag variant={$tagVariant}>
                {product_type === "starter" && <Icon name="Circle" />}
                {product_type === "garnish" && <Icon name="BowlRice" />}
                {product_type === "beverage" && <Icon name="Drink" />}
                {product_type === "dessert" && <Icon name="Dessert" />}
                {product_type === "main" && <Icon name="Food" />}

                {getLabel(product_type)}
            </Tag>

            <Tag variant={$tagVariant}>
                {product_composition === "alcoholic" && <Icon name="SolidDrink" />}
                {product_composition === "non_alcoholic" && <Icon name="NoDrinks" />}
                {product_composition === "fish" && <Icon name="FishSharp" />}
                {product_composition === "meat" && <Icon name="Meat" />}
                {product_composition === "merchandise" && <Icon name="Product" />}
                {product_composition === "mixed" && <Icon name="Salad" />}
                {product_composition === "vegan" && <Icon name="Vegan" />}
                {product_composition === "wheat" && <Icon name="Wheat" />}

                {getLabel(product_composition)}
            </Tag>
        </div>

        {restaurant && <div data-section="tags">
            <Tag>
                <Icon name="Restaurant" />

                {restaurant.name}
            </Tag>

        </div>}

        <div data-section="description" className="w-full flex flex-col justify-start items-start gap-4">
            <p data-text="name" className="font-bold">{name}</p>

            <div className="w-full flex flex-row items-center">
                {(discount > 0)
                    ? <div className="flex flex-col justify-center items-start mr-auto">
                        <span data-text="price" className="font-bold text-sm line-through">{formatNumber(price)}</span>
                        <span data-text="price" className="font-bold text-2xl">{!discountedPrice ? "Grátis" : formatNumber(discountedPrice)}</span>
                    </div>

                    : <span data-text="price" className="font-bold text-2xl mr-auto">{!price ? "Grátis" : formatNumber(price)}</span>
                }

                {!disableActions && <>
                    {(assertions.isProductAvailableToBeCarted) && <Button variant={$additionButtonVariant} onClick={addToCart} className="w-full max-w-[500px]" disabled={assertions.isAddingToCartDisabled}>
                        {(state === "adding")
                            ? <Icon name="Loading" className="animate-spin" />

                            : <>
                                <Icon name="Add" />

                                Adicionar
                            </>}
                    </Button>}

                    {assertions.isProductCarted && <div data-state={(state === "favoriting") ? "disabled" : "idle"} className="flex flex-row justify-center items-center w-full gap-2 max-w-[500px]">
                        <Button variant="secondary" data-shape="round" onClick={removeFromCart} disabled={assertions.isWorking}>
                            {(state === "removing") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Minus" />}
                        </Button>

                        <span data-text="quantity">
                            {quantity}
                        </span>

                        <Button onClick={addToCart} variant="secondary" data-shape="round" disabled={assertions.isWorking}>
                            {(state === "adding") ? <Icon name="Loading" className="animate-spin" /> : <Icon name="Plus" />}
                        </Button>
                    </div>}
                </>}
            </div>
        </div>

        {!user && <span className="mt-auto italic opacity-30">{LoginToOrder}</span>}
    </div>;
};

export default ProductCard;