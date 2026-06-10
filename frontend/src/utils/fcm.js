import { httpsCallable } from 'firebase/functions';
import { functionsInstance } from '../lib/firebase';

export const sendPushNotification = async (notificationData) => {
    const { fcm_token, title, body, priority, type, notificationId } = notificationData;

    if (!fcm_token) {
        console.warn("[FCM] No FCM token provided, skipping push.");
        return;
    }

    try {
        const sendPush = httpsCallable(functionsInstance, 'sendpushnotification');
        const response = await sendPush({
            fcm_token,
            title,
            body,
            priority,
            type,
            notificationId
        });
        console.log('[FCM] Successfully sent push notification via Cloud Function:', response.data);
    } catch (error) {
        console.error('[FCM] Error sending push notification via Cloud Function:', error);
    }
};
