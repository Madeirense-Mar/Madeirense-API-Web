import { API$Enumerators } from "./enumerators.js";

import { ApplicationStates } from "../utilities/enumerators.js";

// ***************************************************************************************************************

export type authenticationCredentialsType = {
    "email": string,
    "password": string
};

export type dependencyType = {
    essential: boolean,
    name: string,
    error?: string,
    endpoint: string,
    description: string,
    status: API$Types.status
};

export type platformType = keyof typeof API$Enumerators.Platforms;

export type serviceConstructorOptionsType<CustomOptions> = {
    defaultHeaders?: Record<string, string>,
    DEBUG?: Partial<API$Types.debugOptions>,
    credentials?: authenticationCredentialsType
    tokens?: Partial<tokenObjectType>,
} & CustomOptions;

export type tokenType = "session" | "refresh";
export type tokenObjectType = Record<`${tokenType}Token`, string>;

export type withTokens<T> = T & { tokens?: tokenObjectType };

export namespace API$Types {
    export type errorCode = (
        | `API_GENERIC${responseCode}`
        | `BAD_REQUEST`
        | `BANKA`
        | `FORBIDDEN`
        | `UNAUTHORIZED`
        | `UNIMPLEMENTED`
    );

    export type debugOptions = {
        logs: Partial<Record<(keyof typeof API$Enumerators.LogEntries), boolean>>,
    };

    export type listUpdateType<Adding = number, Removing = number> = {
        adding: Adding[],
        removing: Removing[],
    };

    export type paginationDescription = {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };

    export type response<T, customCode extends string = ""> = {
        success: boolean,
        message: string,
        data: T | null,
        httpStatus?: number,
        status?: status,
        code?: (
            | errorCode
            | customCode
        ),
        errors?: Record<
            (errorCode | customCode | string),
            string
        >[],
        pagination?: paginationDescription,
        tokens?: tokenObjectType,
        warnings?: Record<
            (errorCode | customCode | string),
            string
        >[],
    };

    type responseCode = (
        | responseErrorCode
        | '_SUCCESS'
    );

    type responseErrorCode = (
        | '_ERROR'
        | '_EMPTY_PARAMS_ERROR'
        | '_FETCH_ID_ERROR'
        | '_ID_ERROR'
        | '_ID_LIST_ERROR'
        | '_INSERT_ERROR'
        | '_NO_MATCH_ERROR'
        | '_NOT_FOUND_ERROR'
        | '_REQUIRED_FIELDS_ERROR'
        | '_UPDATE_ERROR'
    );

    export type status = keyof typeof ApplicationStates;

    export type versionType = `v${number}${("" | `-${number}`)}${("" | `-${number}`)}`;

    export type searchQueryRecord = Partial<Record<(keyof typeof API$Enumerators.SearchQueries), (string | string[])>>
};