import BaseAPIAbstractEndpoint from "./abstract";

import type { 
    Products,
    Restaurant_Events
} from "@Madeirense/database/browser";

import type {
    boughtTicketType,
    restaurantEventType,
    restaurantEventPayloadType,
    unionBetween,
    Madeirense$Types,
    restaurantEventProductPayloadType
} from "@Madeirense/shared";

// ***************************************************************************************************************

class RestaurantEventsEndpoints extends BaseAPIAbstractEndpoint {
    async get(id: number) {
        const response = await this.client.get<restaurantEventType>(`/restaurant-events/${id}`);

        return response.data;
    }

    async getAll(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<restaurantEventType[]>(`/restaurant-events`, query);

        return response;
    }

    async getBoughtTickets(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<ReadonlyArray<boughtTicketType>>(`/restaurant-events/bought-tickets`, query);

        return response;
    }

    async cancel(id: number) {
        const response = await this.client.post<
            object,
            unionBetween<
                Restaurant_Events,
                {
                    _count: {
                        Orders: number,
                        Payments: number
                    }
                }
            >
        >(`/restaurant-events/${id}/cancel`, {});

        return response.data;
    }

    async create(payload: restaurantEventPayloadType) {
        const response = await this.client.post<typeof payload, restaurantEventType>(`/restaurant-events`, payload);

        return response.data;
    }

    async createProduct(event_id: number, payload: restaurantEventProductPayloadType) {
        const response = await this.client.post<typeof payload, Products>(`/restaurant-events/${event_id}/merch`, payload);

        return response.data;
    }

    async delete(id: number) {
        const response = await this.client.delete<undefined>(`/restaurant-events/${id}`);

        return response;
    }

    async update(event_id: number, payload: restaurantEventPayloadType) {
        const response = await this.client.put<typeof payload, restaurantEventType>(`/restaurant-events/${event_id}`, payload);

        return response.data;
    }

    async updateProduct(event_id: number, product_id: number, payload: Partial<restaurantEventProductPayloadType>) {
        const response = await this.client.patch<typeof payload, Products>(`/restaurant-events/${event_id}/merchandise/${product_id}`, payload);

        return response.data;
    }

    async update_PARTIAL(event_id: number, payload: Partial<restaurantEventPayloadType>) {
        const response = await this.client.patch<typeof payload, Partial<restaurantEventType>>(`/restaurant-events/${event_id}`, payload);

        return response.data;
    }
};

export default RestaurantEventsEndpoints;