import { ref, set } from "firebase/database";
import { db } from "./firebase";

export const canNotify = () => typeof window !== "undefined" && "Notification" in window;

export async function askPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return "denied";
  return Notification.requestPermission();
}

export async function showNotification(title: string, body: string, tag?: string) {
  if (!canNotify() || Notification.permission !== "granted") return false;
  const opts = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

export const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Inregistreaza push FCM (notificari cu aplicatia inchisa). Necesita Cloud Functions deployate (vezi functions/). */
export async function registerPush(info: { role: string; teamId?: string; stationId?: string }): Promise<boolean> {
  if (!canNotify() || Notification.permission !== "granted") return false;
  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) {
      console.warn("FCM push isSupported returned false (browser/PWA incompatibil)");
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
    const token = await getToken(getMessaging(), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) {
      console.warn("Nu s-a putut obtine token-ul FCM (getToken a intors null)");
      return false;
    }
    const rec: Record<string, unknown> = { ts: Date.now(), role: info.role };
    if (info.teamId) rec.teamId = info.teamId;
    if (info.stationId) rec.stationId = info.stationId;
    await set(ref(db, `pushTokens/${token}`), rec);
    return true;
  } catch (e) {
    console.error("Eroare la inregistrare push notificari:", e);
    return false;
  }
}
