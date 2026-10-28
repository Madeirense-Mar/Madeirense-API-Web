import BaseAPIAbstractEndpoint from "./abstract";

import {
    type authenticatedProfileType,
    type Madeirense$Types,
    type processType,
    type staffMemberType,
    type withTokens
} from "@Madeirense/shared";

import type {
    Blocked_Users,
    Users,
    Workstations
} from "@Madeirense/database/browser";

// ***************************************************************************************************************

class UsersEndpoints extends BaseAPIAbstractEndpoint {
    async block(id: number, payload: { expires_at?: Date, reason: string }) {
        const response = await this.client.post<typeof payload, Users>(`/users/${id}/block`, payload);

        return response.data;
    }

    async delete(id: number) {
        const response = await this.client.delete<undefined>(`/users/${id}`);

        return response;
    }

    async deleteProfile() {
        const response = await this.client.delete<undefined>(`/users/profile`);

        return response;
    }

    async edit(payload: Users) {
        const response = await this.client.put<typeof payload, Users>(`/users/${payload.user_id}`, payload);

        return response.data;
    }

    async favorite(id: number) {
        const response = await this.client.post<
            { product_id: typeof id },
            ReadonlyArray<{ product_id: number }>
        >(`/users/profile/favorites/save`, { product_id: id });

        return response.data;
    }

    async get(id: number) {
        const response = await this.client.get<Users>(`/users/${id}`);

        return response.data;
    }

    async getAll(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<Users[]>(`/users`, query);

        return response;
    }

    async getFavorites() {
        const response = await this.client.get<({ product_id: number })[]>(`/users/profile/favorites`);

        return response.data;
    }

    async getOngoingProcess(id: number) {
        const response = await this.client.get<processType>(`/users/${id}/processes`);

        return response.data;
    }

    async getProfile() {
        const response = await this.client.get<authenticatedProfileType>(`/users/profile`);

        return response.data;
    }

    async getStaff(query: Madeirense$Types.searchQueryRecord = {}) {
        const response = await this.client.get<(Workstations & { Users: Users & { Blocked_Users: Blocked_Users[] } })[]>(`/users/staff`, query);

        return response;
    }

    async getStaffMember(id: number) {
        const response = await this.client.get<staffMemberType>(`/users/staff/${id}`);

        return response.data;
    }

    async register(payload: Omit<Users, "user_id"> & { password: string }) {
        const response = await this.client.post<typeof payload, withTokens<authenticatedProfileType>>(`/users`, payload);

        return response.data;
    }

    async registerStaffMember(payload: Omit<Users, "user_id"> & { restaurant_id: number }) {
        const response = await this.client.post<typeof payload, staffMemberType>(`/users/staff`, payload);

        return response.data;
    }

    /** Searches the database for the first users matching with the supplied parameters. */
    async search(params: Partial<Record<keyof Users, string>>) {
        const response = await this.client.get<Users[]>(`/users`, params);

        return response.data?.[0] ?? null;
    }

    async unblock(id: number) {
        const response = await this.client.delete<undefined>(`/users/${id}/unblock`);

        return response;
    }

    async unfavorite(id: number) {
        const response = await this.client.delete<({ product_id: number })[]>(`/users/profile/favorites/remove/${id}`);

        return response.data;
    }

    async update(payload: Partial<Users>) {
        const response = await this.client.patch<typeof payload, Users>(`/users/profile`, payload);

        return response.data;
    }
};

export default UsersEndpoints;