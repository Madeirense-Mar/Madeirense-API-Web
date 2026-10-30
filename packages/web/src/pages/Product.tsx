import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    generateRandomNumbers,
    locales,
    Madeirense$Enumerators,
    type productCommentType
} from "@Madeirense/shared";

import MXP$App from "configurations";

import { Page$Enumerators } from "pages/enumerators";

import { useApp } from "contexts/App";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import AnchorButton from "components/buttons/anchor";

import ProductCard from "components/cards/product";

import Icon from "components/icon";
import Tag from "components/tags";

import ProductCommentsList from "components/lists/productComments";

import type {
    Users
} from "@Madeirense/database/browser";

import type { 
    IPageState
} from "components/interface";

import type {
    workQueueStateType
} from "components/types";

// ***************************************************************************************************************

type stateType = {
    localComments: workQueueType[],
    section: (
        | "comments"
        | "reviews"
        | "stats"
    )
};

type workQueueType = productCommentType & {
    state?: workQueueStateType
};

const ProductPage = () => {
    const {
        get,
        state
    } = useApp();

    const navigate = useNavigate();

    const { user } = useProfile();

    const params = useParams();

    const id = parseInt(params.product_id ?? "0", 10);

    const { comments } = useMemo(() => MXP$App.Base.Business.endpoints, []);

    const product = useMemo(() => get("Products")?.find(({ product_id }) => product_id === id), [get, id]);

    const [page, updatePage] = useState<IPageState<stateType>>({
        data: {
            localComments: [],
            section: "stats"
        },
        error: null,
        status: "idle"
    });

    const {
        data,
        error: pageError
    } = page;

    const {
        localComments = [],
        section: tableSection = "stats"
    } = data ?? {};

    const assertions = {
        "isFetching": [
            ["loading"].some(s => state.includes(s)),
            state.includes("Products")
        ].includes(true),
        "isUpdating": Boolean(product) && state.includes("Products")
    };

    async function POST(e: any) {
        e.preventDefault();

        const form = e.target as HTMLFormElement;
        const elements = form.elements;

        try {
            switch (tableSection) {
                case "comments":
                    const $input = (elements.namedItem("comment") as HTMLTextAreaElement);

                    const comment = $input.value;

                    const cachedComments = [...localComments];

                    cachedComments.unshift({
                        state: "queued",
                        comment_id: generateRandomNumbers(10),
                        product_id: id,
                        created_at: new Date(),
                        user_id: user?.user_id as number,
                        Users: user as Users,
                        comment,
                    });

                    $input.value = "";

                    updatePage(p => { return { ...p, status: "idle", data: { ...p.data, localComments: cachedComments } as stateType } });

                    break;

                default:
                    break;
            }
        } catch (error) {
            updatePage(p => { return { ...p, status: "error", error: new Error((error as Error).message) } })
        }
    };

    useEffect(() => {
        const localComments = (page.data?.localComments ?? []);

        if (
            !Boolean(localComments.length) ||
            !localComments.map(({ state }) => state).includes("queued")
        ) return;

        function uploadQueuedComments(queue: workQueueType[]) {
            queue.forEach(async ({ state, ...data }, idx) => {
                if (state !== "queued") return;

                queue[idx].state = "uploading";

                updatePage(p => { return { ...p, data: { ...p.data, localComments: queue } as stateType } });

                try {
                    await comments.post({
                        product_id: data.product_id,
                        comment: data.comment
                    });

                    queue[idx].state = "uploaded";

                    updatePage(p => { return { ...p, data: { ...p.data, localComments: queue } as stateType } });
                } catch (error) {
                    queue[idx].state = "failed";

                    updatePage(p => { return { ...p, data: { ...p.data, localComments: queue } as stateType } });
                }
            });
        };

        uploadQueuedComments(localComments);
    }, [
        comments,
        page.data?.localComments
    ]);

    useEffect(() => {
        if ([
            product !== undefined,
            assertions.isFetching
        ].includes(true)) return;

        navigate([
            `${Madeirense$Enumerators.Pages.App["Not Found"]}?`,
            `${Page$Enumerators.Queries.wasIn}=${encodeURIComponent(`${Madeirense$Enumerators.Pages.App.Product}/${id}`)}`
        ].join(), {
            replace: true
        });
    }, [
        assertions.isFetching,
        id,
        navigate,
        product,
    ]);

    const showNotification = [assertions.isUpdating].includes(true);

    switch (true) {
        case (assertions.isFetching): {
            return <main className="flex flex-row justify-center items-center">
                <Icon name="Loading" className="animate-spin" />
            </main>
        }

        case (product === undefined): {
            return null;
        }

        default: {
            const {
                LoginToCommentOnThisProduct
            } = locales.get("pt")?.strings ?? {};

            return <main className="flex flex-col justify-start items-start gap-11">
                {showNotification && <header>
                    <Tag>
                        <Icon name="Loading" className="animate-spin" />
                    </Tag>
                </header>}

                <AnchorButton to={Madeirense$Enumerators.Pages.App.Layout}>
                    <Icon name="ArrowLeft" />
                </AnchorButton>

                <ProductCard 
                    className="w-full"
                    disableLink
                    {...{ product }} 
                />

                {(pageError) && <div className="w-full flex flex-row justify-center items-center gap-5" data-state="error">
                    <Icon name="Error" className="mr-12px" />

                    {pageError.message}
                </div>}

                <section className="w-full flex flex-col justify-start items-start gap-2">
                    <section className="flex flex-col justify-start items-start gap-2">
                        <header className="w-full flex flex-row justify-start items-center gap-3 mb-2">
                            <Icon name="Notes" />

                            <h2>Prato em detalhe</h2>
                        </header>

                        <p>{product.description}</p>
                    </section>
                </section>
            </main>
        }
    };
};

export default ProductPage;