import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import api from './api';
import { SecureStorage } from './secureStorage';

// Create channel for Android
async function createChannel() {
    await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
    });
}
createChannel();

async function sendPushTokenToServer(token: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await api.post('/auth/push-token', { expo_push_token: token }); // Keep key 'expo_push_token' for now or update backend? User said "Backend change needed", so I assume backend expects 'expo_push_token' field but value will be FCM token.
      await SecureStorage.deleteItem('pending_push_token');
      return;
    } catch {
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  // Store for retry on next launch
  await SecureStorage.setItem('pending_push_token', token);
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    return null;
  }

  try {
      // Get FCM token
      const token = await messaging().getToken();

      // Register with backend
      await sendPushTokenToServer(token);

      return token;
  } catch (error) {
      if (__DEV__) console.error('FCM Token Error', error);
      return null;
  }
}

export async function retryPendingPushToken(): Promise<void> {
  const pending = await SecureStorage.getItem('pending_push_token');
  if (pending) {
    await sendPushTokenToServer(pending);
  }
}

export function setupForegroundHandler() {
    return messaging().onMessage(async remoteMessage => {
        if (remoteMessage.notification) {
             await notifee.displayNotification({
                title: remoteMessage.notification.title,
                body: remoteMessage.notification.body,
                android: {
                    channelId: 'default',
                    importance: AndroidImportance.HIGH,
                    smallIcon: 'ic_launcher', // customizable
                },
             });
        }
    });
}
