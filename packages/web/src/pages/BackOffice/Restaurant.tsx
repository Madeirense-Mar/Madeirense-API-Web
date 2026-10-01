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

    function openRestaurantCreationModal() {
        show(<RestaurantForm
            restaurant={defaultRestaurant}
            onSuccess={() => updatePage(p => { return { ...p, pageStatus: "idle" } })}
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
                                <th>Capa</th>
                                <th>Nome</th>
                                <th>Localização</th>
                                <th>Abertura</th>
                                <th>Fecho</th>
                            </tr>
                        </thead>

                        <tbody>
                            {get("Restaurants")?.map(r => {
                                const { closing_time, day_of_week, opening_time } = ((r.Restaurant_Hours ?? []) as Restaurant_Hours[])[new Date().getDay()];
                                const cTime = `${toTimeDecimal(new Date(closing_time).getHours())}:${toTimeDecimal(new Date(closing_time).getMinutes())}`;
                                const oTime = `${toTimeDecimal(new Date(opening_time).getHours())}:${toTimeDecimal(new Date(opening_time).getMinutes())}`;

                                return <tr className="cursor-pointer" key={r.restaurant_id} onClick={() => navigate(`${Madeirense$Enumerators.Pages.BackOffice.Restaurant}/${r.restaurant_id}`)}>
                                    {[
                                        { id: "thumbnail", data: <img className="h-[120px] w-full" src={r.thumbnail_url ?? "#"} alt={r.name} /> },
                                        { id: "name", data: r.name },
                                        { id: "location", data: r.Delivery_Locations?.address },
                                        {
                                            id: "opening", data: <>
                                                <Tag variant="secondary">{day_of_week}</Tag>

                                                {oTime}
                                            </>
                                        },
                                        {
                                            id: "closing", data: <>
                                                <Tag variant="secondary">{day_of_week}</Tag>

                                                {cTime}
                                            </>
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