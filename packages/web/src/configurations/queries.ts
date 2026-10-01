import {
    ClientRequestService,
    API$Types,
    Madeirense$Types
} from "@Madeirense/shared";

import env from "env";

import BaseAPIService from "services/api/base";

// ***************************************************************************************************************

type APIListType<Data> = API$Types.response<ReadonlyArray<Data>, "ERROR">;

export namespace Queries$Types {
    export type item = (
        | "booking"
        | "event"
        | "order"
        | "product"
        | "resort"
        | "restaurant"
        | "room"
        | "staff"
        | "user"
    );

    export type itemQueryKey = (
        | item
        | number
        | string
        | undefined
        | Madeirense$Types.searchQueryRecord
    );

    export type list = (
        | `${item}s`
        | "amenities"
        | "bed-types"
        | "bookings"
        | "cancellation-policies"
        | "comments"
        | "delisted-products"
        | "my-bookings"
        | "my-orders"
        | "rooms"
        | "staff"
        | "tickets"
    );

    export type queryKey = (
        | API$Types.paginationDescription
        | item
        | Madeirense$Types.searchQueryRecord
        | string
        | undefined
    );
};

export class Queries {
    private businessEndpoints: BaseAPIService["endpoints"];

    constructor(baseURL: string = `${env.API_URL}/v1`) {
        this.businessEndpoints = new BaseAPIService({
            Client: new ClientRequestService({
                baseURL
            })
        }).endpoints;
    }

    getItem = async <T>({ queryKey }: { queryKey: Queries$Types.queryKey[] }) => {
        const {
            "1": type,
            "2": identifier,
        } = queryKey;

        try {
            switch (type as Queries$Types.item) {
                case "booking":
                    return (await this.businessEndpoints.resorts.getBooking(identifier as number)) as T;
                case "event":
                    return (await this.businessEndpoints["restaurant-events"].get(identifier as number)) as T;
                case "order":
                    return (await this.businessEndpoints.orders.get(identifier as number)) as T;
                case "product":
                    return (await this.businessEndpoints.products.get(identifier as number)) as T;
                case "resort":
                    return (await this.businessEndpoints.resorts.getResort(identifier as number)) as T;
                case "restaurant":
                    return (await this.businessEndpoints.restaurants.get(identifier as number)) as T;
                case "staff":
                    return (await this.businessEndpoints.users.getStaffMember(identifier as number)) as T;
                case "user":
                    return (await this.businessEndpoints.users.get(identifier as number)) as T;

                default: return null;
            }
        } catch (error) {
            throw error;
        }
    }

    getList = async <T>({ queryKey }: { queryKey: Queries$Types.itemQueryKey[] }): Promise<APIListType<T>> => {
        const {
            "1": type,
            "2": query = undefined,
            "3": id = undefined
        } = queryKey;

        try {
            switch (type as Queries$Types.list) {
                case "amenities":
                    return (await this.businessEndpoints.resorts.getAmenities(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "bed-types":
                    return (await this.businessEndpoints.resorts.getBedTypes(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "bookings": {
                    if (!id) return {
                        code: "BAD_REQUEST",
                        data: [],
                        message: `Request wasn't sent because to get a list "${type}" requires an id of the parent to be fetched`,
                        success: false
                    }

                    else return (await this.businessEndpoints.resorts.getBookings(id as number, query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                }
                case "cancellation-policies":
                    return (await this.businessEndpoints.resorts.getBookingCancellationPolicies(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "comments":
                    return (await this.businessEndpoints.comments.getAll(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "delisted-products":
                    return (await this.businessEndpoints.products.getAllDelisted(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "events":
                    return (await this.businessEndpoints["restaurant-events"].getAll(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "my-bookings":
                    return (await this.businessEndpoints.resorts.getMyBookings(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "my-orders":
                    return (await this.businessEndpoints.orders.getMyOrders(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "orders":
                    return (await this.businessEndpoints.orders.getAll(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "products":
                    return (await this.businessEndpoints.products.getAll(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "resorts":
                    return (await this.businessEndpoints.resorts.getResorts(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "rooms": {
                    if (!id) return {
                        code: "BAD_REQUEST",
                        data: [],
                        message: `Request wasn't sent because to get a list "${type}" requires an id of the parent to be fetched`,
                        success: false
                    }

                    else return (await this.businessEndpoints.resorts.getRooms(id as number, query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                }
                case "staff":
                    return (await this.businessEndpoints.users.getStaff(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "tickets":
                    return (await this.businessEndpoints["restaurant-events"].getBoughtTickets(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;
                case "users":
                    return (await this.businessEndpoints.users.getAll(query as Madeirense$Types.searchQueryRecord)) as APIListType<T>;

                default: return {
                    code: "BAD_REQUEST",
                    data: [],
                    message: `Request wasn't sent because the type of item "${type}" isn't registered in this query client`,
                    success: false
                };
            }
        } catch (error) {
            throw error;
        }
    }
};

const ApplicationQueries = new Queries();

export default ApplicationQueries;