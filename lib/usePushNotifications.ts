import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { initializeFirebase, getFCMToken, onForegroundMessage } from './firebase';

interface UsePushNotificationsProps {
  userId?: string | null;
  onNotificationReceived?: (payload: any) => void;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
}

/**
 * Hook for managing Web Push notifications via Firebase Cloud Messaging
 * 
 * @param userId - User ID in Supabase
 * @param onNotificationReceived - Callback for handling foreground notifications
 */
export const usePushNotifications = ({
  userId,
  onNotificationReceived,
}: UsePushNotificationsProps = {}): UsePushNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check browser support for notifications
  useEffect(() => {
    const checkSupport = () => {
      // Detect iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Check if running as PWA (standalone mode)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      // Basic feature detection
      const hasBasicSupport = 
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      // iOS only supports notifications in PWA standalone mode
      if (isIOS && !isStandalone) {
        setIsSupported(false);
        setError('On iPhone: Install this app to home screen for notifications (Safari → Share → Add to Home Screen)');
        return;
      }
      
      setIsSupported(hasBasicSupport);
      
      if (hasBasicSupport && Notification.permission === 'granted') {
        setIsPermissionGranted(true);
      }
    };

    checkSupport();
  }, []);

  // Save FCM token to Supabase
  const saveFCMTokenToSupabase = useCallback(async (token: string, currentUserId: string) => {
    try {
      const { data, error: upsertError } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: currentUserId,
            token: token,
          },
          {
            onConflict: 'user_id,token',
          }
        )
        .select();

      if (upsertError) {
        console.error('Error saving FCM token:', upsertError);
        throw upsertError;
      }
    } catch (err: any) {
      console.error('Error saving token:', err);
      throw err;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    // Check for iOS not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (isIOS && !isStandalone) {
      setError('Install this app to your home screen first: Safari → Share → Add to Home Screen');
      return;
    }
    
    if (!isSupported) {
      const msg = 'Notifications are not supported in this browser';
      setError(msg);
      return;
    }

    if (!userId) {
      const msg = 'User not authenticated';
      setError(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setError('Notification permission denied');
        setIsPermissionGranted(false);
        setIsLoading(false);
        return;
      }

      setIsPermissionGranted(true);

      initializeFirebase();

      const token = await getFCMToken();

      if (!token) {
        setError('Failed to get FCM token');
        setIsLoading(false);
        return;
      }

      await saveFCMTokenToSupabase(token, userId);
    } catch (err: any) {
      console.error('Error setting up notifications:', err);
      setError(err.message || 'Error setting up notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId, saveFCMTokenToSupabase]);

  // Auto-registration when user logs in (only if permission already granted)
  useEffect(() => {
    if (!userId || !isSupported) return;

    const currentPermission = Notification.permission;
    
    if (currentPermission === 'granted') {
      setIsPermissionGranted(true);
      requestPermission();
    } else {
      setIsPermissionGranted(false);
    }
  }, [userId, isSupported, requestPermission]);

  // Set up foreground message listener
  useEffect(() => {
    if (!isPermissionGranted || !onNotificationReceived) return;

    onForegroundMessage((payload) => {
      onNotificationReceived(payload);
    });
  }, [isPermissionGranted, onNotificationReceived]);

  return {
    isSupported,
    isPermissionGranted,
    isLoading,
    error,
    requestPermission,
  };
};
