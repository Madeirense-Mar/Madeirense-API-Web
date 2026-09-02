import BaseAPIAbstractEndpoint from "./abstract";

import type { 
    cartSummaryType,
    cartWithProductsType,
    cartedProductType,
    cartType
} from "@Madeirense/shared";

// ***************************************************************************************************************

class CartEndpoints extends BaseAPIAbstractEndpoint {
    async getMyCart() {
        const response = await this.client.get<ReadonlyArray<cartedProductType>>(`/cart/mine`);

        return response.data;
    }

    async getSummary(type: "all" | cartType, params: { coupon_code?: string } = {}) {
        const response = await this.client.get<cartSummaryType>(`/cart/mine/${type}/summary`, params);
        
        return response.data;
    }

    async clear(type: "all" | cartType = "all") {
        const response = await this.client.delete<undefined>(`/cart/clear/${type}`);

        return response;
    }

    async addItem(product_id: number, quantity?: number) {
        const response = await this.client.post<
            { 
                product_id: typeof product_id, 
                quantity: typeof quantity 
            },
            cartWithProductsType
        >(`/cart/add`, { product_id, quantity });

        return response.data;
    }

    async removeItem(product_id: number, quantity?: number) {
        const response = await this.client.delete<undefined>(`/cart/product/${product_id}${!quantity ? "" : `?quantity=${quantity}`}`);

        return response;
    }

    async removeItems(product_ids: number[]) {
        const response = await this.client.patch<{ product_ids: typeof product_ids }, boolean>(`/cart/product/remove-items`, { product_ids });

        return response;
    }
};

export default CartEndpoints;