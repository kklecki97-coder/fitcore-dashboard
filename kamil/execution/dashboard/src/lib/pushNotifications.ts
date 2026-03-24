import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// ── Helpers ──

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Public API ──

/** Check if push notifications are supported in this browser */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Get current permission state: 'granted' | 'denied' | 'default' */
export function getPushPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/** Check if the current user has an active push subscription stored in Supabase */
export async function isSubscribed(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  return subscription !== null;
}

/** Register the service worker (idempotent — safe to call multiple times) */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return registration;
}

/** Subscribe to push notifications and save subscription to Supabase */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      console.warn('[Push] Not supported in this browser');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VAPID_PUBLIC_KEY not configured');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied');
      return false;
    }

    // Get SW registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });

    // Extract keys
    const sub = subscription.toJSON();
    const endpoint = sub.endpoint;
    const keysP256dh = sub.keys?.p256dh;
    const keysAuth = sub.keys?.auth;

    if (!endpoint || !keysP256dh || !keysAuth) {
      console.error('[Push] Invalid subscription — missing endpoint or keys');
      return false;
    }

    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Push] No authenticated user');
      return false;
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        keys_p256dh: keysP256dh,
        keys_auth: keysAuth,
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return false;
    }

    console.log('[Push] Subscribed successfully');
    return true;
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    return false;
  }
}

/** Unsubscribe from push notifications and remove from Supabase */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }
    }

    console.log('[Push] Unsubscribed successfully');
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    return false;
  }
}
