import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type SubmitEvent,
    type MouseEvent
} from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_APP_SETTINGS,
    getOrderStatusActionLabel,
    getNextOrderStatus,
    Madeirense$Types,
    type appPreferencesType,
    type restaurantOrderType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, {
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";

import OrderCard from "components/cards/order";
import RestaurantCard from "components/cards/restaurant";
import ProfileHeaderCard from "components/cards/profileHeader";

import OrderChatForm from "components/forms/orders/chat";
import Icon from "components/icon";

import OrderItemsList from "components/lists/order/items";
import OrderHistoryList from "components/lists/order/history";

import DriversPicker from "components/pickers/drivers";
import GoogleMapDeliveryTracker from "components/maps/google/deliveryTracker";

import type {
    $Enums,
    Users
} from "@Madeirense/database/browser";

import type { variantType } from "components/types";

import "./Order.css";

// ***************************************************************************************************************

function OrderPanel({ id }: { id: number }) {
    const {
        fetch,
        get
    } = useApp();

    const [error, setError] = useState<Error | null>(null);

    const [inAction, setInAction] = useState<(
        | "assign-order"
        | "cancelling"
        | "idle"
        | "payment-confirmation"
        | "status-update"
    )>("idle");

    const { Base, Storage } = useMemo(() => MXP$App, []);

    const {
        orders,
        payments
    } = Base.Business.endpoints;

    const {
        data,
        isFetching,
        refetch,
    } = useSuspenseQuery({
        queryKey: ([
            "App$GetOrder",
            "order",
            id
        ] as Queries$Types.queryKey[]),
        queryFn: ApplicationQueries.getItem<restaurantOrderType>,
    });

    const restaurant = get("Restaurants")?.find(r => r.restaurant_id === (data)?.restaurant_id);
    const settings = get("Global_Settings") ?? DEFAULT_APP_SETTINGS;

    const getViewHeader = useCallback(() => {
        return <>
            {restaurant && <RestaurantCard className="w-full" {...{ restaurant }} />}

            <section className="w-full">
                <header className="flex flex-row justify-start items-center gap-2">
                    <Icon name="Order" />

                    <h4>Pedido #{data?.order_id}</h4>
                </header>

                {(data?.status === "cancelled") && <div data-state="warning" className="rounded-md border flex flex-row justify-start items-center p-4 gap-2 w-full">
                    <Icon name="Warning" className="text-lg" />

                    Este pedido foi cancelado
                </div>}

                <OrderCard order={data as restaurantOrderType} disableLink className="w-full mb-2" />

                <h4 className="w-full flex flex-row justify-start items-center gap-2">
                    <Icon name="User" />

                    Cliente
                </h4>

                <ProfileHeaderCard user={(data as restaurantOrderType).Users as Users} disableLink className="w-full mb-2" />

                <h4 className="w-full flex flex-row justify-start items-center gap-2">
                    <Icon name="Food" />

                    Produtos
                </h4>

                <OrderItemsList items={[...(data as restaurantOrderType).Order_Items]} className="w-full flex flex-col justify-start items-start gap-2" />
            </section>
        </>
    }, [data, restaurant]);

    const assertions = {
        "wasFinalized": ([
            "cancelled",
            "delivered"
        ]).includes(data?.status ?? "pending")
    };

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data: payload
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            if (payload?.order_id !== id) return;

            switch (true) {
                case (notificationId.includes("ORDER")):
                    await refetch();

                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [id, refetch, Storage]);

    switch (true) {
        case (assertions.wasFinalized === true): {
            return <>
                {getViewHeader()}

                <ScrollToSection
                    order_id={(data as restaurantOrderType).order_id}
                    disableChat
                />
            </>
        };

        default: {
            const renderAssertions = {
                "allowPaymentConfirmation": (
                    (["Multicaixa_Express"] as $Enums.Payments_payment_method[]).includes(data?.Payments[0].payment_method ?? "PayPal") &&
                    (["pending"] as $Enums.Payments_status[]).includes(data?.Payments[0].status ?? "failed")
                ),

                "hasCancellationError": (error && inAction === "cancelling"),
                "hasPaymentConfirmationError": (error && inAction === "payment-confirmation"),
                "hasUpdateError": (error && [
                    "assign-order",
                    "status-update"
                ].includes(inAction)),

                "isCancelling": (!error && ["cancelling"].includes(inAction)),
                "isConfirmingPayment": !error && ["payment-confirmation"].includes(inAction),
                "isReadyToBeAssigned": ["ready"].includes(data?.status ?? "pending"),
                "isUpdating": [
                    !error && ["assign-order", "status-update"].includes(inAction),
                ]
            };

            const areActionsDisabled = [
                isFetching,
                renderAssertions.isCancelling,
                renderAssertions.isConfirmingPayment,
                renderAssertions.isUpdating
            ].includes(true);

            const buttonVariant = ((status: $Enums.Orders_status | null | undefined): variantType => {
                switch (status) {
                    case "pending":
                        return "warning";

                    case "assigned":
                    case "confirmed":
                    case "ready":
                        return "primary";

                    case "delivered":
                        return "success";

                    case "cancelled":
                        return "danger";

                    default: return "secondary"
                }
            })(data?.status);

            async function PATCH(e: SubmitEvent<HTMLFormElement>) {
                e.preventDefault();

                const $form = e.target as HTMLFormElement;
                const $submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;
                const $form_data = new FormData($form);

                try {
                    setError(null);

                    setInAction($submitter.value as any);

                    switch ($submitter.value as (typeof inAction)) {
                        case "assign-order":
                            await orders.assignOrderToDriver(
                                id,
                                {
                                    restaurant_id: data?.restaurant_id as number,
                                    courier_id: parseInt($form_data.get("courier_id") as string),
                                    notes: $form_data.get("notes") as string
                                }
                            );

                            await fetch("Drivers");

                            break;

                        case "cancelling":
                            if ($form_data.get("notes") === "") {
                                ($form.elements.namedItem("notes") as HTMLTextAreaElement).focus();

                                throw new Error("Notas são obrigatórias para o cancelamento do pedido");
                            }

                            await orders.cancel(
                                id,
                                $form_data.get("notes") as string
                            );

                            break;

                        case "payment-confirmation":
                            await payments.updateStatus({
                                payment_id: data?.Payments[0].payment_id as number,
                                status: "completed"
                            });

                            break;

                        case "status-update":
                            await orders.updateStatus({
                                order_id: id,
                                status: getNextOrderStatus(data?.status ?? "pending"),
                                notes: $form_data.get("notes") as string
                            });

                            break;

                        default:
                            break;
                    }
                } catch (error) {
                    setError(new Error((error as Error).message));
                } finally {
                    await refetch();

                    setInAction("idle");
                }
            };

            return <>
                {getViewHeader()}

                {["pending", "confirmed", "preparing", "ready"].includes(data?.status ?? "pending") && <section className="w-full">
                    <header className="flex flex-row justify-start items-center gap-2">
                        <Icon name="Settings" />

                        <h4>Informação</h4>
                    </header>

                    <form onSubmit={PATCH} className="w-full flex flex-col justify-start items-center gap-1">
                        {["ready"].includes(data?.status ?? "pending") && <DriversPicker restaurant_id={restaurant?.restaurant_id} className="w-full" mode="radio" required />}

                        <label className="w-full flex flex-col justify-start items-start">
                            <div className="w-full flex flex-row justify-between items-center">
                                <span className="text-base">
                                    <Icon name="Notes" className="inline mr-2" />

                                    Notas?
                                </span>

                                {(renderAssertions.hasCancellationError) && <div data-state="error" className="text-base flex flex-row justify-start items-center gap-2 rounded-md px-2">
                                    <Icon name="Error" className="inline mr-2" />

                                    {error?.message}
                                </div>}
                            </div>

                            <textarea
                                className="w-full mt-1"
                                name="notes"
                                title="Notas sobre o pedido? Algum reparo, aviso..."
                                placeholder="Notas sobre o pedido? Algum reparo, aviso..."
                            />
                        </label>

                        {(data?.status === "ready" && settings.auto_assign_driver) && <div data-state="warning" className="rounded-md border flex flex-row justify-start items-center p-4 gap-2 w-full">
                            <Icon name="Warning" className="text-lg" />

                            A funcionalidade de associação automática está habilitada, terá de aguardar pela confirmação de um estafeta para fazer a re-alocação
                        </div>}

                        <div
                            className="w-full flex flex-row justify-start items-center gap-2"
                            {...{ ...(areActionsDisabled) ? { "data-state": "disabled" } : {} }}
                        >
                            {renderAssertions.allowPaymentConfirmation && <Button
                                type="submit"
                                variant={renderAssertions.hasPaymentConfirmationError ? "danger" : "secondary"}
                                value="payment-confirmation"
                                className="w-full"
                            >
                                {(renderAssertions.hasPaymentConfirmationError)
                                    ? error?.message
                                    : <>
                                        Confirmar pagamento

                                        {renderAssertions.isConfirmingPayment && <Icon name="Loading" className="animate-spin" />}
                                    </>}
                            </Button>}

                            <Button
                                type={settings.auto_assign_driver ? "button" : "submit"}
                                className="w-full"
                                variant={renderAssertions.hasUpdateError ? "danger" : buttonVariant}
                                value={renderAssertions.isReadyToBeAssigned ? "assign-order" : "status-update"}
                                disabled={(settings.auto_assign_driver && data?.status === "ready") ?? false}
                            >
                                {(settings.auto_assign_driver)
                                    ? "A confirmar estafeta..."
                                    : (renderAssertions.hasUpdateError)
                                        ? error?.message

                                        : <>
                                            {getOrderStatusActionLabel(data?.status ?? "pending")}

                                            {renderAssertions.isUpdating && <Icon name="Loading" className="animate-spin" />}
                                        </>
                                }
                            </Button>

                            <Button type="submit" variant="danger" value="cancelling">
                                Cancelar

                                {renderAssertions.isCancelling && <Icon name="Loading" className="animate-spin" />}
                            </Button>
                        </div>
                    </form>
                </section>}

                <section id="delivery-map" className="w-full">
                    <header className="flex flex-row justify-start items-center gap-2">
                        <Icon name="MapMarker" />

                        <h4>Mapa de entrega</h4>
                    </header>

                    {["assigned", "delivered"].includes(data?.status ?? "pending") && <ProfileHeaderCard
                        user={(data as restaurantOrderType).Users_Orders_courier_idToUsers as Users}
                        mode="admin"
                    />}

                    <GoogleMapDeliveryTracker order={data as restaurantOrderType} />
                </section>

                <ScrollToSection order_id={(data as restaurantOrderType).order_id} />
            </>
        };
    }
};

type sectionType = (
    | "chat"
    | "history"
);

const ScrollToSection = ({
    disableChat: disable_chat = false,
    order_id
}: {
    disableChat?: boolean;
    order_id: number;
}) => {
    const [pickedSection, setPickedSection] = useState<`order-${sectionType}`>("order-chat");

    const sections = [
        { key: `Chat`, value: "order-chat", icon: <Icon name="Chat" /> },
        { key: "Histórico", value: "order-history", icon: <Icon name="History" /> },
    ];

    function pickSection(e: MouseEvent<HTMLButtonElement>) {
        const { value } = (e.target as HTMLButtonElement);

        const $section = document.getElementById(value);

        if (!$section) return;

        $section.scrollIntoView({ behavior: "smooth", block: "nearest" });

        setPickedSection(value as any);
    }

    return <section className="HORIZONTAL_SCROLLTO_SECTION w-full">
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                {kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div data-type="container">
            <section id="order-chat">
                <OrderChatForm className="w-full" disabled={disable_chat} {...{ order_id }} />
            </section>

            <section id="order-history">
                <OrderHistoryList className="w-full" {...{ order_id }} />
            </section>
        </div>
    </section>
};

export default OrderPanel;