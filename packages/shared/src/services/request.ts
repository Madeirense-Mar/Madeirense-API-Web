import {
    DEFAULT_API_CLIENT_DEBUG_OPTIONS
} from '../utilities/constants.js';

import { APIError } from './error.js';

import type { valuePair } from 'types';

import type {
    API$Types,
    authenticationCredentialsType,
    serviceConstructorOptionsType,
    tokenObjectType,
} from './types.js';

// ***************************************************************************************************************

export type APIServiceConstructorType = serviceConstructorOptionsType<{
    Client: ClientRequestService
}>;

/**
 * # Client Request Service
 * 
 * - Version: `1.0`
 * - Author: **SPKTR**
 *   - _Roberto César Ferreira de Carvalho_
 * 
 * ---
 * 
 * ## Meta
 * 
 * The current version supports:
 * 
 * - Web requests
 *   - REST (content-type: "application/json").
 *     - GET
 *     - POST
 *     - PATCH
 *     - DELETE
 *   - SOAP (content-type: "text/xml").
 * 
 * - Request logging
 *   - Pre-flight
 *   - Post-response
 * 
 * - Request authentication
 *   - Basic authentication (username:password) encoded to base64 using the default {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa | `btoa` method}.
 *   - Token bearer
 * 
 * ---
 * 
 * ## Overview
 * 
 * This class is responsible for performing web requests, it achieves this by using the `fetch` API. it's meant to be a lightweight and flexible abstraction for API client construction use.
 * 
 * On instantiation, a class object is created with a {@link baseURL}, this is added as a prefix to every subsequent request. That is to say, if the base URL is `https://www.somedomain.com/api/v1` then every `endpoint` request sent with this class will be appended to iPayload, _i.e.: a normal `GET` to the endpoint `/posts` request will be sent to `https://www.somedomain.com/api/v1/post`_.
 * 
 * When a request is made, regardless of the media type being returnePayload, the data is extracted (alongside any other property) and encapsulated as an {@link API$Types.response} object. By defaulPayload, requests send and expect the `application/json` media type, besides `text/xml` other alternatives should be specified via the `option` parameter in the {@link ClientRequestService.request | request method } and an implementation is necessary to handle that case.
 * 
 * If the request results in a the property `result.ok` being `false`, then an {@link APIError} exception is thrown by defaulPayload, this is to standardize errors across the app and it enable handlers to gracefully deal with, at leasPayload, a predictable pattern.
 * 
 * ---
 * 
 * @see  {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch | Check the `fetch` API for more information about how this class works. }
*/
export class ClientRequestService {
    private baseURL: string;
    private httpMethod?: string;

    private defaultHeaders: Record<string, string>;
    private credentials: authenticationCredentialsType | null = null;

    private refreshToken: string | null = null;
    private sessionToken: string | null = null;

    private DEBUG: Partial<API$Types.debugOptions>;

    constructor({
        baseURL,
        defaultHeaders,
        DEBUG = DEFAULT_API_CLIENT_DEBUG_OPTIONS,
    }: serviceConstructorOptionsType<{
        baseURL: string
    }>) {
        this.baseURL = baseURL;
        this.defaultHeaders = defaultHeaders ?? {};

        this.DEBUG = {
            ...DEBUG,
            logs: {
                ...DEFAULT_API_CLIENT_DEBUG_OPTIONS.logs,
                ...DEBUG.logs
            }
        };

        this.initialize();
    }

    private async initialize(): Promise<void> {
        //TODO (If applicable): Make pre-request or any other necessary work before proceeding with making requests.
    }

    /**
     * Add a properties to {@link ClientRequestService.defaultHeaders | defaultHeaders}.
     * @param {object[]} properties - A key/value object with string values for both key & value.
     */
    addHeaderProperties(...properties: valuePair<string, string>[]) {
        properties.forEach(prop => this.defaultHeaders = {
            ...this.defaultHeaders,
            ...prop
        });
    }

    buildParams(data: Record<string, string | string[]>) {
        const params = new URLSearchParams();

        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
            } else {
                params.append(key, value);
            }
        });

        return params;
    }

    extendBaseURL(endpoint: string): void {
        this.baseURL = [
            this.baseURL,
            endpoint
        ].join()
    }

    getAuthenticationCredentials = () => this.credentials;

    getBaseURL = () => this.baseURL;

    private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this.defaultHeaders,
            ...customHeaders,
        };

        if (this.credentials) {
            headers.Authorization = `Basic ${btoa(`${this.credentials.email}:${this.credentials.password}`)}`;
        }

        if (this.sessionToken) {
            headers.Authorization = `Bearer ${this.sessionToken ?? this.refreshToken}`;
        }

        return headers;
    }

    setAuthenticationCredentials(credentials: authenticationCredentialsType): void {
        this.credentials = credentials;
    }

    setToken({ sessionToken, refreshToken }: Partial<tokenObjectType> = {}): void {
        this.sessionToken = sessionToken ?? null;
        this.refreshToken = refreshToken ?? null;
    }

    private async request<ResponseData, ErrorCode extends string = "">(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        const url = `${this.baseURL}${endpoint}`;

        if (this.DEBUG.logs?.url) console.log({ url });

        const { headers: defaultHeaders, ...o } = options;

        const config: RequestInit = {
            credentials: 'include',
            headers: this.getHeaders(defaultHeaders as Record<string, string>),
            ...o,
        };

        const response = await fetch(url, config);
        if (this.DEBUG.logs?.response) console.log({ response });

        const contentType = response.headers.get('content-type') ?? "";

        let responseData: any;

        switch (true) {
            case (contentType.includes('application/json')):
                responseData = {
                    ...(await response.json() as object),
                    httpStatus: response.status
                };

                break;

            case (contentType.includes('text/xml')):
                responseData = {
                    data: await response.text(),
                    httpStatus: response.status,
                    success: true
                };

                break;

            // TODO (If applicable): Implement methods to extract data from other media types as needed.
            // For now anything other then a `JSON` `REST` request will be passed as text;
            default:
                responseData = {
                    data: null,
                    message: await response.text(),
                    httpStatus: response.status,
                    success: false
                };

                break;
        }

        if (!response.ok) {
            if (this.DEBUG.logs?.response) console.error(JSON.stringify(response));

            throw new APIError<ResponseData, ErrorCode>(
                {
                    message: responseData.message || `HTTP ${response.status}: ${response.statusText}`,
                    method: options.method || this.httpMethod,
                    code: responseData?.code || 'HTTP_ERROR',
                    status: response.status,
                    endpoint,
                },
                {
                    success: false,
                    ...responseData
                }
            );
        }

        return responseData as API$Types.response<ResponseData, ErrorCode>;
    }

    /**
     * ## {@link ClientRequestService | `ClientRequestService`} DELETE
     * 
     * Deletes a resource at the supplied URL.
     * 
     * @param {string} endpoint The endpoint location of the resource appended to the {@link baseURL}.
     * @param {RequestInit} [options] Configuration object for the request. For more information check {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN's fetch `RequestInit` options documentation. }
     * @returns {API$Types.response} The supplied `data` and {@link API$Types.response.code | `API$Types.response.code` } types respectively.
     * 
     * ---
     * 
     * @see {@link API$Types.response | For more information check the api response definition.}
     */
    async delete<ResponseData, ErrorCode extends string = "">(
        endpoint: string,
        params: Record<string, (string | string[])> = {},
        options: RequestInit = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        this.httpMethod = "DELETE";

        const queryString = this.buildParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request<ResponseData, ErrorCode>(url, {
            method: this.httpMethod,
            ...options
        });
    }

    /**
     * ## {@link ClientRequestService | `ClientRequestService`} GET
     * 
     * Fetches the indicated resource at the supplied URL.
     * 
     * @param {string} endpoint The endpoint location of the resource appended to the {@link baseURL}.
     * @param {Object} [params] Query parameters applied to the `GET` request.
     * @param {(string | string[])} params.key The `key` property corresponds to any query property expected by your API$Types.
     * @param {RequestInit} [options] Configuration object for the request. For more information check {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN's fetch `RequestInit` options documentation. }
     * @returns {API$Types.response} The supplied `data` and {@link API$Types.response.code | `API$Types.response.code` } types respectively.
     * 
     * ---
     * 
     * @see {@link API$Types.response | For more information check the api response definition.}
     */
    async get<ResponseData, ErrorCode extends string = "">(
        endpoint: string, 
        params: Record<string, (string | string[])> = {}, 
        options: RequestInit = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        this.httpMethod = "GET";

        const queryString = this.buildParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request<ResponseData, ErrorCode>(url, {
            method: this.httpMethod,
            ...options
        });
    }

    /**
     * ## {@link ClientRequestService | `ClientRequestService`} POST
     * 
     * Creates a new request at the supplied URL.
     * 
     * @param {string} endpoint The endpoint location of the resource appended to the {@link baseURL}.
     * @param {*} data The content payload being sent to the server.
     * @param {RequestInit} [options] Configuration object for the request. For more information check {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN's fetch `RequestInit` options documentation. }
     * @returns {API$Types.response} The supplied `data` and {@link API$Types.response.code | `API$Types.response.code` } types respectively.
     * 
     * ---
     * 
     * @see {@link API$Types.response | For more information check the api response definition.}
     */
    async post<Payload, ResponseData, ErrorCode extends string = "">(
        endpoint: string,
        data: Payload,
        { params, ...options }: RequestInit & { params?: Record<string, (string | string[])> } = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        this.httpMethod = "POST";

        const queryString = (!params) ? undefined : this.buildParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request<ResponseData, ErrorCode>(url, {
            method: this.httpMethod,
            body: typeof data === "object" ? JSON.stringify(data) : data as BodyInit,
            ...options
        });
    }

    /**
     * ## {@link ClientRequestService | `ClientRequestService`} PATCH
     * 
     * Partially changes a resource at the supplied URL.
     * 
     * @param {string} endpoint The endpoint location of the resource appended to the {@link baseURL}.
     * @param {*} data The content payload being sent to the server.
     * @param {RequestInit} [options] Configuration object for the request. For more information check {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN's fetch `RequestInit` options documentation. }
     * @returns {API$Types.response} The supplied `data` and {@link API$Types.response.code | `API$Types.response.code` } types respectively.
     * 
     * ---
     * 
     * @see {@link API$Types.response | For more information check the api response definition.}
     */
    async patch<Payload, ResponseData, ErrorCode extends string = "">(
        endpoint: string,
        data: Payload,
        { params, ...options }: RequestInit & { params?: Record<string, (string | string[])> } = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        this.httpMethod = "PATCH";

        const queryString = (!params) ? undefined : this.buildParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request<ResponseData, ErrorCode>(url, {
            method: this.httpMethod,
            body: JSON.stringify(data),
            ...options
        });
    }

    /**
     * ## {@link ClientRequestService | `ClientRequestService`} PUT
     * 
     * Substitutes and returns a resource at the supplied URL.
     * 
     * @param {string} endpoint The endpoint location of the resource appended to the {@link baseURL}.
     * @param {*} data The content payload being sent to the server.
     * @param {RequestInit} [options] Configuration object for the request. For more information check {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | MDN's fetch `RequestInit` options documentation. }
     * @returns {API$Types.response} The supplied `data` and {@link API$Types.response.code | `API$Types.response.code` } types respectively. For more information check the {@link API$Types.response}.
     */
    async put<Payload, ResponseData, ErrorCode extends string = "">(
        endpoint: string,
        data: Payload,
        { params, ...options }: RequestInit & { params?: Record<string, (string | string[])> } = {}
    ): Promise<API$Types.response<ResponseData, ErrorCode>> {
        this.httpMethod = "PUT";

        const queryString = (!params) ? undefined : this.buildParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request<ResponseData, ErrorCode>(url, {
            method: this.httpMethod,
            body: JSON.stringify(data),
            ...options
        });
    }
};

export class APIService {
    private Client: ClientRequestService;

    constructor({
        Client,
        tokens,
        credentials,
    }: APIServiceConstructorType) {
        this.Client = Client;

        if (credentials) this.Client.setAuthenticationCredentials(credentials);
        if (tokens) this.Client.setToken(tokens);
    }

    getClient() { return this.Client }
};