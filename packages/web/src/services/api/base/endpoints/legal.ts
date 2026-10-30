import BaseAPIAbstractEndpoint from "./abstract";

import type {
    legalDocumentSlugType,
    legalDocumentType
} from "@Madeirense/shared";

// ***************************************************************************************************************

/**
 * Public, unauthenticated — see `api/src/routes/legal.ts`. `content` comes
 * back as raw markdown; rendering it is the page's job.
 */
class LegalEndpoints extends BaseAPIAbstractEndpoint {
    async get(slug: legalDocumentSlugType) {
        const response = await this.client.get<legalDocumentType>(`/legal/${slug}`);

        return response.data;
    }

    async getPrivacyPolicy() {
        return await this.get("privacy");
    }

    async getTerms() {
        return await this.get("terms");
    }
};

export default LegalEndpoints;
