import {
    useEffect,
    useState,
    useRef,
    type RefObject,
    type UIEvent
} from "react";

import {
    useParams
} from "react-router-dom";

import {
    locales
} from "@Madeirense/shared";

import { useNotifications } from "contexts/Notifications";
import { useProfile } from "contexts/Profile";

import RestaurantEventList from "components/lists/restaurantEvents";

import { Root$Enumerators } from "styles/enumerators";

import "./Events.css";

// ***************************************************************************************************************

const EventsPage = () => {
    const $mainRef = useRef<HTMLElement | null>(null);
    const $ulRef = useRef<HTMLUListElement | null>(null);

    const { user } = useProfile();

    const {
        push,
        pop
    } = useNotifications();

    const {
        LoginToPurchaseTickets
    } = locales.get("pt")?.strings ?? {};

    const params = useParams();

    const [scrollTop, setScrollTop] = useState(0);
    const [working, setWorking] = useState(false);

    const event_id = parseInt(params.event_id ?? "0");

    const notificationId = "N#LOGIN_TO_PURCHASE_TICKET";

    function scrollToNextElement(isWorking: boolean, lastScrollTop: number, ulRef: RefObject<HTMLUListElement | null>) {
        return (e: UIEvent<HTMLElement>) => {
            if (isWorking || !ulRef.current) return;

            const $main = e.target as HTMLElement;
            const $ul = ulRef.current;

            window.requestAnimationFrame(() => {
                setWorking(true);

                const { bottom } = $main.getBoundingClientRect();

                const $LICollection = Array.from($ul.children);

                let next$LIIndex = -1;

                const scrollDirection = ((currentTop, lastTop) => {
                    switch (true) {
                        case (currentTop > lastTop):
                            return "up";

                        case (currentTop < lastTop):
                            return "down";

                        default:
                            return "stopped";
                    }
                })($main.scrollTop, lastScrollTop);

                switch (scrollDirection) {
                    case "up":
                        next$LIIndex = $LICollection.findIndex($li => $li.getBoundingClientRect().bottom > bottom);
                        break;

                    case "down":
                        next$LIIndex = $LICollection.findIndex($li => $li.getBoundingClientRect().bottom < bottom);
                        break;

                    default: return;
                }

                $LICollection[next$LIIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
            })
        }
    };

    function updateScrollTop({ target }: UIEvent<HTMLElement>) {
        setScrollTop((target as HTMLElement).scrollTop);

        setWorking(false);
    };

    useEffect(() => {
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.events
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

    useEffect(() => {
        const $main = $mainRef.current;

        if (!$main) return;

        setScrollTop($main.scrollTop);
    }, []);

    useEffect(() => {
        if (user !== undefined) return;

        push({
            id: notificationId,
            alert: LoginToPurchaseTickets as string,
            type: "alert",
            options: {
                sticky: true
            }
        })
        return () => {
            pop(notificationId);
        }
    }, [
        LoginToPurchaseTickets,
        push,
        pop,
        user,
    ]);

    return <main
        ref={$mainRef}
        onScroll={scrollToNextElement(working, scrollTop, $ulRef)}
        onScrollEnd={updateScrollTop}
        className="w-full"
    >
        <RestaurantEventList
            className="w-full"
            ref={$ulRef}
            selectedEvent={event_id}
            mode="viewport"
            disableLink
        />
    </main>
};

export default EventsPage;