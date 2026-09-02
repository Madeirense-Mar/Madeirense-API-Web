import {
    useEffect,
    useMemo,
    type ComponentProps
} from "react";

import { useQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    getLabel,
    resolveClassNames,
    type appPreferencesType,
    type Madeirense$Types,
} from "@Madeirense/shared";

import Icon from "components/icon";
import Tag from "components/tags";

import MXP$App from "configurations";

import styles from "./history.module.css";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"ul"> {
    order_id: number
};

const OrderHistoryList = ({
    className: cn,
    order_id,
    ..._props
}: IPropTypes) => {
    const props = {
        className: resolveClassNames(styles.list, cn),
        ..._props
    };

    const { Base, Storage } = useMemo(() => MXP$App, []);

    const {
        orders
    } = Base.Business.endpoints;

    const {
        data: history,
        error: fetchError,
        isFetching,
        refetch
    } = useQuery({
        queryKey: ["OrderHistoryList$History", order_id],
        queryFn: async ({ queryKey }) => await orders.getHistory(queryKey[1] as number)
    });

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data: payload
            } = event.data as Madeirense$Types.pushNotification<Partial<any>>;

            if (payload?.order_id !== order_id) return;

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
    }, [refetch, Storage, order_id]);

    switch (true) {
        case (isFetching): return (<ul {...props}>
            <li data-type="fetching">
                <Icon name="Loading" className="animate-spin" />
            </li>
        </ul>);

        case (fetchError !== null): return (<ul {...props}>
            <li data-type="error">
                <Icon name="ExclamationCircle" />

                {fetchError.message}
            </li>
        </ul>);

        case (!Boolean((history ?? []).length)): return (<ul {...props}>
            <li data-type="empty">
                <span className="italic opacity-60">Sem histórico registado</span>
            </li>
        </ul>);

        default: return (<ul {...props}>
            {(history ?? []).map(h => <li key={h.history_id}>
                <Tag>{getLabel(h.status)}</Tag>

                <span className="italic">{h.notes}</span>

                <span className="ml-auto opacity-20 hover:opacity-100">{new Date(h.created_at as Date).toLocaleString()}</span>
            </li>)}
        </ul>);
    };
};

export default OrderHistoryList;