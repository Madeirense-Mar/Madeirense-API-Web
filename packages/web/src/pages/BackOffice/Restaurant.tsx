import {
    useState,
    type ComponentProps,
    type MouseEvent,
} from "react";

import {
    toDayOfTheWeek,
    toTimeDecimal,
    Madeirense$Enumerators,
    type restaurantType
} from "@Madeirense/shared";

import type {
    Restaurant_Hours
} from "@Madeirense/database/browser";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import Icon from "components/icon";

import RestaurantForm from "components/forms/add/restaurant";

import RestaurantEventList from "components/lists/restaurantEvents";
import AddRestaurantEventForm from "components/modals/forms/add/restaurantEvent";

import type { IPageState } from "components/interface";
import { useNavigate } from "react-router-dom";
import Tag from "components/tags";
import DeletionForm from "components/modals/forms/delete";

// ***************************************************************************************************************

type itemType = "restaurant" | "event";

type additionType = `adding-${itemType}`;

const defaultRestaurant: restaurantType = {
    created_at: new Date(),
    updated_at: new Date(),
    location: null,
    Delivery_Locations: null,
    Restaurant_Hours: [],
    name: "Restaurante",
    restaurant_id: -1,
    thumbnail_url: null,
    ttd: 15,
    ttp: 25,
    Products: [],
    Restaurant_Events: [],
    _count: {
        Orders: 0,
        Products: 0
    },
};

function BackOfficeRestaurantPage(props: ComponentProps<"main">) {
    const navigate = useNavigate();

    const {
        get,
        state: appState,
    } = useApp();

    const { show } = useModal();

    const [page, updatePage] = useState<IPageState<undefined, additionType>>({
        data: undefined,
        error: null,
        status: "idle"
    });

    const {
        status: pageStatus
    } = page;

    const assertions = {
        "isAddingRestaurant": (pageStatus === "adding-restaurant"),
        "isAddingRestaurantEvent": (pageStatus === "adding-event"),
        "isLoading": (pageStatus === "loading")
    };

    function navigateToRestaurantPanel (event: MouseEvent<HTMLButtonElement>) {
        const { target } = event;

        navigate(`${Madeirense$Enumerators.Pages.BackOffice.Restaurant}/${(target as HTMLButtonElement).id}`);
    };

    function openRestaurantCreationModal() {
        show(<RestaurantForm
            restaurant={defaultRestaurant}
            onSuccess={() => updatePage(p => { return { ...p, pageStatus: "idle" } })}
        />, {
            title: `Registar restaurante`
        });
    };

    function openRestaurantDeletionModal(event: MouseEvent<HTMLButtonElement>) {
        const { target } = event;

        show(<DeletionForm
            itemId={parseInt((target as HTMLButtonElement).value)}
            item="restaurant"
            callback={() => updatePage(p => { return { ...p, pageStatus: "idle" } })}
        />, {
            title: `Registar restaurante`
        });
    };

    function openEventCreationModal() {
        show(<AddRestaurantEventForm />, {
            title: `Marcar evento`
        });
    };

    return <main {...props}>
        <section>
            <header className="w-full flex flex-row justify-between items-center">
                <h1>Restaurantes</h1>

                <Button onClick={openRestaurantCreationModal} variant="primary">
                    <Icon name="Plus" />
                </Button>
            </header>

            {(assertions.isLoading)
                ? <div className="w-full flex flex-row justify-center items-center gap-2 p-10">
                    <Icon name="Loading" className="animate-spin" />
                </div>

                : <div className="w-full overflow-auto">
                    <table id="staff-table" className="w-full">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Localização</th>
                                <th>Abertura</th>
                                <th>Fecho</th>
                                <th>Acções</th>
                            </tr>
                        </thead>

                        <tbody>
                            {get("Restaurants")?.map(r => {
                                const { closing_time, day_of_week, opening_time } = ((r.Restaurant_Hours ?? []) as Restaurant_Hours[])[new Date().getDay()];
                                const cTime = `${toTimeDecimal(new Date(closing_time).getHours())}:${toTimeDecimal(new Date(closing_time).getMinutes())}`;
                                const oTime = `${toTimeDecimal(new Date(opening_time).getHours())}:${toTimeDecimal(new Date(opening_time).getMinutes())}`;

                                return <tr key={r.restaurant_id}>
                                    {[
                                        { id: "name", data: r.name },
                                        { id: "location", data: r.Delivery_Locations?.address },
                                        {
                                            id: "opening", 
                                            data: <div className="w-full flex flex-row justify-center items-center gap-3">
                                                <Tag variant="secondary">{day_of_week}</Tag>

                                                {oTime}
                                            </div>
                                        },
                                        {
                                            id: "closing", 
                                            data: <div className="w-full flex flex-row justify-center items-center gap-3">
                                                <Tag variant="secondary">{day_of_week}</Tag>

                                                {cTime}
                                            </div>
                                        },
                                        {
                                            id: "actions", 
                                            data: <div className="w-full flex flex-row justify-center items-center gap-3">
                                                <Button id={`${r.restaurant_id}`} variant="warning" shape="circle" onClick={navigateToRestaurantPanel}>
                                                    <Icon name="Edit" />
                                                </Button>

                                                <Button id={`${r.restaurant_id}`} variant="danger" shape="circle" onClick={openRestaurantDeletionModal}>
                                                    <Icon name="Trash" />
                                                </Button>
                                            </div>
                                        },
                                    ].map(dataset => <td key={`${r.restaurant_id}-${dataset.id}`}>
                                        {dataset.data}
                                    </td>)}
                                </tr>
                            }
                            )}
                        </tbody>
                    </table>
                </div>
            }
        </section>

        <section>
            <header className="w-full flex flex-row justify-between items-center">
                <h1>Eventos</h1>

                <Button onClick={openEventCreationModal} variant="primary">
                    <Icon name="Plus" />
                </Button>
            </header>

            {((["adding-Restaurant_Events"] as (typeof appState)[]).includes(appState))
                ? <div className="w-full flex flex-row justify-center items-center gap-2 p-10">
                    <Icon name="Loading" className="animate-spin" />
                </div>

                : <RestaurantEventList mode="list" />
            }
        </section>
    </main>
};

export default BackOfficeRestaurantPage;