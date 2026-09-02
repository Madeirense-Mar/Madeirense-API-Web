import {
    useState,
    useEffect,
    useMemo,
    useRef,
    type ComponentProps,
    type SubmitEvent
} from "react";

import { useSound } from "react-sounds";

import { useQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    getLabel,
    resolveClassNames,
    Madeirense$Types,
    type appPreferencesType,
    type chatEntryType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./chat.module.css";

import type { IComponentState } from "components/interface";

import type { variantType } from "components/types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"form"> {
    disabled?: boolean;
    order_id: number;
    variant?: variantType;
};

type statusType = (
    | "posting"
    | `error-${(
        | "loading"
        | "sending"
    )}`
);

function OrderChatForm(_props: IPropTypes) {
    const {
        className,
        disabled = false,
        order_id,
        variant = "primary",
        ...props
    } = _props;

    const $ulRef = useRef<HTMLUListElement | null>(null);

    const { user } = useProfile();
    const { play } = useSound("notification/popup");

    const [component, updateComponent] = useState<IComponentState<chatEntryType[], statusType>>({
        data: [],
        status: "loading",
        error: null
    });

    const {
        data: recentLog = [],
        error: componentError,
        status,
    } = component;

    const { Base, Storage } = useMemo(() => MXP$App, []);

    const {
        orders
    } = Base.Business.endpoints;

    const {
        data: log,
        error: fetchError,
        isFetching,
        refetch
    } = useQuery({
        queryKey: ["OrderChatForm$ChatMessages", order_id],
        queryFn: async ({ queryKey }) => await orders.getChatMessages(queryKey[1] as number)
    });

    const logs = useMemo(() => ([
        ...(log ?? []),
        ...(recentLog ?? [])
    ] as chatEntryType[]), [log, recentLog]);

    function clearError() {
        if (componentError) updateComponent(c => { return { ...c, error: null } });
        if (fetchError) refetch();
    };

    async function POST(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const $form = e.target as HTMLFormElement;
        const $formData = new FormData($form);

        try {
            updateComponent(c => { return { ...c, status: "posting" } });

            const newLog = [...(recentLog ?? [])];

            newLog.push(await (orders.postChatMessages({
                order_id,
                message_text: $formData.get("message_text") as string
            })) as chatEntryType);

            ($form.elements.namedItem("message_text") as HTMLInputElement).value = "";

            updateComponent(c => { return { ...c, data: newLog, status: "idle" } });
        } catch (error) {
            updateComponent(c => { return { ...c, error: new Error((error as Error).message), status: "error" } });
        }
    }

    useEffect(() => {
        if (!$ulRef.current) return;

        $ulRef.current.scrollTo({ behavior: "instant", top: $ulRef.current.scrollHeight });
    }, [order_id]);

    useEffect(() => {
        if (isFetching) return;

        updateComponent(c => { return { ...c, data: [] } });
    }, [isFetching]);

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

            switch (notificationId) {
                case ("MXP$CHAT_REPLY"):
                    await refetch();

                    await play();

                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [refetch, Storage, order_id, play]);

    return <form
        className={resolveClassNames(styles[variant], className)}
        onSubmit={disabled ? undefined : POST}
        {...props}
    >
        <fieldset className="w-full" data-section="chat">
            <ul ref={$ulRef}>
                {isFetching && <li data-type="fetching">
                    <Icon name="Loading" className="animate-spin" />
                </li>}

                {logs.map((chat, idx) => {
                    const { message_id, message_text, Users, sent_at, sender_type } = chat;

                    const isMessageChain = idx === 0 ? false : Users.user_id === logs[idx - 1].Users.user_id;
                    const isRestaurant = ["Admin", "Driver", "Staff"].includes(user?.user_role ?? "");

                    const perspective = user?.user_id === Users.user_id ? "me" : "them";

                    switch (perspective) {
                        case "me": return <li
                            className={idx === 0 ? "mt-auto" : ""}
                            key={message_id}
                            data-type={perspective}
                        >
                            <span>{message_text}</span>

                            <span className="ml-auto">
                                {new Date(sent_at as Date).toTimeString().slice(0, 5)}
                            </span>
                        </li>;

                        default: return <li
                            className={idx === 0 ? "mt-auto" : ""}
                            key={message_id}
                            data-type={perspective}
                        >
                            {!isMessageChain && <div>
                                <ProfilePictureButton type="button" src={Users.profile_photo ?? "#"} size="xs" className="pointer-events-none" />

                                <span>
                                    {Users.name}

                                    {Users.phone !== "" && (
                                        (isRestaurant && sender_type === "user")
                                    ) && <span className="italic ml-1">{`(${Users.phone})`}</span>}
                                </span>

                                {(sender_type === "restaurant") && <Tag className="ml-auto">
                                    {getLabel(Users.user_role)}
                                </Tag>}
                            </div>}

                            <span>{message_text}</span>

                            <span className="ml-auto">
                                {new Date(sent_at as Date).toTimeString().slice(0, 5)}
                            </span>
                        </li>
                    }
                })}

                {(componentError || fetchError) && <li data-type="error">
                    <Icon name="ExclamationCircle" />

                    {(componentError || fetchError)?.message}

                    <Icon name="Close" className="cursor-pointer ml-auto" onClick={clearError} />
                </li>}
            </ul>

            <input type="text" name="message_text" title="Mensagem de envio" placeholder="Escreve aqui uma pergunta, reclamação ou agradecimento..." required disabled={disabled || status === "posting"} />

            <Button type={disabled ? "button" : "submit"} disabled={disabled || status === "posting"}>
                {status === "posting"
                    ? <Icon name="Loading" className="animate-spin" />
                    : <Icon name="Send" />
                }
            </Button>
        </fieldset>
    </form>
};

export default OrderChatForm;