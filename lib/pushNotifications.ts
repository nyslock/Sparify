import { supabase } from './supabaseClient';

// VAPID public key - you need to generate this and set up the private key in your Edge Function
// Generate using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BAmDuVmhO2Hk1npoV5hg9IbAggKKRZIGX85UZEATQAp2SeQL8jCAFit4BN0frhtz8T7P4_Np_nHrAZjcs5KTshA';

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }
  return await Notification.requestPermission();
};

// Convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Register service worker and subscribe to push
export const subscribeToPush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push notifications not supported' };
    }

    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Check if VAPID key is configured
    if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
      console.warn('VAPID key not configured. Push subscriptions will not work.');
      return { success: false, error: 'Push not configured' };
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Push subscription:', subscription);

    // Save subscription to Supabase
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscription.toJSON(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

    if (error) {
      console.error('Error saving subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error subscribing to push:', err);
    return { success: false, error: err.message };
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from database
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error unsubscribing from push:', err);
    return { success: false, error: err.message };
  }
};

// Check if user is subscribed
export const isSubscribed = async (): Promise<boolean> => {
  try {
    if (!isPushSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

// Send a test notification (for debugging)
export const sendTestNotification = async (): Promise<void> => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Test Notification', {
    body: 'Push Notifications funktionieren!',
    icon: 'https://i.ibb.co/1fD3swCW/logo-tourquise-fade.png',
    vibrate: [100, 50, 100]
  });
};
