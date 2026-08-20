
export namespace Madeirense$Enumerators {
    export namespace Pages {
        export enum App {
            "Layout" = "/",
            "Events" = "/events",
            "Order" = "/orders",
            "Product" = "/product",
            "Profile" = "/profile",
            "Policy" = "/policy",
            "Resort" = "/resort",
            "Welcome" = "/welcome",
            "Not Found" = "/404",
        }

        export enum Authentication {
            "Layout" = "/authentication",
            "Set Credentials" = "/authentication/set-credentials",
            "Success" = "/authentication/success",
        }

        export enum BackOffice {
            "Layout" = "/back-office",
            "Bookings" = "/back-office/resorts/bookings",
            "Deliveries" = "/back-office/deliveries",
            "Orders" = "/back-office/orders",
            "Products" = "/back-office/products",
            "Resort" = "/back-office/resorts",
            "Restaurant" = "/back-office/restaurants",
            "RestaurantEvent" = "/back-office/restaurants/party",
            "Requests" = "/back-office/requests",
            "Settings" = "/back-office/settings",
            "Staff" = "/back-office/staff"
        }

        export enum Checkout {
            "Layout" = "/checkout",
            "Events" = "/checkout/events",
            "Products" = "/checkout/products",
            "Resort" = "/checkout/resort",
        }
    }

    export enum SearchParameters {
        "id" = "id",
        "property" = "property",
        "status" = "status"
    }

    export enum SearchQueries {
        "amenities" = "amenities",
        "bed_types" = "bed_types",
        "courier_id" = "courier_id",
        "coupon_code" = "coupon_code",
        "event_id" = "event_id",
        "group_by" = "group_by",
        "group" = "group",
        "gt" = "gt",
        "price_per_night_gt" = "gt",
        "interval" = "interval",
        "limit" = "limit",
        "list" = "list",
        "lt" = "lt",
        "price_per_night_lt" = "lt",
        "month" = "month",
        "order_id" = "order_id",
        "product_id" = "product_id",
        "product_composition" = "product_composition",
        "product_type" = "product_type",
        "quantity" = "quantity",
        "rating" = "rating",
        "restaurant_id" = "restaurant_id",
        "roles" = "roles",
        "statuses" = "statuses",
        "status_type" = "status_type",
        "strict" = "strict",
        "type" = "type",
        "upcoming" = "upcoming",
        "user_id" = "user_id",
        "user_role" = "user_role",
        "year" = "year",
        "withRooms" = "withRooms"
    }

    export namespace StatisticsParameters {
        export enum Actions {
            'use' = 'use'
        };
        
        export enum Count {
            "all" = "all",
            "use" = "use",
            "orders" = "orders"
        }

        export enum Fact {
            "revenue" = "revenue"
        }
        // "count" = "count",
        // "orders" = "orders",
        // "revenue" = "revenue",
        // "top" = "top "
    }
};