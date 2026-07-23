/**
 * usePushNotifications
 *
 * Requests notification permissions, obtains an Expo push token,
 * persists it in AsyncStorage, and registers it with the backend.
 *
 * Requirements for real push delivery in Expo Go:
 *   1. Physical device (Android or iOS) — simulators cannot receive push.
 *   2. EXPO_PUBLIC_EAS_PROJECT_ID env var OR `extra.eas.projectId` in app.json.
 *      Create a free project at https://expo.dev and copy the project ID.
 *   3. User must be logged into the Expo Go app on their device.
 */

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUpsertPreferences } from '@workspace/api-client-react';

const PUSH_TOKEN_KEY = 'pushToken';
const DEVICE_ID_KEY = 'deviceId';

/** Obtain or generate a stable device ID. */
async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Returns the Expo push token for the device, or null if permissions
 * are denied or we are running on a simulator / web.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[PushNotifications] Must use a physical device for push notifications.');
    return null;
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PushNotifications] Permission not granted for push notifications.');
    return null;
  }

  // Resolve the EAS project ID
  const projectId: string | undefined =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.eas?.projectId as string | undefined ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      '[PushNotifications] No EAS project ID found. ' +
      'Set EXPO_PUBLIC_EAS_PROJECT_ID or add extra.eas.projectId in app.json. ' +
      'Create a free project at https://expo.dev to get one.',
    );
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    console.error('[PushNotifications] Failed to get push token:', err);
    return null;
  }
}

/**
 * Hook that runs on app startup to register the device's push token
 * with the backend if not already registered.
 */
export function usePushNotifications(): void {
  const upsertMutation = useUpsertPreferences();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const deviceId = await getOrCreateDeviceId();
        const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

        // If we already registered this token this session, skip.
        if (cachedToken) return;

        const token = await registerForPushNotificationsAsync();
        if (cancelled || !token) return;

        // Persist locally so we don't re-register on every launch.
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        // Register with the backend.
        upsertMutation.mutate({
          data: {
            deviceId,
            pushToken: token,
            // Don't clobber other preference fields — backend does partial update.
          },
        });

        console.log('[PushNotifications] Token registered:', token);
      } catch (err) {
        console.error('[PushNotifications] Startup registration error:', err);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
