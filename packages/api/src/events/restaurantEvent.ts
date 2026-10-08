import { 
    type restaurantEventType
} from '@Madeirense/shared';

import AppEmitter from './emitter';

import * as pushNotificationController from '../controllers/pushNotifications';

import * as emailController from '../controllers/emails';

import type { 
    eventActionType
} from './types';

// ***************************************************************************************************************

type eventType = `restaurant_event${('' | `.${keyof restaurantEventType}`)}.${eventActionType}`;

const RestaurantEventsEventEmitter = new AppEmitter<restaurantEventType, eventType>();

RestaurantEventsEventEmitter.on('restaurant_event.created', async (restaurant_event) => {
    try {
        pushNotificationController.BATCH$pushAll<Partial<restaurantEventType>>(
            {
                notificationId: 'MXP$APP_PROPERTY$Restaurant_Events$INSERT',
                data: { ...restaurant_event, property_id: restaurant_event.event_id }
            }
        );
    } catch (error) {
        console.error(`Failed to push inserted restaurant event:`, error);
    }
});

RestaurantEventsEventEmitter.on('restaurant_event.updated', async (restaurant_event) => {
    try {
        pushNotificationController.BATCH$pushAll<Partial<restaurantEventType>>(
            {
                notificationId: 'MXP$APP_PROPERTY$Restaurant_Events$UPDATE',
                data: { ...restaurant_event, property_id: restaurant_event.event_id }
            }
        );
    } catch (error) {
        console.error(`Failed to push updated restaurant event:`, error);
    }
});

RestaurantEventsEventEmitter.on('restaurant_event.deleted', async (restaurant_event) => {
    try {
        pushNotificationController.BATCH$pushAll<Partial<restaurantEventType>>(
            {
                notificationId: 'MXP$APP_PROPERTY$Restaurant_Events$DELETE',
                data: { ...restaurant_event, property_id: restaurant_event.event_id }
            }
        );
    } catch (error) {
        console.error(`Failed to push deleted restaurant event:`, error);
    }
});

// Emitted only by controllers/restaurantEvent.ts#cancelRestaurantEvent (not by
// regular edits), so ticket holders get exactly one cancellation e-mail.
RestaurantEventsEventEmitter.on('restaurant_event.status.updated', async (restaurant_event) => {
    if (restaurant_event.status !== 'cancelled') return;

    void emailController.emailEventCancelled(restaurant_event.event_id);
});

export default RestaurantEventsEventEmitter;