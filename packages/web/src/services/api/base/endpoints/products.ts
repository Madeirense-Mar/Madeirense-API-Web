import BaseAPIAbstractEndpoint from "./abstract";

import type { 
    DB$Types 
} from "@Madeirense/database/browser";

import type {
    Madeirense$Types,
    productType,
    productCommentType,
    productPayloadType
} from "@Madeirense/shared";

// ***************************************************************************************************************

class ProductsEndpoints extends BaseAPIAbstractEndpoint {
    async addDiscounts(payload: { discount: number, product_ids: number[] }) {
        const response = await this.client.patch<typeof payload, DB$Types.actionCountRecord>(`/products/batch/discount`, payload);

        return response.data;
    }

    async clearAllDiscounts() {
        const response = await this.client.patch<undefined, boolean>(`/products/batch/discount/clear`, undefined);

        return response.data;
    }

    async create(payload: Omit<productPayloadType, ("product_id")>) {
        const response = await this.client.post<typeof payload, productType>(`/products`, payload);

        return response.data;
    }

    async delete(id: number) {
        const response = await this.client.delete<productType & { stats: DB$Types.actionCountRecord }>(`/products/${id}`);

        return response;
    }

    async get(id: number) {
        const response = await this.client.get<productType>(`/products/${id}`);

        return response.data;
    }

    async getAll(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<ReadonlyArray<productType>>(`/products`, query);

        return response;
    }

    async getComments(id: number) {
        const response = await this.client.get<ReadonlyArray<productCommentType>>(`/products/${id}/comments`);

        return response;
    }

    async getAllDelisted(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<ReadonlyArray<productType>>(`/products/filtered/delisted`, query);

        return response;
    }

    async recover(id: number) {
        const response = await this.client.patch<undefined, productType>(`/products/${id}/recover`, undefined);

        return response.data;
    }

    async update({ product_id, ...payload }: productPayloadType) {
        const response = await this.client.put<typeof payload, productType>(`/products/${product_id}`, payload);

        return response.data;
    }

    async update_PARTIAL({ product_id, ...payload }: Partial<productPayloadType>) {
        const response = await this.client.patch<typeof payload, productType>(`/products/${product_id}`, payload);

        return response.data;
    }
};

export default ProductsEndpoints;