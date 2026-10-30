import {
    APIService,
    ClientRequestService,
} from "@Madeirense/shared";

import { CrossPlatformStorageManager } from "services/storage/managers";

import AuthenticationEndpoints from "./endpoints/authentication";
import CartEndpoints from "./endpoints/cart";
import CommentsEndpoints from "./endpoints/comments";
import CouponsEndpoints from "./endpoints/coupons";
import CourierPositionsEndpoints from "./endpoints/courierPositions";
import DeliveryLocationsEndpoints from "./endpoints/deliveryLocations";
import GlobalSettingsEndpoints from "./endpoints/globalSettings";
import LegalEndpoints from "./endpoints/legal";
import OrdersEndpoints from "./endpoints/orders";
import PaymentsEndpoints from "./endpoints/payments";
import ProductsEndpoints from "./endpoints/products";
import PushNotificationsEndpoints from "./endpoints/pushNotifications";
import ResortsEndpoints from "./endpoints/resorts";
import RestaurantsEndpoints from "./endpoints/restaurants";
import RestaurantEventsEndpoints from "./endpoints/restaurantEvents";
import ReviewsEndpoints from "./endpoints/reviews";
import StatisticsEndpoints from "./endpoints/statistics";
import UsersEndpoints from "./endpoints/users";

import type {
    APIServiceConstructorType
} from "@Madeirense/shared";

// ***************************************************************************************************************

/**
 * # BaseAPI Service
 * 
 * - Version: `1.0`
 * - Author: **SPKTR**
 *   - _Roberto César Ferreira de Carvalho_
 * 
 * ---
 * 
 * This class is responsible for performing web requests, it achieves this by using the `fetch` API. it's meant to be a lightweight and flexible abstraction for API client construction use.
 * Use this as a base example on how to use the {@link APIService} class to create your API client.
 * 
 * ---
 * 
 * @see {@link ClientRequestService | The parent  class definition for more information about the request service. }
 */
class BaseAPIService extends APIService {
    private client: ClientRequestService;
    private storage?: CrossPlatformStorageManager;

    public endpoints;

    constructor(options: APIServiceConstructorType) {
        super(options);

        this.client = this.getClient();

        this.endpoints = {
            "authentication"    : new AuthenticationEndpoints(this.client, this.storage),
            "carts"             : new CartEndpoints(this.client, this.storage),
            "comments"          : new CommentsEndpoints(this.client, this.storage),
            "coupons"           : new CouponsEndpoints(this.client, this.storage),
            "courier-positions" : new CourierPositionsEndpoints(this.client, this.storage),
            "delivery-locations": new DeliveryLocationsEndpoints(this.client, this.storage),
            "global-settings"   : new GlobalSettingsEndpoints(this.client, this.storage),
            "legal"             : new LegalEndpoints(this.client, this.storage),
            "orders"            : new OrdersEndpoints(this.client, this.storage),
            "payments"          : new PaymentsEndpoints(this.client, this.storage),
            "products"          : new ProductsEndpoints(this.client, this.storage),
            "push-notifications": new PushNotificationsEndpoints(this.client, this.storage),
            "resorts"           : new ResortsEndpoints(this.client, this.storage),
            "restaurants"       : new RestaurantsEndpoints(this.client, this.storage),
            "restaurant-events" : new RestaurantEventsEndpoints(this.client, this.storage),
            "reviews"           : new ReviewsEndpoints(this.client, this.storage),
            "statistics"        : new StatisticsEndpoints(this.client, this.storage),
            "users"             : new UsersEndpoints(this.client, this.storage),
        }
    }    
};

export default BaseAPIService;