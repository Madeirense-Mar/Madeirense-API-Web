import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEvent,
    type MouseEvent
} from "react";

import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    DEFAULT_API_LIST_LIMIT,
    USER_ROLES,
    getLabel,
    Madeirense$Types,
    type appPreferencesType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import ApplicationQueries, { 
    Queries$Types
} from "configurations/queries";

import { useApp } from "contexts/App";
import { useModal } from "contexts/Modal";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";
import Tag from "components/tags";

import AddUserForm from "components/modals/forms/user/add";

import type {
    Blocked_Users,
    Users,
    Workstations
} from "@Madeirense/database/browser";

import type {
    IPageState
} from "components/interface";

import "./Staff.css";

// ***************************************************************************************************************

type filterType = {
    state?: userStateType
};

type stateType = {
    filter?: filterType
    params?: Madeirense$Types.searchQueryRecord
};

type userStateType = "active" | "blocked";

function BackOfficeStaffPage(props: ComponentProps<"main">) {
    const colSpan = 8;

    const navigate = useNavigate();

    const { show } = useModal();
    const { get } = useApp();

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { Storage } = useMemo(() => MXP$App, []);

    const [page, updatePage] = useState<IPageState<stateType>>({
        data: null,
        error: null,
        status: "idle"
    });

    const {
        data: response,
        isFetching,
        refetch
    } = useQuery({
        queryKey: ([
            "App$GetAllStaff",
            "staff",
            page.data?.params
        ] as Queries$Types.itemQueryKey[]),
        queryFn: ({ queryKey }) => ApplicationQueries.getList({ queryKey }),
    });

    const data = (response?.data ?? []) as (Workstations & { Users: Users & { Blocked_Users: Blocked_Users[] } })[];

    const {
        pagination
    } = response ?? {};

    function applySearch(e: KeyboardEvent<HTMLInputElement>) {
        const { key } = e;

        if (key.toLowerCase() !== "enter") return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        updateSearchParams(e);
    };

    function gotoPage(e: MouseEvent<HTMLButtonElement>) {
        const $element = e.target as HTMLButtonElement;
        let page = "1";

        switch ($element.value as "prev" | "next") {
            case "next":
                page = ((pagination?.page ?? 0) + 1).toString();

                updatePage(p => {
                    return {
                        ...p, data: { ...p.data, params: { ...p.data?.params, page } }
                    }
                }); break;

            case "prev":
                page = ((pagination?.page ?? 0) - 1).toString();

                updatePage(p => {
                    return {
                        ...p, data: { ...p.data, params: { ...p.data?.params, page } }
                    }
                }); break;

            default: break;
        };

        const $input = document.querySelector(`input[name="page"]`) as HTMLInputElement;

        if (!$input) return;

        $input.value = page;
    };

    function handleChange$Debounced(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => updateSearchParams(e), (e.target.value === "") ? 0 : 3000);
    };

    function openUserCreationModal() {
        show(<AddUserForm callback={refetch} />, { title: `Criar utilizador` });
    };

    function updateFilterParams(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const $element = e.target as (HTMLInputElement | HTMLSelectElement);
        const name = $element.name;

        let filter: filterType | undefined = {
            ...(page.data?.filter ?? {}),
            [`${name}`]: $element.value === "" ? undefined : $element.value as any
        };

        if ($element.value === "") delete filter[`${name as keyof filterType}`];
        if (Object.keys(filter ?? {}).length === 0) filter = undefined;

        updatePage(p => { return { ...p, data: { ...p.data, filter } } });
    };

    function updateSearchParams(e: KeyboardEvent<HTMLInputElement> | ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const $element = e.target as (HTMLInputElement | HTMLSelectElement);
        const name = $element.name;

        let params: Madeirense$Types.searchQueryRecord | undefined = {
            ...page.data?.params,
            [`${name}`]: $element.value === "" ? undefined : $element.value
        };

        if ($element.value === "") delete params[`${name as keyof Madeirense$Types.searchQueryRecord}`];
        if (Object.keys(params ?? {}).length === 0) params = undefined;

        updatePage(p => { return { ...p, data: { ...p.data, params } } });

        PERSIST(name, $element.value);
    };

    function GET_USER_STATE(blockers: Blocked_Users[]): userStateType {
        const quantity = blockers.length;

        switch (quantity) {
            case 0: return "active";

            default: return "blocked";
        }
    };

    function GET_STATE_LABEL(state: userStateType): string {
        switch (state) {
            case "active": return "Ativo";
            case "blocked": return "Bloqueado";

            default: return "";
        }
    };

    function PERSIST(data: string, value: any) {
        switch (data) {
            case "limit":
                if (value === "") Storage.removeItem("L_APP$BACKOFFICE_STAFF_LIST_LIMIT");
                
                else Storage.setItem("L_APP$BACKOFFICE_STAFF_LIST_LIMIT", parseInt(value));

                break;

            default: break;
        }
    };

    useEffect(() => {
        async function loadStorage() {
            const $input_limit = document.querySelector(`input[name="limit"]`) as HTMLInputElement | null;

            try {
                if ([
                    $input_limit
                ].includes(null)) return;

                const L$limit = await Storage.getItem<number>("L_APP$BACKOFFICE_STAFF_LIST_LIMIT");

                const params = {
                    ...L$limit && (() => { ($input_limit as HTMLInputElement).value = `${L$limit}`; return { "limit": `${L$limit}` } })()
                };

                updatePage(p => {
                    return {
                        ...p,
                        data: {
                            ...(p.data ?? {}),
                            ...Object.keys(params).length === 0 ? {} : { params }
                        }
                    }
                })
            } catch (error) { }
        }

        loadStorage();
    }, [Storage]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            if (!notificationId.includes("BACK_OFFICE")) return;

            switch (notificationId) {
                case "MXP$BACK_OFFICE$Staff$DELETE":
                case "MXP$BACK_OFFICE$Staff$INSERT":
                case "MXP$BACK_OFFICE$Staff$FETCH":
                case "MXP$BACK_OFFICE$Staff$UPDATE":
                    refetch(); break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [refetch, Storage]);

    return <main {...props}>
        <section className="w-full flex flex-col justify-start items-start gap-3">
            <header className="w-full flex flex-row justify-between items-center">
                <h1>Utilizadores</h1>

                <Button variant="secondary" onClick={openUserCreationModal}>
                    <Icon name="Plus" />
                </Button>
            </header>

            <div className="w-full flex flex-row justify-start items-center gap-4 filter">
                <input name="limit" defaultValue={pagination?.limit ?? DEFAULT_API_LIST_LIMIT} placeholder="Nº de registos" title="Nº de registos" type="number" min={1} className="mr-auto" onChange={handleChange$Debounced} />

                <div className="flex flex-row justify-start items-center gap-1">
                    <Icon name="Search" />

                    <input name="search" placeholder="Pesquisar pelo nome, e-mail ou telemóvel..." title="Pesquisar pelo nome, e-mail ou telemóvel..." type="text" onKeyDown={applySearch} onChange={handleChange$Debounced} />
                </div>

                <div className="flex flex-row justify-start items-center gap-1">
                    <Icon name="Filter" />

                    <select name="user_role" title="Tipo de utilizador" onChange={updateSearchParams}>
                        <option value="">Todos</option>

                        {USER_ROLES.map(ur => <option key={ur} value={ur}>
                            {getLabel(ur)}
                        </option>)}
                    </select>

                    <select name="state" title="Estado do utilizador" onChange={updateFilterParams}>
                        <option value="">Todos</option>
                        <option value="active">Ativos</option>
                        <option value="blocked">Bloqueados</option>
                    </select>
                </div>
            </div>

            <div className="w-full overflow-auto">
                <table id="staff-table" className="w-full">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Telemóvel</th>
                            <th>Tipo</th>
                            <th>Restaurante</th>
                            <th>Data de criação</th>
                            <th>Estado</th>
                        </tr>
                    </thead>

                    <tbody>
                        {(isFetching)
                            ? <tr>
                                <td colSpan={colSpan} data-loadingrow>
                                    <div className="w-full flex flex-row justify-center items-center">
                                        <Icon name="Loading" className="animate-spin" />
                                    </div>
                                </td>
                            </tr>

                            : (data.length === 0) && <tr>
                                <td colSpan={colSpan} data-singlerow>
                                    <div className="w-full flex flex-row justify-center items-center">
                                        Não existem utilizadores registados
                                    </div>
                                </td>
                            </tr>
                        }

                        {(data)
                            .filter(w => {
                                if (!page.data?.filter) return true;

                                let MATCHES_STATE = true;

                                if (page.data.filter?.state) MATCHES_STATE = page.data.filter?.state === GET_USER_STATE(w.Users.Blocked_Users);

                                return MATCHES_STATE;
                            })
                            .map(w => <tr key={w.workstation_id} onClick={() => navigate(`/back-office/staff/${w.Users.user_id}`)}>
                                {[
                                    { id: "#", data: w.workstation_id },
                                    {
                                        id: "name", data: <div className="flex flex-row justify-start items-center gap-2">
                                            <ProfilePictureButton src={w.Users.profile_photo ?? "#"} size="xs" />

                                            {w.Users.name}
                                        </div>
                                    },
                                    { id: "email", data: w.Users.email },
                                    { id: "phone", data: w.Users.phone },
                                    {
                                        id: "role", data: <Tag>
                                            {(w.Users.user_role === "Admin") && <Icon name="UserAdmin" />}
                                            {(w.Users.user_role === "Staff") && <Icon name="UserStaff" />}
                                            {(w.Users.user_role === "Driver") && <Icon name="Delivery" />}

                                            {getLabel(w.Users.user_role)}
                                        </Tag>
                                    },
                                    { id: "restaurant", data: get("Restaurants")?.find(({ restaurant_id }) => w.restaurant_id === restaurant_id)?.name },
                                    { id: "creatd_date", data: new Date(w.created_at as Date).toLocaleString() },
                                    {
                                        id: "state", data: <Tag>
                                            {(GET_USER_STATE(w.Users.Blocked_Users) === "active") && <Icon name="Check" />}
                                            {(GET_USER_STATE(w.Users.Blocked_Users) === "blocked") && <Icon name="Lock" />}

                                            {GET_STATE_LABEL(GET_USER_STATE(w.Users.Blocked_Users))}
                                        </Tag>
                                    }
                                ].map(dataset => <td key={`${w.workstation_id}-${dataset.id}`}>
                                    {dataset.data}
                                </td>)}
                            </tr>)
                        }
                    </tbody>
                </table>
            </div>

            <div className="w-full flex flex-row justify-center items-center filter gap-2">
                <Button className="mr-auto" onClick={gotoPage} value="prev" title="Página anterior" variant="secondary" disabled={!pagination ? true : !pagination.hasPrevious}>
                    <Icon name="ArrowLeft" />
                </Button>

                <input className="text-center" name="page" onChange={handleChange$Debounced} type="number" defaultValue={pagination?.page ?? 1} min={1} max={pagination?.totalPages ?? 1} placeholder="Nº da página" />

                <span>
                    de {pagination?.totalPages ?? 1}
                </span>

                <Button className="ml-auto w-24" onClick={gotoPage} title="Próxima página" value="next" variant="secondary" disabled={!pagination ? true : !pagination.hasNext}>
                    <Icon name="ArrowRight" className="ml-auto" />
                </Button>
            </div>
        </section>
    </main>;
};

export default BackOfficeStaffPage;