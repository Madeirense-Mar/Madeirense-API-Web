import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps
} from "react";

import {
    Link,
    useLocation
} from "react-router-dom";

import {
    DEFAULT_APP_SETTINGS,
    ORDERS_PREPARATION_STATUS,
    calculateTravel,
    formatMinutes,
    formatNumber,
    getLabel,
    getNextOrderStatus,
    getOrderStatusActionLabel,
    resolveClassNames,
    type restaurantOrderType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useOrders } from "contexts/Orders";

import Button from "components/buttons";
import Icon from "components/icon";
import Progress from "components/progressBar";
import Tag from "components/tag";

import MODAL_DRIVER_ASSIGNATION_FORM from "components/modals/forms/drivers/assignation";

import styles from "./index.module.css";

import type { 
    $Enums
} from "@Madeirense/database/browser";

import type {
    IComponentState
} from "components/interface";

import type {
    variantType,
    withVariant
} from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    mode?: "default" | "admin";
    index?: number,
    disableLink?: boolean;
    disableActions?: boolean;
    order: restaurantOrderType;
};

const OrderCard = (_props: withVariant<IPropTypes>) => {
    const {
        className,
        disableActions = false,
        disableLink = false,
        index = undefined,
        mode = "default",
        order: _o,
        variant = "primary",
        ...props
    } = _props;

    const { orders } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const { get } = useApp();

    const { fetch } = useOrders();

    const { show } = useModal();

    const location = useLocation();

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [card, updateCard] = useState<IComponentState<restaurantOrderType>>({
        data: _o,
        error: null,
        status: "idle"
    });

    const {
        data: order,
        error,
        status
    } = card;

    const {
        status: localOrderStatus
    } = order ?? {};

    const settings = useMemo(() => get("Global_Settings") ?? DEFAULT_APP_SETTINGS, [get]);

    const deliveryETA = useMemo(() => {
        if (
            (order?.status ?? "pending") !== "assigned" ||
            !order?.Users_Orders_courier_idToUsers?.Courier_Positions
        ) return 0;

        const {
            latitude: courierLatitude,
            longitude: courierLongitude,
            speed_kph
        } = order?.Users_Orders_courier_idToUsers?.Courier_Positions[0];

        const {
            timeMinutes
        } = calculateTravel(
            {
                latitude: parseFloat((order?.Delivery_Locations?.latitude ?? 0).toString()),
                longitude: parseFloat((order?.Delivery_Locations?.longitude ?? 0).toString()),
            },
            {
                latitude: parseFloat((courierLatitude ?? 0).toString()),
                longitude: parseFloat((courierLongitude ?? 0).toString()),
            },
            parseFloat((speed_kph ?? 0).toString())
        );

        return (settings.avg_ttd + timeMinutes)
    }, [order, settings.avg_ttd]);

    const orderPageLink = useMemo(() => {
        switch (true) {
            case (!order): return "";

            case (location.pathname.includes("back-office")): switch (true) {
                case (location.pathname.includes("deliveries")):
                    return `/back-office/deliveries/${order?.order_id}`;

                default: return `/back-office/requests/${order?.order_id}`;
            }

            default: return `/orders/${order?.order_id}`;
        }
    }, [location, order]);

    const preparationETA = useMemo(() => Math
        .max(...(order?.Order_Items ?? []).map(p => p?.Products.prep_time_minutes ?? 0)) +
        settings.avg_ttp,
        [order, settings.avg_ttp]
    );

    const type = useMemo(() => (order?.Order_Items ?? []).some(p => ["ticket"].includes(p?.Products.product_type as $Enums.Products_product_type)) ? "ticket" : "delivery", [order]);

    const progressBarValue = useMemo(() => {
        switch (type) {
            case "delivery": return (["cancelled", "delivered"] as $Enums.Orders_status[]).includes(localOrderStatus as $Enums.Orders_status)
                ? 100
                : ((ORDERS_PREPARATION_STATUS.indexOf(localOrderStatus as $Enums.Orders_status) + 1) * 100 / ORDERS_PREPARATION_STATUS.length);

            case "ticket": switch (localOrderStatus) {
                case "pending": return 50;
                case "delivered": return 100;

                case "cancelled":
                default: return 0;
            }

            default: return 0;
        }

    }, [localOrderStatus, type]);

    const _hasAvailableDrivers = useMemo(
        () => (get("Drivers") ?? [])
            .filter(
                d => d.Workstations[0].restaurant_id === order?.restaurant_id
            ).length > 0,
        [get, order]
    );

    const assertions = {
        "isProgressBarAnimated": (type !== "ticket") && ([
            "assigned",
            "confirmed",
            "pending",
            "preparing",
        ] as typeof localOrderStatus[]).includes(localOrderStatus),

        "isLoading": [
            status === "loading",
            (localOrderStatus === "ready" && settings.auto_assign_driver)
        ].includes(true),

        "isStatusConfirmationDisabled": [
            status === "loading",
            (localOrderStatus === "ready" && !_hasAvailableDrivers),
            (localOrderStatus === "ready" && (settings.auto_assign_driver ?? false))
        ].includes(true),

        "hasAvailableDrivers": _hasAvailableDrivers
    };

    function openAssignationModal() {
        const callback = (_order: restaurantOrderType) => {
            updateCard(c => { return { ...c, data: _order, status: "success" } });
        };

        show(<MODAL_DRIVER_ASSIGNATION_FORM
            order={order as restaurantOrderType}
            {...{ callback }}
        />, { title: `Escolher estafeta para o pedido #${order?.order_id}` });
    };

    const $tagVariant: variantType = useMemo(() => (
        ["pending"].includes(localOrderStatus as $Enums.Orders_status) ? "warning" :
            ["confirmed", "preparing", "ready", "assigned"].includes(localOrderStatus as $Enums.Orders_status) ? "primary" :
                ["delivered"].includes(localOrderStatus as $Enums.Orders_status) ? "success" :
                    ["cancelled"].includes(localOrderStatus as $Enums.Orders_status) ? "danger" : "secondary"
    ), [localOrderStatus]);

    const $paymentTagVariant: variantType = useMemo(() => (
        ["refunded"].includes(order?.Payments[0].status ?? "") ? "warning" :
            ["pending"].includes(order?.Payments[0].status ?? "") ? "primary" :
                ["completed"].includes(order?.Payments[0].status ?? "") ? "success" :
                    ["failed"].includes(order?.Payments[0].status ?? "") ? "danger" : "secondary"
    ), [order?.Payments]);

    async function updateStatus() {
        updateCard(c => { return { ...c, status: "loading" } });

        try {
            const { status = order?.status } = await orders.updateStatus({
                order_id: order?.order_id as number,
                status: getNextOrderStatus(localOrderStatus as $Enums.Orders_status)
            }) ?? {};

            await fetch();

            updateCard(c => {
                return {
                    ...c,
                    data: { ...c.data, status } as restaurantOrderType,
                    status: "success"
                }
            });
        } catch (error) {
            updateCard(c => { return { ...c, error: new Error((error as Error).message), status: "error" } });
        }
    };

    useEffect(() => {
        if (status !== "success") return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => updateCard(c => ({ ...c, status: "idle" })), 5000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [status]);

    return <div
        className={resolveClassNames(
            styles[variant],
            styles[mode === "default" ? "default" : index ? "indexed" : "default"],
            className
        )}
        {...props}
    >
        {(index && mode === "admin") && <span>
            {index}
        </span>}

        <div className="max-h-[32px] min-h-[32px] flex flex-row justify-start items-center gap-1 w-full overflow-y-hidden overflow-x-auto">
            {!disableLink && <Link to={orderPageLink} data-state={orderPageLink === "" ? "disabled" : "idle"}>
                <Icon name="Link2" />

                {`Referência do pedido #${order?.order_id}`}
            </Link>}

            {(type === "ticket") && <Tag>
                <Icon name="Party" />

                {order?.Order_Items.find(({ Products }) => Products.product_type === "ticket")?.Products.name}

                <span className="font-extrabold">
                    {`x${order?.Order_Items.find(({ Products }) => Products.product_type === "ticket")?.quantity}`}
                </span>
            </Tag>}

            <Tag data-variantType={$tagVariant}>
                {localOrderStatus === "pending" && type === "delivery" ? <Icon name="Loading" className="animate-spin" /> : null}
                {localOrderStatus === "cancelled" && <Icon name="Close" />}
                {localOrderStatus === "assigned" && <Icon name="Running" />}

                {`${getLabel(localOrderStatus as $Enums.Orders_status)}${localOrderStatus === "pending" && type === "ticket" ? " (Por confirmar)" : ""}`}
            </Tag>

            {(type === "ticket") ? null : <>
                {(["pending", "confirmed", "preparing"] as $Enums.Orders_status[]).includes(localOrderStatus as $Enums.Orders_status) && <Tag>
                    <Icon name="Time" />

                    {!preparationETA ? "Sem tempo determinado" : formatMinutes(preparationETA)}
                </Tag>}

                {(["assigned"] as $Enums.Orders_status[]).includes(localOrderStatus as $Enums.Orders_status) && <Tag>
                    <Icon name="MapMarked" />

                    {formatMinutes(deliveryETA)}
                </Tag>}
            </>}

            {(order?.status === "assigned") && <Tag>
                <Icon name="Delivery" />

                {order?.Users_Orders_courier_idToUsers?.name}
            </Tag>}

            {(mode === "admin") && ORDERS_PREPARATION_STATUS.filter(s => s !== "assigned").includes(localOrderStatus as any) && <Button
                className="ml-auto"
                onClick={localOrderStatus === "ready" ? (settings.auto_assign_driver) ? undefined : openAssignationModal : updateStatus}
                variant={!error ? "secondary" : "danger"}
                disabled={assertions.isStatusConfirmationDisabled}
            >
                {(status === "error") && <Icon name="ExclamationCircle" />}

                {(localOrderStatus === "ready") && <Icon name="Delivery" />}

                {(localOrderStatus === "ready")
                    ? (!assertions.hasAvailableDrivers)
                        ? "Sem estafetas disponíveis"
                        : (settings.auto_assign_driver)
                            ? "A confirmar estafeta..."
                            : "Escolher estafeta"
                    : getOrderStatusActionLabel(localOrderStatus as $Enums.Orders_status)
                }

                {assertions.isLoading && <Icon name="Loading" className="animate-spin" />}
            </Button>}
        </div>

        <Progress
            value={progressBarValue}
            className="w-full"
            animated={assertions.isProgressBarAnimated}
        />

        <div className="max-h-[32px] min-h-[32px] flex flex-row justify-start items-center gap-1 w-full overflow-y-hidden overflow-x-auto">
            {mode === "admin" && <Tag>
                <Icon name="User" />

                {order?.Users?.name}

                {(order?.Users?.phone !== "") && <span className="italic opacity-45">
                    {order?.Users?.phone}
                </span>}
            </Tag>}

            <Tag data-variantType={$paymentTagVariant}>
                <Icon name="CashRegister" />

                <span className="italic">
                    {getLabel(order?.Payments[0].payment_method)}
                </span>

                {parseFloat(`${order?.total_amount ?? "0"}`) === 0 ? "Grátis" : <>
                    {getLabel(order?.Payments[0].status ?? "pending")}

                    <span className={`font-bold${order?.Payments[0].status === "refunded" ? " line-through" : ""}`}>
                        {formatNumber(parseFloat(`${order?.total_amount ?? "0"}`))}
                    </span>
                </>}
            </Tag>

            <Tag className="ml-auto">
                <Icon name="Store" />

                {order?.Restaurants.name}
            </Tag>
        </div>
    </div>
};

export default OrderCard;