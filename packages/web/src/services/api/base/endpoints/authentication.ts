import BaseAPIAbstractEndpoint from "./abstract";

import type { 
    Users
} from "@Madeirense/database/browser";

import type { 
    authenticatedProfileType,
    authenticationCredentialsType,
    OAuthOptions,
    withTokens
} from "@Madeirense/shared";

// ***************************************************************************************************************

type cachedDataType = {
    hasCredentials: boolean,
};

const defaultCachedData: Readonly<cachedDataType> = {
    hasCredentials: false
};

class AuthenticationEndpoints extends BaseAPIAbstractEndpoint {
    async hasCredentials() {
        let cachedData: cachedDataType = defaultCachedData;

        if (this.storage) {
            cachedData = await this.storage.getItem<cachedDataType>("L_CACHE$DATA") ?? defaultCachedData;

            if (cachedData?.hasCredentials) return true;
        }

        const response = await this.client.get<boolean>('/auth/has-credentials');

        if (this.storage) await this.storage.setItem<cachedDataType>("L_CACHE$DATA", {
            ...cachedData,
            hasCredentials: response.data || false
        });

        return response.data;
    }

    async setCredentials(password: string) {
        let cachedData: cachedDataType = defaultCachedData;

        const response = await this.client.post<{ password: string }, boolean>('/auth/set-credentials', { password });

        if (this.storage) {
            cachedData = await this.storage.getItem<cachedDataType>("L_CACHE$DATA") ?? defaultCachedData;

            await this.storage.setItem<cachedDataType>("L_CACHE$DATA", {
                ...cachedData,
                hasCredentials: true
            });
        }

        return response.data;
    }

    async login(credentials: authenticationCredentialsType) {
        let cachedData: cachedDataType = defaultCachedData;

        const response = await this.client.post<typeof credentials, withTokens<authenticatedProfileType>, any>('/auth/login', credentials);

        const { 
            tokens, 
            ...user
        } = response.data ?? {};

        if (this.storage) {
            cachedData = await this.storage.getItem<cachedDataType>("L_CACHE$DATA") ?? defaultCachedData;

            await this.storage.setItem<cachedDataType>("L_CACHE$DATA", {
                ...cachedData,
                hasCredentials: true
            });
        }

        return user as authenticatedProfileType;
    }

    async loginWith(provider: (keyof typeof OAuthOptions)) {
        window.location.href = `${this.client.getBaseURL()}/auth/${provider}`;
    }

    async handleOAuthSuccess(): Promise<Users | null> {
        const response = await this.getSession();

        return response;
    }

    async logout() {
        const response = await this.client.post<undefined, undefined>('/auth/logout', undefined);

        if (this.storage) await this.storage.removeItem("L_CACHE$DATA");

        return response;
    }

    async getSession() {
        const response = await this.client.get<withTokens<authenticatedProfileType>>('/auth/me');

        return response.data;
    }

    async requestReset(payload: { email: string }) {
        const response = await this.client.post<typeof payload, any>('/auth/reset', payload);

        return response.data;
    }
};

export default AuthenticationEndpoints;