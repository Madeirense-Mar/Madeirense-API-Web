import { 
    API$Enumerators,
    ClientRequestService
} from "@Madeirense/shared";

import BaseAPIService from "services/api/base";

import env from "env";

import type {
    serviceConstructorOptionsType
} from "@Madeirense/shared";

// ***************************************************************************************************************

type APIClientsConstructor = serviceConstructorOptionsType<{
    baseURL: string,
    name: string
}>;

/**
 * # BaseApp Clients
 * 
 * - Type: Singleton
 * - Version: `1.0`
 * - Author: **SPKTR**
 *   - _Roberto César Ferreira de Carvalho_
 * 
 * ---
 * 
 * ## Meta
 * 
 * The current version contains:
 * 
 * - Clients:
 *   - {@link BaseAPIService | Base}, sample API to use as an example.
 * 
 */
export class AppClients {
    private static instance: AppClients;
    private static instanceName: string = "";

    public readonly endpoint: string;

    public readonly Business: BaseAPIService;

    private constructor(options: APIClientsConstructor) {
        AppClients.instanceName = options.name ?? "BaseClients";

        this.endpoint = options.baseURL;

        const Client = new ClientRequestService({
            ...options,
            defaultHeaders: {
                [API$Enumerators.Headers["api-key"]]: env.API_KEY,
                ...options.defaultHeaders
            }
        });

        this.Business = new BaseAPIService({ Client, ...options });
    }

    public static getInstance(options: APIClientsConstructor): AppClients {
        if (AppClients.instanceName !== options.name) {
            AppClients.instance = new AppClients(options);
        }

        return AppClients.instance;
    }
};