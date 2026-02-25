import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { initializeFirebase, getFCMToken, onForegroundMessage } from './firebase';
import {
  isNativePlatform,
  getPlatform,
  initializeNativePush,
  unregisterNativePush,
  checkNativePermissions
} from './nativePushNotifications';

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
  const [currentDeviceToken, setCurrentDeviceToken] = useState<string | null>(null);

  // Check support for notifications (native or web)
  useEffect(() => {
    const checkSupport = async () => {
      // Check if running on native platform (iOS/Android via Capacitor)
      if (isNativePlatform()) {
        const platform = getPlatform();
        console.log('Running on native platform:', platform);
        setIsSupported(true);
        
        // Check current permissions on native
        const hasPermission = await checkNativePermissions();
        setIsPermissionGranted(hasPermission);
        return;
      }
      
      // Web platform - check browser support
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      const hasBasicSupport = 
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      // iOS web only supports notifications in PWA standalone mode
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
      // Check if token already exists for this user
      const { data: existingTokens } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('token', token)
        .maybeSingle();

      // If token doesn't exist, insert it
      if (!existingTokens) {
        const { error: insertError } = await supabase
          .from('fcm_tokens')
          .insert({
            user_id: currentUserId,
            token: token,
          });

        if (insertError) {
          console.error('Error saving FCM token:', insertError);
          throw insertError;
        }
      }
      
      // Store current device token in state
      setCurrentDeviceToken(token);
    } catch (err: any) {
      console.error('Error saving token:', err);
      throw err;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
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
      // Native platform (iOS/Android)
      if (isNativePlatform()) {
        console.log('Requesting native push permissions for platform:', getPlatform());
        
        const result = await initializeNativePush(userId, onNotificationReceived);
        
        if (!result.success) {
          setError(result.error || 'Failed to enable notifications');
          setIsPermissionGranted(false);
          setIsLoading(false);
          return;
        }
        
        setIsPermissionGranted(true);
        console.log('Native push notifications enabled successfully');
        setIsLoading(false);
        return;
      }
      
      // Web platform - check for iOS not in standalone mode
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      if (isIOS && !isStandalone) {
        setError('Install this app to your home screen first: Safari → Share → Add to Home Screen');
        setIsLoading(false);
        return;
      }

      // Web platform - use Firebase
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
      console.log('Web push notifications enabled successfully');
    } catch (err: any) {
      console.error('Error setting up notifications:', err);
      setError(err.message || 'Error setting up notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId, saveFCMTokenToSupabase, onNotificationReceived]);

  // Auto-registration when user logs in (only if permission already granted)
  useEffect(() => {
    if (!userId || !isSupported) return;

    const checkTokenStatus = async () => {
      // Native platform
      if (isNativePlatform()) {
        const hasPermission = await checkNativePermissions();
        setIsPermissionGranted(hasPermission);
        return;
      }
      
      // Web platform
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'granted') {
        try {
          initializeFirebase();
          const token = await getFCMToken();
          
          if (token) {
            const { data: existingToken } = await supabase
              .from('fcm_tokens')
              .select('id')
              .eq('user_id', userId)
              .eq('token', token)
              .maybeSingle();
            
            if (existingToken) {
              setIsPermissionGranted(true);
              setCurrentDeviceToken(token);
            } else {
              setIsPermissionGranted(false);
            }
          } else {
            setIsPermissionGranted(false);
          }
        } catch (err) {
          console.error('Error checking token status:', err);
          setIsPermissionGranted(false);
        }
      } else {
        setIsPermissionGranted(false);
      }
    };
    
    checkTokenStatus();
  }, [userId, isSupported]);

  // Set up foreground message listener (web only - native handles this internally)
  useEffect(() => {
    if (!isPermissionGranted || !onNotificationReceived || isNativePlatform()) return;

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
