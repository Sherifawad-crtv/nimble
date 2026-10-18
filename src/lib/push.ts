// Web push on this device. The public VAPID key is not a secret: it only tells the browser which
// server may send to it. The matching private key lives in the database, never in the app.
const PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ??
  'BI-fmix7DnwHmSSblxmwsq01PjryNf25rhe5W-t0YhlQbyHxLmFUvxk-R2RPosfOgEPuZKMfHJHgYOR6sZ547AU';

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export interface PushDevice {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const SW_URL = '/push-sw.js';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64Url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const toDevice = (sub: PushSubscription): PushDevice => {
  const j = sub.toJSON();
  return { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' };
};

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SW_URL);
  return navigator.serviceWorker.ready;
}

/** The subscription this device currently holds, if any. */
async function current(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  // iPhone and iPad only deliver push to an app added to the Home Screen.
  if (isIOS() && !standalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' && (await current()) ? 'on' : 'off';
}

/** Must run from a tap: asks permission, subscribes this device, and hands it to `save`. */
export async function enablePush(save: (device: PushDevice) => Promise<void>): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  await save(toDevice(sub));
  return 'on';
}

export async function disablePush(remove: (endpoint: string) => Promise<void>): Promise<void> {
  const sub = await current();
  if (!sub) return;
  await remove(sub.endpoint);
  await sub.unsubscribe();
}

/** Signing out of a shared phone must not leave the next person's notifications going to this one. */
export async function forgetDevice(remove: (endpoint: string) => Promise<void>): Promise<void> {
  try {
    await disablePush(remove);
  } catch {
    /* offline or never subscribed: nothing more to do */
  }
}

/** Whether the service worker file is ours (the retired app-shell worker is removed elsewhere). */
export const isPushWorker = (r: ServiceWorkerRegistration) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith(SW_URL) ?? false;
