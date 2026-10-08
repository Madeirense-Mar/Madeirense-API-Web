import { 
    type Orders
} from '@Madeirense/database';

import { 
    type restaurantOrderType
} from '@Madeirense/shared';

import AppEmitter from './emitter';

import * as pushNotificationController from '../controllers/pushNotifications';

import * as emailController from '../controllers/emails';

import type { 
    eventActionType
} from './types';

// ***************************************************************************************************************

type eventType = `order${('' | `.${keyof restaurantOrderType}`)}.${eventActionType}`;

const OrderEventEmitter = new AppEmitter<Partial<{ prev_courier_id: number }> & restaurantOrderType, eventType>();

OrderEventEmitter.on('order.courier_id.updated', async ({ prev_courier_id = null, ...order }) => {
    try {
        pushNotificationController.push<Partial<Orders>>(
            order.user_id as number,
            {
                notificationId: !prev_courier_id ? 'MXP$ORDER_DRIVER_ASSIGNATION' : 'MXP$ORDER_DRIVER_REASSIGNATION',
                data: order as Partial<Orders>
            }
        );

        pushNotificationController.BATCH$pushToStaff<Partial<Orders>>(
            {
                notificationId: !prev_courier_id ? 'MXP$ORDER_DRIVER_ASSIGNATION' : 'MXP$ORDER_DRIVER_REASSIGNATION',
                data: order as Partial<Orders>
            }
        );
    } catch (error) {
        console.error(`Failed to push order driver ${prev_courier_id ? 're' : ''}assignation notification:`, error);
    }
});

OrderEventEmitter.on('order.coupon_id.created', async ({ coupon_id, status, order_id }) => {
    try {
        pushNotificationController.BATCH$pushToStaff<Partial<Orders>>(
            {
                notificationId: 'MXP$ORDER_COUPON_USE',
                data: { coupon_id, status, order_id } as Partial<Orders>
            }
        );
    } catch (error) {
        console.error(`Failed to push order coupon usage notification:`, error);
    }
});

OrderEventEmitter.on('order.status.updated', async (order) => {
    try {
        pushNotificationController.push<Partial<Orders>>(
            order.user_id as number,
            {
                notificationId: 'MXP$ORDER_STATUS_UPDATE',
                data: order as Partial<Orders>
            }
        );

        pushNotificationController.BATCH$pushToStaff<Partial<Orders>>(
            {
                notificationId: 'MXP$ORDER_STATUS_UPDATE',
                data: order as Partial<Orders>
            }
        );

        // Only confirmed / assigned / delivered / cancelled produce an e-mail — see emailOrderStatus.
        if (order.order_id) void emailController.emailOrderStatus(order.order_id as number);
    } catch (error) {
        console.error('Failed to push order status update notification:', error);
    }
});

OrderEventEmitter.SILENT$on('order.created', async () => {
    try {
        pushNotificationController.BATCH$pushToStaff<any>(
            {
                notificationId: 'MXP$ORDER_INSERT',
                data: undefined
            }
        );
    } catch (error) {
        console.error(`Failed to push order update notification:`, error);
    }
});

export default OrderEventEmitter;