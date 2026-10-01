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
        "locale" = "x-locale",
        "platform" = "x-platform"
    }

    export enum LogEntries {
        "error" = "error",
        "request" = "request",
        "response" = "response",
        "url" = "url"
    }

    export enum Platforms {
        "mobile" = "mobile",
        "web" = "web"
    }

    export enum SearchQueries {
        "format" = "format",
        "limit" = "limit",
        "page" = "page",
        "search" = "search"
    }
};