export namespace API$Enumerators {
    export enum Actions {
        "DELETE" = "DELETE",
        "FETCH" = "FETCH",
        "INSERT" = "INSERT",
        "UPDATE" = "UPDATE"
    }

    export enum BatchActions {
        "expire" = "expire",
        "renew" = "renew",
        "update" = "update"
    }

    export enum Headers {
        "api-key" = "x-api-key",
        "locale" = "x-locale",
        "platform" = "x-platform",
        "request-id" = "x-request-id",
    }

    export enum LogEntries {
        "error" = "error",
        "request" = "request",
        "response" = "response",
        "url" = "url"
    }

    export enum Platforms {
        "mobile" = "mobile",
        "web" = "web",
        /**Meant to be for API calls sent via service scripts ran on the machine.*/
        "service" = "service",
    }

    export enum SearchQueries {
        "format" = "format",
        "limit" = "limit",
        "page" = "page",
        "search" = "search"
    }
};