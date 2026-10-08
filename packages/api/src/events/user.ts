import AppEmitter from './emitter';

import { 
    type Blocked_Users, 
    type Delivery_Locations, 
    type Push_Notification_Subscriptions, 
    type Users, 
    type Workstations
} from '@Madeirense/database';

import { 
    type driverType, 
    type staffMemberType
} from '@Madeirense/shared';

import * as pushNotificationController from '../controllers/pushNotifications';

import * as emailController from '../controllers/emails';

import type { 
    eventActionType
} from './types';

// ***************************************************************************************************************

type eventType = `user${('' | `.${keyof (userType)}`)}.${eventActionType}`;

type userType = Users & Partial<{
    Blocked_Users: Partial<Blocked_Users>;
    Delivery_Locations: Delivery_Locations[];
    Push_Notification_Subscriptions: (Partial<Push_Notification_Subscriptions>)[];
    Workstations: Partial<Workstations>[];
}>;

const UsersEventEmitter = new AppEmitter<userType, eventType>();

UsersEventEmitter.on('user.deleted', async (user) => {
    try {
        switch (user.user_role) {
            case 'Admin':
            case 'Staff':
                pushNotificationController.BATCH$pushToStaff<Partial<staffMemberType>>(
                    {
                        notificationId: 'MXP$BACK_OFFICE$Staff$DELETE',
                        data: user
                    }
                );

                break;

            case 'Driver':
                pushNotificationController.BATCH$pushAll<Partial<driverType>>(
                    {
                        notificationId: 'MXP$APP_PROPERTY$Drivers$DELETE',
                        data: { ...user, property_id: user.user_id }
                    }
                );

                break;

            default:
                break;
        }
    } catch (error) {
        console.error(`Failed to push deleted user:`, error);
    }
});

UsersEventEmitter.on('user.updated', async (user) => {
    try {
        switch (user.user_role) {
            case 'Admin':
            case 'Staff':
                pushNotificationController.BATCH$pushToStaff<Partial<staffMemberType>>(
                    {
                        notificationId: 'MXP$BACK_OFFICE$Staff$UPDATE',
                        data: user
                    }
                );

                break;

            case 'Driver':
                pushNotificationController.BATCH$pushAll<Partial<driverType>>(
                    {
                        notificationId: 'MXP$APP_PROPERTY$Drivers$UPDATE',
                        data: { ...user, property_id: user.user_id }
                    }
                );

                break;

            default:
                break;
        }
    } catch (error) {
        console.error(`Failed to push update user:`, error);
    }
});

UsersEventEmitter.on('user.created', async (user) => {
    if (user.user_role !== 'Customer') return;

    void emailController.emailWelcome(user.user_id);
});

export default UsersEventEmitter;