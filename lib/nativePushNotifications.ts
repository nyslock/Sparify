/**
 * Native Push Notifications for iOS/Android using Capacitor
 * Integrates with existing Firebase Cloud Messaging backend
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

/**
 * Check if running on a native platform (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform name
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Initialize native push notifications for iOS/Android
 * @param userId - User ID to associate the FCM token with
 * @param onNotificationReceived - Callback for received notifications
 */
export const initializeNativePush = async (
  userId: string,
  onNotificationReceived?: (notification: PushNotificationSchema) => void
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isNativePlatform()) {
      return { success: false, error: 'Not running on native platform' };
    }

    // Request permission
    const permissionResult = await PushNotifications.requestPermissions();
    
    if (permissionResult.receive === 'denied') {
      return { success: false, error: 'Push notification permission denied' };
    }

    if (permissionResult.receive !== 'granted') {
      return { success: false, error: 'Push notification permission not granted' };
    }

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();

    // Listen for registration success
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      
      // Save FCM token to Supabase
      await saveFCMTokenToSupabase(token.value, userId);
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // Listen for notifications received while app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listen for notification actions (when user taps notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      
      if (onNotificationReceived) {
        onNotificationReceived(action.notification);
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error initializing native push:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save FCM token to Supabase database
 */
const saveFCMTokenToSupabase = async (token: string, userId: string): Promise<void> => {
  try {
    const { data: existingToken } = await supabase
      .from('fcm_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .maybeSingle();

    if (!existingToken) {
      const { error } = await supabase
        .from('fcm_tokens')
        .insert({
          user_id: userId,
          token: token,
        });

      if (error) {
        console.error('Error saving FCM token:', error);
        throw error;
      }

      console.log('FCM token saved to database');
    } else {
      console.log('FCM token already exists in database');
    }
  } catch (error) {
    console.error('Error in saveFCMTokenToSupabase:', error);
    throw error;
  }
};

/**
 * Get list of currently delivered notifications
 */
export const getDeliveredNotifications = async (): Promise<PushNotificationSchema[]> => {
  if (!isNativePlatform()) {
    return [];
  }

  const result = await PushNotifications.getDeliveredNotifications();
  return result.notifications;
};

/**
 * Remove all delivered notifications
 */
export const removeAllDeliveredNotifications = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  await PushNotifications.removeAllDeliveredNotifications();
};

/**
 * Unregister from push notifications
 */
export const unregisterNativePush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isNativePlatform()) {
      return { success: false, error: 'Not running on native platform' };
    }

    // Remove all listeners
    await PushNotifications.removeAllListeners();

    // Get current token and remove from database
    // Note: There's no direct way to get the current token, so we'll just delete all tokens for this user
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing FCM tokens:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error unregistering native push:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if notifications are enabled for the app
 */
export const checkNativePermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const result = await PushNotifications.checkPermissions();
    return result.receive === 'granted';
  } catch {
    return false;
  }
};
