import {
    useEffect,
    useMemo,
    useState,
    type ComponentProps,
    type MouseEvent,
    type SubmitEvent
} from "react";

import {
    useSuspenseQuery
} from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_APP_SETTINGS,
    getOrderStatusActionLabel,
    getNextOrderStatus,
    resolveClassNames,
    type Madeirense$Types,
    type appPreferencesType,
    type restaurantOrderType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, {
    type Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";

import Button from "components/buttons";
import Icon from "components/icon";

import OrderCard from "components/cards/order";
import ProfileHeaderCard from "components/cards/profileHeader";

import OrderChatForm from "components/forms/orders/chat";
import DescriptionLabel from "components/forms/elements/labels/description";

import OrderItemsList from "components/lists/order/items";
import OrderHistoryList from "components/lists/order/history";

import LeafletDeliveryTracker from "components/maps/leaflet/deliveryTracker";
import DriversPicker from "components/pickers/drivers";

import styles from "./Order.module.css";
import xScrollSectionStyles from "styles/xScrollSection.module.css";

import type {
    $Enums,
    Users
} from "@Madeirense/database/browser";

import type {
    variantType
} from "components/types";

import "./Order.css";

// ***************************************************************************************************************

function OrderPanel({ id }: { id: number }) {
    const {
        fetch,
        get
    } = useApp();

    const [canManuallyAssignDriver, toggleManualAssignation] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const [inAction, setInAction] = useState<(
        | "assign-order"
        | "cancelling"
        | "idle"
        | "payment-confirmation"
        | "status-update"
    )>("idle");

    const {
        Base,
        Storage
    } = useMemo(() => MXP$App, []);

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

    const assertions = {
        "wasFinalized": ([
            "cancelled",
            "delivered"
        ]).includes(data?.status ?? "pending"),

        "active": ([
            "assigned",
            "confirmed",
        ] as $Enums.Orders_status[]).includes(data?.status ?? "pending"),
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
            return <section className={styles.finalized}>
                <section className={resolveClassNames(styles.order, "w-full")}>
                    <header>
                        <h4>Pedido #{data?.order_id}</h4>
                    </header>

                    {(data?.status === "cancelled") && <div data-state="warning" className="rounded-md border flex flex-row justify-start items-center p-4 gap-2 w-full">
                        <Icon name="Warning" className="text-lg" />

                        Este pedido foi cancelado
                    </div>}

                    <OrderCard order={data as restaurantOrderType} disableLink className="w-full mb-2" />

                </section>

                <section className={resolveClassNames(styles.client, "w-full")}>
                    <h4 className="w-full flex flex-row justify-start items-center gap-2">
                        <Icon name="User" />

                        Cliente
                    </h4>

                    <ProfileHeaderCard user={(data as restaurantOrderType).Users_Orders_user_idToUsers as Users} disableLink className="w-full mb-2" />

                    <h4 className="w-full flex flex-row justify-start items-center gap-2">
                        <Icon name="Food" />

                        Produtos
                    </h4>

                    <OrderItemsList items={[...(data as restaurantOrderType).Order_Items]} className="w-full flex flex-col justify-start items-start gap-2" />
                </section>

                <ScrollToSection
                    order_id={(data as restaurantOrderType).order_id}
                    disableChat
                />
            </section>
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
                    !error,
                    ["assign-order", "status-update"].includes(inAction)
                ].every(v => v),

                "showActionsSection": ([
                    "pending",
                    "confirmed",
                    "preparing",
                    "ready"
                ] as $Enums.Orders_status[]).includes(data?.status ?? "pending"),
            };

            const areActionsDisabled = [
                isFetching,
                renderAssertions.isCancelling,
                renderAssertions.isConfirmingPayment,
                renderAssertions.isUpdating
            ].includes(true);

            const $buttonVariant = ((status: $Enums.Orders_status | null | undefined): variantType => {
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

            function handleManualAssignationToggle() {
                toggleManualAssignation(c => !c);
            };

            async function PATCH(e: SubmitEvent<HTMLFormElement>) {
                e.preventDefault();

                const $form = e.target as HTMLFormElement;
                const $submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;
                const $form_data = new FormData($form);

                setError(null);

                setInAction($submitter.value as any);

                try {
                    switch ($submitter.value as (typeof inAction)) {
                        case "assign-order":
                            await orders.assignOrderToDriver(
                                id,
                                {
                                    restaurant_id: data?.restaurant_id as number,
                                    courier_id: parseInt($form_data.get("courier_id") as string)
                                }
                            );

                            await fetch("Drivers");

                            break;

                        case "cancelling":
                            if ($form_data.get("notes") === "") {
                                ($form.elements.namedItem("notes") as HTMLTextAreaElement).focus();

                                throw new Error("Notas são obrigatórias para o cancelamento do pedido");
                            }

                            await orders.cancel(id, $form_data.get("notes") as string);

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
                    }

                    await refetch();

                    setInAction("idle");
                } catch (error) {
                    setError(new Error((error as Error).message));
                }
            };

            return <>
                {(settings.auto_assign_driver && !canManuallyAssignDriver && !(assertions.active || assertions.wasFinalized)) && <div data-state="warning" className="rounded-md border flex flex-row justify-start items-center p-2 gap-2 w-full">
                    <Icon name="Warning" className="text-3xl" />

                    A funcionalidade de associação automática está habilitada, terá de aguardar pela confirmação de um estafeta para fazer a re-alocação
                </div>}

                <section className={styles.section}>
                    <section className={resolveClassNames(styles.order, "w-full")}>
                        <header>
                            <h4>Pedido #{data?.order_id}</h4>
                        </header>

                        {(data?.status === "cancelled") && <div data-state="warning" className="rounded-md border flex flex-row justify-start items-center p-4 gap-2 w-full">
                            <Icon name="Warning" className="text-lg" />

                            Este pedido foi cancelado
                        </div>}

                        <div>
                            <OrderCard
                                order={data as restaurantOrderType}
                                data-component="order-card"
                                disableLink
                            />

                            <LeafletDeliveryTracker
                                order={data as restaurantOrderType}
                            />
                        </div>
                    </section>

                    <section className={resolveClassNames(styles.client, "w-full")}>
                        {renderAssertions.showActionsSection && <section className={resolveClassNames(styles.actions, "w-full")}>
                            <header className="w-full flex flex-row justify-between items-start">
                                <h5>Acções</h5>

                                {(settings.auto_assign_driver) && <Button
                                    variant={(!canManuallyAssignDriver) ? "primary" : "secondary"}
                                    onClick={handleManualAssignationToggle}
                                >
                                    {!canManuallyAssignDriver
                                        ? "Escolher estafeta manualmente"
                                        : <>
                                            <Icon name="Close" />

                                            Cancelar
                                        </>
                                    }
                                </Button>}
                            </header>

                            {(data?.status === "ready") && <>
                                {(settings.auto_assign_driver && !canManuallyAssignDriver) && <div data-state="info" className="flex flex-row justify-between items-center p-2 w-full">
                                    <Icon name="Circle" className="animate-bounce" />

                                    <span>A aguardar pela confirmação do estafeta...</span>
                                </div>}

                                {canManuallyAssignDriver && <>
                                    <form onSubmit={PATCH}>
                                        <DriversPicker
                                            className="w-full"
                                            mode="radio"
                                            restaurant_id={restaurant?.restaurant_id}
                                            required
                                        />

                                        <Button value="assign-order" type="submit" className="w-full">
                                            <Icon name="Delivery" />

                                            Associar e marcar para entrega
                                        </Button>
                                    </form>
                                </>}
                            </>}

                            {(data?.status !== "ready") && <form onSubmit={PATCH}>
                                <DescriptionLabel
                                    alerts={(renderAssertions.hasCancellationError) ? undefined : {
                                        error: error?.message || ""
                                    }}
                                    className="w-full"
                                    description={<>Notas sobre o pedido? Algum reparo ou aviso.</>}
                                    icon="Notes"
                                    layout="column"
                                    title="Notas?"
                                    input={{
                                        element: "textarea",
                                        props: {
                                            className: "w-full",
                                            name: "notes",
                                            title: "Notas sobre o pedido",
                                            placeholder: "Notas..."
                                        }
                                    }}
                                />

                                <ul className="w-full flex flex-col justify-start items-center gap-2" {...{ ...(areActionsDisabled) ? { "data-state": "disabled" } : {} }}>
                                    {renderAssertions.allowPaymentConfirmation && <li>
                                        <Button
                                            value="payment-confirmation"
                                            variant={renderAssertions.hasPaymentConfirmationError ? "danger" : "secondary"}
                                            type="submit"
                                        >
                                            {(renderAssertions.hasPaymentConfirmationError)
                                                ? error?.message
                                                : <>
                                                    Confirmar pagamento

                                                    {renderAssertions.isConfirmingPayment && <Icon name="Loading" className="animate-spin" />}
                                                </>
                                            }
                                        </Button>
                                    </li>}

                                    <li>
                                        <Button
                                            value="status-update"
                                            variant={renderAssertions.hasUpdateError ? "danger" : $buttonVariant}
                                            type="submit"
                                        >
                                            {(renderAssertions.hasUpdateError)
                                                ? error?.message
                                                : <>
                                                    {getOrderStatusActionLabel(data?.status ?? "pending")}

                                                    {renderAssertions.isUpdating && <Icon name="Loading" className="animate-spin" />}
                                                </>
                                            }
                                        </Button>
                                    </li>

                                    <li>
                                        <Button type="submit" variant="danger" value="cancelling">
                                            Cancelar

                                            {renderAssertions.isCancelling && <Icon name="Loading" className="animate-spin" />}
                                        </Button>
                                    </li>
                                </ul>
                            </form>}
                        </section>}

                        <div>
                            <ProfileHeaderCard
                                user={(data as restaurantOrderType).Users_Orders_user_idToUsers as Users}
                                disableLink
                            />

                            <OrderItemsList
                                items={[...(data as restaurantOrderType).Order_Items]}
                            />
                        </div>

                        <ScrollToSection
                            order_id={(data as restaurantOrderType).order_id}
                        />
                    </section>
                </section >
            </>
        };
    }
};

type sectionType = (
    | "chat"
    | "history"
);

const ScrollToSection = ({
    className,
    disableChat: disable_chat = false,
    order_id
}: {
    disableChat?: boolean;
    order_id: number;
} & ComponentProps<"section">) => {
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

    return <section className={resolveClassNames(xScrollSectionStyles["x-scroll-section"], className)}>
        <header>
            {sections.map(kvp => <Button key={kvp.key} onClick={pickSection} value={kvp.value} variant={(pickedSection === kvp.value) ? "text-selected" : "text"}>
                {kvp.icon}

                {kvp.key}
            </Button>)}
        </header>

        <div data-type="container">
            <section id="order-chat">
                <OrderChatForm
                    className="w-full"
                    disabled={disable_chat}
                    {...{ order_id }}
                />
            </section>

            <section id="order-history">
                <OrderHistoryList
                    className="w-full"
                    {...{ order_id }}
                />
            </section>
        </div>
    </section>
};

export default OrderPanel;