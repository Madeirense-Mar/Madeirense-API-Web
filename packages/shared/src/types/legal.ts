/**
 * Slugs served by `GET /v1/legal/:slug` — each maps to
 * `api/content/legal/<slug>.md`.
 */
export type legalDocumentSlugType = (
    | "privacy"
    | "terms"
);

/**
 * Result of `GET /v1/legal/terms` and `GET /v1/legal/privacy`.
 *
 * `content` is raw markdown (frontmatter already stripped) — rendering it
 * is each client's job, so web and mobile always show the same text.
 * `updated` is the document's own frontmatter `updated:` date
 * (`YYYY-MM-DD`), or an empty string when the file doesn't declare one.
 */
export type legalDocumentType = {
    content: string;
    updated: string;
};
