import {
    useCallback,
    useEffect,
    useMemo,
    type ComponentProps,
} from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
    DEFAULT_APP_PREFERENCES,
    resolveClassNames,
    type appPreferencesType,
    type Madeirense$Types,
    type productCommentType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { useProfile } from "contexts/Profile";

import ProfilePictureButton from "components/buttons/profile";
import Icon from "components/icon";
import Tag from "components/tags";

import { nextPageTriggerSetup } from "./utilities/functions";

import styles from "./productComments.module.css";

import type {
    User_Comments
} from "@Madeirense/database/browser";

import type { queuefied } from "../types";

// ***************************************************************************************************************

type queuefiedProductCommentType = queuefied<productCommentType>;

interface IPropTypes extends ComponentProps<"ul"> {
    autoSort?: boolean;
    localList?: queuefiedProductCommentType[];
    mode?: "default" | "admin";
    product_id: number;
    trackAppUpdates?: boolean;
};

function ProductCommentsList(_props: IPropTypes) {
    const {
        className,
        autoSort = false,
        localList = [],
        mode = "default",
        product_id,
        trackAppUpdates = false,
        ...props
    } = _props;

    const { user } = useProfile();

    const { Base, Storage } = useMemo(() => MXP$App, []);

    const {
        products
    } = Base.Business.endpoints;

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        refetch,
        status,
    } = useInfiniteQuery({
        queryKey: ["App$GetProductComments", product_id],
        queryFn: ({ queryKey }) => products.getComments(queryKey[1] as number),
        getNextPageParam: (lastPage) => {
            return lastPage.pagination?.hasNext
                ? lastPage.pagination.page + 1
                : undefined;
        },
        initialPageParam: 1
    });

    useEffect(() => {
        if ((
            !trackAppUpdates ||
            !('serviceWorker' in navigator))
        ) return;

        async function triggerRefetch(event: MessageEvent) {
            const preferences = await Storage.getItem<appPreferencesType>("L_APP$PREFERENCES") ?? DEFAULT_APP_PREFERENCES;

            if (preferences.notifications !== "allowed") return;

            const {
                notificationId,
                data
            } = event.data as Madeirense$Types.pushNotification<User_Comments>;

            if (data.product_id !== product_id) return;

            switch (notificationId) {
                case "MXP$PRODUCT_COMMENT":
                    await refetch();

                    break;

                default: break;
            }
        };

        navigator.serviceWorker.addEventListener('message', triggerRefetch);

        return () => {
            navigator.serviceWorker.removeEventListener('message', triggerRefetch);
        }
    }, [trackAppUpdates, refetch, product_id, Storage]);

    const lastElementRef = useCallback(
        nextPageTriggerSetup({
            fetchNextPage,
            hasNextPage,
            isFetchingNextPage,
            isFetching
        }),
        [fetchNextPage, hasNextPage, isFetchingNextPage, isFetching]
    );

    const $ulProps = {
        className: resolveClassNames(styles.list, className),
        ...props
    };

    switch (status) {
        case "error": return (<ul {...$ulProps}>
            <li data-state="error" className="rounded-md flex flex-row justify-start items-center gap-2 px-2">
                <Icon name="ExclamationCircle" />

                <p>{error?.message}</p>
            </li>
        </ul>);
        
        case "pending": return (<ul {...$ulProps}>
            <li>
                <Icon name="Loading" className="animate-spin mx-auto my-4" />
            </li>
        </ul>);

        default: {
            const list = [
                ...localList,
                ...(data?.pages.flatMap(page => page.data) || [])
            ].sort((a, b) => {
                if (
                    !a ||
                    !autoSort ||
                    !b
                ) return 0;

                if (
                    a.user_id === user?.user_id ||
                    b.user_id === user?.user_id
                ) return 1;

                return -1;
            });

            return <ul {...$ulProps}>
                {list.length === 0 && <li data-empty>
                    Sem comentários
                </li>}

                {isFetching && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}

                {list.map((item, idx) => {
                    if (!item) return null;

                    const ref = idx === list.length - 1 ? lastElementRef : undefined;

                    return <li key={item.comment_id} {...{ ref }}>
                        <ProfilePictureButton src={item.Users?.profile_photo ?? "#"} size="s" />

                        <div className="w-full flex flex-col justify-between items-start gap-1">
                            <div className="w-full flex flex-row justify-start items-center gap-2">
                                {(item as queuefiedProductCommentType)?.state === "queued" && <Icon name="Upload" />}
                                {(item as queuefiedProductCommentType)?.state === "failed" && <Icon name="Close" />}
                                {(item as queuefiedProductCommentType)?.state === "uploading" && <Icon name="Loading" className="animate-spin" />}
                                {(item as queuefiedProductCommentType)?.state === "uploaded" && <Icon name="Check" />}

                                <span className="font-bold">
                                    {`${item.Users?.name}${item.user_id === user?.user_id ? " (Você)" : ""}`}
                                </span>

                                {mode === "admin" && <Tag className="opacity-40 italic">
                                    <Icon name="Email" />

                                    {item.Users?.email}
                                </Tag>}

                                <Tag className="opacity-40 italic ml-auto">
                                    <Icon name="Calendar1" />

                                    {new Date(item.created_at as Date).toLocaleDateString()}
                                </Tag>
                            </div>

                            <span>{item.comment}</span>
                        </div>
                    </li>;
                })}

                {isFetchingNextPage && <li>
                    <Icon name="Loading" className="animate-spin mx-auto my-4" />
                </li>}
            </ul>
        };
    }
};

export default ProductCommentsList;