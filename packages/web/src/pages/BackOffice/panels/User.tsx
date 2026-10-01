import {
    useEffect,
    useState,
    useMemo,
    type MouseEvent
} from "react";

import { useNavigate } from "react-router-dom";

import {
    useQuery,
    useSuspenseQuery
} from "@tanstack/react-query";

import {
    Madeirense$Enumerators,
    type Madeirense$Types,
    type staffMemberType,
    type restaurantType,
    type restaurantOrderType,
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, {
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import OrderCard from "components/cards/order";
import ProfileHeaderCard from "components/cards/profileHeader";
import RestaurantCard from "components/cards/restaurant";
import GoogleMapDeliveryTracker from "components/maps/google/deliveryTracker";
import Icon from "components/icon";

import BlockUserForm from "components/modals/forms/user/block";
import DeletionForm from "components/modals/forms/delete";
import DriverReallocationForm from "components/modals/forms/drivers/reallocation";

import type {
    $Enums,
    Users
} from "@Madeirense/database/browser";

import type { variantType } from "components/types";

// ***************************************************************************************************************

type actionType = (
    | "block"
    | "unblock"
    | "realloc"
    | "req_realloc"
    | "delete"
);

function UserPanel({ id }: { id: number }) {
    const { users } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const navigate = useNavigate();

    const { get } = useApp();
    const { show } = useModal();
    const { user: currentUser } = useProfile();

    const [isUnblocking, setIsUnblocking] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const {
        data: user,
        isFetching: isFetchingUser,
        refetch
    } = useSuspenseQuery({
        queryKey: ([
            "App$GetUser",
            "staff",
            id
        ] as Queries$Types.queryKey[]),
        queryFn: ApplicationQueries.getItem<staffMemberType>,
    });

    const {
        data: ordersResponse,
        isFetching,
        refetch: refetchOrders
    } = useQuery({
        queryKey: ([
            "App$GetCourierOrders",
            "orders",
            {
                "courier_id": user?.user_id
            } as Madeirense$Types.searchQueryRecord
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ApplicationQueries.getList<restaurantOrderType>,
        enabled: (user?.Users.user_role === "Driver")
    });

    const currentDelivery = !ordersResponse ? null : (ordersResponse?.data ?? []).find(o => o.status === "assigned");

    const orders = !ordersResponse ? [] : ordersResponse?.data ?? []

    function getActionLabel(action: actionType) {
        switch (action) {
            case "block": return "Bloquear";
            case "delete": return "Eliminar";
            case "realloc": return "Realocar estafeta";
            case "unblock": return "Desbloquear";

            default: return "";
        }
    };

    const getActionVariant = (action: actionType): variantType => {
        switch (action) {
            case "block": return "warning";
            case "delete": return "danger";

            default: return "secondary";
        }
    };

    async function fireAction(e: MouseEvent<HTMLButtonElement>) {
        const { value } = e.target as HTMLButtonElement;

        switch (value as actionType) {
            case "block": show(<BlockUserForm
                user={user?.Users as Users}
                callback={refetch}
            />, {
                title: `Bloquear utilizador`
            }); break;

            case "delete": show(<DeletionForm
                item="user"
                itemId={user?.user_id as number}
                callback={() => {
                    navigate(Madeirense$Enumerators.Pages.BackOffice.Staff, { replace: true })
                }}
            />, {
                title: `Eliminar perfil de utilizador`
            }); break;

            case "realloc": show(<DriverReallocationForm
                currentDriver={user?.Users as Users}
                order={currentDelivery as restaurantOrderType}
                callback={() => {
                    refetch();
                    refetchOrders();
                }}
            />, {
                title: `Realocar estafeta`
            }); break;

            case "req_realloc": break;

            case "unblock":
                try {
                    setIsUnblocking(true);

                    await users.unblock(user?.user_id as number);

                    refetch();
                } catch (error) {
                    setError(new Error((error as Error).message))
                } finally {
                    setIsUnblocking(false);
                }

                break;

            default: break;
        };
    };

    const assertions = {
        "isLoading": [
            isFetching,
            isFetchingUser
        ].includes(true),
        "hasAvailableDrivers": useMemo(() => (get("Drivers") ?? []).length > 0, [get]),
        "userWasBlocked": ((user?.Users?.Blocked_Users ?? [])[0]?.reason ?? null) !== null
    };

    const actions: Record<$Enums.Users_user_role, actionType[]> = {
        "Admin": (assertions.userWasBlocked)
            ? ["unblock"]
            : (!currentDelivery ? ["block", "delete"] : ["realloc"]) as actionType[],
        "Customer": [],
        "Staff": (assertions.userWasBlocked)
            ? []
            : currentDelivery ? ["block"] : [],
        "Driver": [],
        "System": [],
        "Ghost": [],
    };

    useEffect(() => {
        if (assertions.hasAvailableDrivers || isFetching) return;

        const $button = document.getElementById("realloc") as HTMLButtonElement;

        if (!$button) return;

        $button.disabled = true;
    }, [
        assertions.hasAvailableDrivers,
        isFetching
    ]);

    return <>
        {(assertions.userWasBlocked) && <div data-state="warning" className="rounded-md border flex flex-col justify-start items-center p-4 gap-2 w-full">
            <div className="w-full flex flex-row justify-start items-center gap-3">
                <Icon name="Warning" className="text-lg" />

                {user?.Users.Blocked_Users[0].expires_at
                    ? <span>
                        A conta deste utilizador está bloqueada até <span className="italic underline">{new Date(user?.Users.Blocked_Users[0].expires_at).toLocaleString()}</span>
                    </span>

                    : "A conta deste utilizador foi bloqueada"
                }
            </div>

            <div className="w-full flex flex-row justify-start items-center p-3 border border-yellow-950 border-dashed">
                <span className="italic">{user?.Users.Blocked_Users[0].reason}</span>
            </div>
        </div>}

        <ProfileHeaderCard user={user?.Users as Users} className="w-full" />

        {(assertions.isLoading)
            ? <div className="w-full flex flex-col justify-center items-center p-6">
                <Icon name="Loading" className="animate-spin" />
            </div>

            : <>
                {currentUser?.user_role !== "Customer" && <div className="flex flex-row justify-start items-center w-full gap-2">
                    {actions[currentUser?.user_role as $Enums.Users_user_role].map(action => <Button
                        key={action}
                        id={action}
                        value={action}
                        className="w-full"
                        onClick={fireAction}
                        disabled={action === "unblock" && isUnblocking}
                        variant={getActionVariant(action)}
                    >
                        {(action === "unblock" && error) ? error.message : getActionLabel(action)}

                        {(action === "unblock" && isUnblocking) && <Icon name="Loading" className="animate-spin" />}
                    </Button>)}
                </div>}
            </>
        }

        <section className="w-full">
            <header>
                <h4>Posto de trabalho</h4>
            </header>

            <RestaurantCard restaurant={user?.Restaurants as restaurantType} className="w-full" />
        </section>

        {user?.Users.user_role === "Driver" && <section className="w-full">
            {(assertions.isLoading)
                ? <div className="w-full flex flex-col justify-center items-center p-6">
                    <Icon name="Loading" className="animate-spin" />
                </div>
                : <>
                    {currentDelivery && <>
                        <h5>Entrega a decorrer</h5>

                        <div className="w-full flex flex-col justify-start items-start">
                            <OrderCard order={currentDelivery} className="w-full" />

                            <GoogleMapDeliveryTracker order={currentDelivery} />
                        </div>
                    </>}

                    {Boolean(orders.length) && <>
                        <h5>Histórico de entregas</h5>

                        <div data-grid="OrderCard" className="w-full">
                            {orders
                                .filter(o => o.order_id !== (currentDelivery?.order_id ?? -1))
                                .map(o => <OrderCard key={o.order_id} order={o} disableLink />)
                            }
                        </div>
                    </>}
                </>}
        </section>}
    </>
};

export default UserPanel;