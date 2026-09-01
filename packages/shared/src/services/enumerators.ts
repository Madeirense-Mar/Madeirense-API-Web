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
        "platform" = "X-Platform",
    }

    export enum LogEntries {
        "error" = "error",
        "request" = "request",
        "response" = "response",
        "url" = "url"
    }

    export enum SearchQueries {
        "format" = "format",
        "limit" = "limit",
        "page" = "page",
        "search" = "search"
    }
};