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

import { useApp } from "contexts/App";
import { useProfile } from "contexts/Profile";

import Button from "components/buttons";
import ProductCard from "components/cards/product";
import ProductCommentsList from "components/lists/productComments";
import Icon from "components/icon";
import Tag from "components/tag";

import { Page$Enumerators } from "pages/enumerators";
import { Root$Enumerators } from "styles/enumerators";

import type {
    Users
} from "@Madeirense/database/browser";

import type { IPageState } from "components/interface";
import type { workQueueStateType } from "components/types";

import "./Product.css";

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
        const $root = document.getElementById("root");

        if (!$root) return;

        $root.setAttribute(
            Root$Enumerators.Attributes.Context.page,
            Root$Enumerators.Attributes.Pages.product
        );

        return () => {
            $root.removeAttribute(Root$Enumerators.Attributes.Context.page);
        }
    }, []);

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
            return <main className="w-full h-full flex flex-row justify-center items-center">
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

            return <main data-view="product-table">
                {showNotification && <header>
                    <Tag>
                        <Icon name="Loading" className="animate-spin" />
                    </Tag>
                </header>}

                <ProductCard {...{ product }} disableLink />

                {(pageError) && <section>
                    <Icon name="Error" className="mr-12px" />

                    {pageError.message}
                </section>}

                <section className="flex flex-col justify-start items-start gap-2">
                    <section className="flex flex-col justify-start items-start gap-2">
                        <header className="w-full flex flex-row justify-start items-center gap-3 mb-2">
                            <Icon name="Notes" />

                            <h2>Prato em detalhe</h2>
                        </header>

                        <p>{product.description}</p>
                    </section>

                    {/* <section className="flex flex-col justify-start items-start gap-2">
                        <header className="w-full flex flex-row justify-start items-center gap-3 mb-2">
                            <h2>Factos</h2>
                        </header>
                    </section> */}
                </section>

                {/* <section className="flex flex-col justify-start items-start gap-2">
                    <header className="w-full flex flex-row justify-start items-center gap-3 mb-2">
                        <Icon name="Comments" />

                        <h2>Conversa</h2>
                    </header>

                    <form onSubmit={!user ? undefined : POST} data-state={!user ? "disabled" : "idle"}>
                        {!user
                            ? <input value={LoginToCommentOnThisProduct} name="comment" title="Campo para comentário" type="text" readOnly />
                            : <input placeholder="Mensagem" name="comment" title="Campo para comentário" type="text" required />
                        }

                        <Button value={tableSection} data-shape="round" type="submit" disabled={!user} >
                            <Icon name="Send" />
                        </Button>
                    </form>

                    <hr />

                    <ProductCommentsList product_id={id} localList={localComments} className="max-h-[416px] overflow-y-auto w-full" trackAppUpdates />
                </section> */}
            </main>
        }
    };
};

export default ProductPage;