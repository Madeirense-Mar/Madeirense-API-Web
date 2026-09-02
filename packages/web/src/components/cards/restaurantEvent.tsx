import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentProps,
    type MouseEvent,
} from "react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import ReactPlayer from "react-player";

import {
    formatNumber,
    resolveClassNames,
    Madeirense$Enumerators,
    type restaurantEventType
} from "@Madeirense/shared";

import { useApp } from "contexts/App";
import { useProfile } from "contexts/Profile";

import { DEFAULT_COMPONENT_STATE } from "components/utilities/constants";

import Icon from "components/icon";
import Tag from "components/tags";

import styles from "./restaurantEvent.module.css";

import type {
    IComponentState
} from "../interface";

import type {
    withVariant
} from "../types";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"div"> {
    disableActions?: boolean;
    disableLink?: boolean;
    disableVideo?: boolean;
    mode?: "default" | "admin";
    restaurantEvent: restaurantEventType;
    type?: "component" | "page";
};

function RestaurantEventCard(_props: withVariant<IPropTypes>) {
    const {
        className,
        disableActions = false,
        disableLink = false,
        disableVideo = false,
        mode = "default",
        onClick,
        restaurantEvent,
        type = "component",
        variant = "primary",
        ...props
    } = _props;

    const { get } = useApp();

    const navigate = useNavigate();

    const { user } = useProfile();

    const [card, updateCard] = useState<IComponentState<typeof restaurantEvent>>(DEFAULT_COMPONENT_STATE);

    const $videoRef = useRef<HTMLVideoElement | null>(null);
    const $timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        name,
        event_id,
        restaurant_id,
        video_url,
        price,
        spots,
        thumbnail_url,
    } = restaurantEvent;

    const restaurant = useMemo(() => (get("Restaurants") ?? []).find(r => r.restaurant_id === restaurant_id), [get]);

    const assertions = {
        "isDisabled": [
            !user,
            disableLink
        ].includes(true)
    };

    function handleClick(e: MouseEvent<HTMLDivElement>) {
        navigate(`${Madeirense$Enumerators.Pages.Checkout.Events}?${Madeirense$Enumerators.SearchQueries.event_id}=${event_id}`)

        onClick?.(e);
    }

    async function playVideo() {
        if (!$videoRef.current) return;

        if ($timeoutRef.current) clearTimeout($timeoutRef.current);

        await $videoRef.current.play();
        $videoRef.current.volume = 0.5;
    }

    function stopVideo() {
        if (!$videoRef.current) return;

        const $video = ($videoRef.current as HTMLVideoElement);

        $video.volume = 0;

        $timeoutRef.current = setTimeout(() => {
            $video.pause();
            $video.currentTime = 0;
        }, 1001);
    }

    useEffect(() => {
        if (!$videoRef.current) return;

        const $video = $videoRef.current;

        function loop(this: HTMLVideoElement) {
            this.currentTime = 0;
            this.play();
        }

        $video.addEventListener("ended", loop);

        return () => { $video.removeEventListener("ended", loop); };
    }, []);

    return <div
        className={resolveClassNames(
            styles[variant],
            styles[type],
            (!user || disableLink) ? undefined : "cursor-pointer",
            className
        )}
        data-state={card.status}
        onClick={assertions.isDisabled ? onClick : handleClick}
        style={{ backgroundImage: `url(${thumbnail_url})` }}
        {...props}
    >
        {!disableVideo && <div data-area="video" onMouseOver={playVideo} onMouseLeave={stopVideo}>
            <ReactPlayer
                ref={$videoRef}
                src={video_url as string}
                onLoad={() => updateCard(c => { return { ...c, status: "idle" } })}
                onLoadStart={() => updateCard(c => { return { ...c, status: "loading" } })}
            />
        </div>}

        <div data-type="overlay" />

        <div data-area="title">
            {mode === "admin" && <Link className="mr-auto font-extrabold" to={`/back-office/events/${event_id}`}>{name}</Link>}

            {mode === "default" && <h3 className="font-extrabold">{name}</h3>}

            <h3 className="ml-auto">
                <Icon name="Ticket" className="inline-flex" />

                {Boolean(parseInt(`${price}`)) ? formatNumber(parseFloat(`${price}`)) : "Grátis"}
            </h3>
        </div>

        <div data-area="information">
            <Tag variant="secondary">
                <Icon name="Store" />

                {restaurant?.name}
            </Tag>

            <Icon name="ChevronRight" />

            <Tag variant="secondary">
                <Icon name="MapMarker" />

                {restaurant?.Delivery_Locations?.address}
            </Tag>

            <Tag className="ml-auto">
                <Icon name="User" />

                {spots === 0 ? "Sem vagas" : spots ?? "Sem limite"}
            </Tag>
        </div>
    </div>;
};

export default RestaurantEventCard;