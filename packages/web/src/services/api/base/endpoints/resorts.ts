import BaseAPIAbstractEndpoint from "./abstract";

import {
    API$Enumerators,
    Madeirense$Enumerators,
    type API$Types,
    type Madeirense$Types,
    type addRoomBodyType,
    type bookRoomBodyType,
    type bookingType,
    type bookingHistoryType,
    type createResortBodyType,
    type resortRoomType,
    type resortChatEntryType,
    type resortPropertyType,
    type updateBookingBodyType,
    type updateRoomBodyType
} from "@Madeirense/shared";

import type {
    Resort_Booking_Cancellations_reason_code,
    Resort_Bookings_status,
    Resort_Rooms_Media_media_type,
    Resorts,
    Resort_Amenities,
    Resort_Booking_Cancellation_Policies,
    Resort_Booking_Cancellations,
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

class ResortsEndpoints extends BaseAPIAbstractEndpoint {
    async addAmenities(payload: string[]) {
        const response = await this.client.post<typeof payload, undefined>(`/resorts/properties/amenities`, payload);

        return response.success;
    }

    async addBedTypes(payload: ({ name: number })[]) {
        const response = await this.client.post<typeof payload, undefined>(`/resorts/properties/bed-types`, payload);

        return response.success;
    }

    async addRoom(id: number, payload: addRoomBodyType) {
        const response = await this.client.post<typeof payload, resortRoomType>(`/resorts/${id}/room`, payload);

        return response.data;
    }

    async batchOperations<Body>(
        entity: ('booking' | 'resort' | 'room'),
        type: API$Enumerators.BatchActions,
        {
            body,
        }: Partial<{
            body: Body
        }> = {}
    ) {
        switch (type) {
            case API$Enumerators.BatchActions.update:
                switch (entity) {
                    case 'room':
                        return (await this.client.patch<typeof body, boolean>(`/resorts/rooms/batch/update`, body)).data

                    default:
                        console.error("Unknown entity: ", entity);

                        break;
                }

            default:
                console.error("Unknown batch operations type: ", type);

                return null;
        };
    }

    async bookRoom(id: number, payload: bookRoomBodyType) {
        const response = await this.client.post<typeof payload, bookingType>(`/resorts/${id}/book`, payload);

        return response.data;
    }

    async cancelBooking(id: number, reason_code: Resort_Booking_Cancellations_reason_code) {
        const response = await this.client.post<{ reason_code: typeof reason_code }, Resort_Booking_Cancellations>(`/resorts/bookings/${id}/cancel`, { reason_code });

        return response.data;
    }

    async createResort(payload: createResortBodyType) {
        const response = await this.client.post<typeof payload, Resorts>(`/resorts`, payload);

        return response.data;
    }

    async deleteProperty(property: resortPropertyType, list: number[]) {
        const response = await this.client.delete<undefined>(`/resorts/properties/${property}?${Madeirense$Enumerators.SearchQueries.list}=${list.join(',')}`);

        return response.success;
    }

    async deleteResort(id: number) {
        const response = await this.client.delete<undefined>(`/resorts/${id}`);

        return response.success;
    }

    async deleteRoom(id: number) {
        const response = await this.client.delete<undefined>(`/resorts/rooms/${id}`);

        return response.success;
    }

    async getResort(id: number) {
        const response = await this.client.get<(Resorts & { Resort_Rooms: resortRoomType[] })>(`resorts/${id}`);

        return response.data;
    }

    async getResorts(params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<Resorts[]>(`/`, params);

        return response;
    }

    async getRooms(id: number, params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<resortRoomType[]>(`/resorts/${id}/rooms`, params);

        return response;
    }

    async getBookingCancellationPolicies(params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<Resort_Booking_Cancellation_Policies[]>(`/resorts/bookings/cancellation-policies`, params);

        return response;
    }

    async getAmenities(params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<Resort_Amenities[]>(`/resorts/properties/amenities`, params);

        return response;
    }

    async getBedTypes(params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<Resort_Amenities[]>(`/resorts/properties/bed-types`, params);

        return response;
    }

    async getBooking(id: number) {
        const response = await this.client.get<bookingType>(`/resorts/bookings/${id}`);

        return response.data;
    }

    async getBookings(id: number, params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<bookingType[]>(`/resorts/${id}/bookings`, params);

        return response;
    }

    async getBookingChatMessages(id: number, params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<resortChatEntryType[]>(`/resorts/bookings/${id}/chat`, params);

        return response.data;
    }

    async getBookingHistory(id: number, params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<bookingHistoryType[]>(`/resorts/bookings/${id}/history`, params);

        return response.data;
    }

    async getMyBookings(params?: Madeirense$Types.searchQueryRecord) {
        const response = await this.client.get<bookingType[]>(`/resorts/bookings/mine`, params);

        return response;
    }

    async postBookingChatMessage(id: number, payload: {
        message_text: string,
        booking_id: number
    }) {
        const response = await this.client.post<typeof payload, resortChatEntryType>(`/resorts/bookings/${id}/chat`, payload);

        return response.data;
    }

    async updateBooking(id: number, payload: updateBookingBodyType) {
        const response = await this.client.patch<typeof payload, bookingType>(`/resorts/bookings/${id}`, payload);

        return response.data;
    }

    async updateBookingStatus(id: number, status: Resort_Bookings_status) {
        const response = await this.client.patch<undefined, bookingType>(`/resorts/bookings/${id}/update/${status}`, undefined);

        return response.data;
    }

    async updateProperty(id: number, property: resortPropertyType, payload: { name: string, sleeps?: number }) {
        const response = await this.client.post<typeof payload, undefined>(`/resorts/properties/update/${property}/${id}`, payload);

        return response.success;
    }

    async updateResort(id: number, payload: Partial<createResortBodyType>) {
        const response = await this.client.patch<typeof payload, Resorts>(`/resorts/${id}`, payload);

        return response.data;
    }

    async updateRoom(id: number, payload: updateRoomBodyType) {
        const response = await this.client.patch<typeof payload, resortRoomType>(`/resorts/rooms/${id}`, payload);

        return response.data;
    }

    async updateRoomAmenities(id: number, payload: API$Types.listUpdateType) {
        const response = await this.client.patch<typeof payload, resortRoomType>(`/resorts/rooms/${id}/amenities`, payload);

        return response.data;
    }

    async updateRoomBedTypes(id: number, payload: API$Types.listUpdateType<{ bed_type_id: number, quantity: number }>) {
        const response = await this.client.patch<typeof payload, resortRoomType>(`/resorts/rooms/${id}/bed-types`, payload);

        return response.data;
    }

    async updateRoomMediaFiles(id: number, payload: API$Types.listUpdateType<{ media_url: string, media_type: Resort_Rooms_Media_media_type }>) {
        const response = await this.client.patch<typeof payload, resortRoomType>(`/resorts/rooms/${id}/media`, payload);

        return response.data;
    }
};

export default ResortsEndpoints;