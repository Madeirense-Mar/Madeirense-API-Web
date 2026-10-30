import {
    type ComponentProps
} from "react";

import {
    useQuery
} from "@tanstack/react-query";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
    resolveClassNames
} from "@Madeirense/shared";

import ApplicationQueries, {
    type Queries$Types
} from "configurations/queries";

import Button from "components/buttons";
import Icon from "components/icon";

import styles from "./document.module.css";

import type {
    legalDocumentSlugType,
    legalDocumentType
} from "@Madeirense/shared";

// ***************************************************************************************************************

interface IPropTypes extends ComponentProps<"article"> {
    slug: legalDocumentSlugType
};

/**
 * Renders a legal document served by `GET /v1/legal/:slug`. The markdown
 * comes from the API (`api/content/legal/<slug>.md`) — never keep a copy
 * of the text in this app, so web and mobile always show the same thing.
 */
function LegalDocumentView({
    className,
    slug,
    ...props
}: IPropTypes) {
    const {
        data,
        isError,
        isPending,
        refetch
    } = useQuery({
        queryKey: ([
            "App$GetLegalDocument$LegalPage",
            "legal",
            slug
        ] as Queries$Types.queryKey[]),
        queryFn: ApplicationQueries.getItem<legalDocumentType>,
        staleTime: Infinity
    });

    if (isPending) return <article
        {...props}
        className={resolveClassNames(styles.document, styles.status, className)}
        aria-busy="true"
    >
        <Icon name="Loading" className="animate-spin" />
    </article>;

    if (isError || !data) return <article
        {...props}
        className={resolveClassNames(styles.document, styles.status, className)}
        role="alert"
    >
        <Icon name="ExclamationCircle" />

        <p>Não foi possível carregar este documento.</p>

        <Button onClick={() => refetch()}>Tentar novamente</Button>
    </article>;

    return <article
        {...props}
        className={resolveClassNames(styles.document, className)}
    >
        {data.updated && <p className={styles.updated}>
            Última atualização: <time dateTime={data.updated}>{formatUpdated(data.updated)}</time>
        </p>}

        <Markdown remarkPlugins={[remarkGfm]}>
            {data.content}
        </Markdown>
    </article>;
};

/**
 * `updated` is a bare `YYYY-MM-DD` date. Parsed as UTC and formatted in UTC
 * so it never shifts by a day in negative-offset timezones.
 */
function formatUpdated(updated: string) {
    const date = new Date(`${updated}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return updated;

    return date.toLocaleDateString("pt-AO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    });
};

export default LegalDocumentView;
