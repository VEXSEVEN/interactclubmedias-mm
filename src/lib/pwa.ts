"use client";
import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Jucatorii se pot loga doar in aplicatia instalata. `?browser=1` ocoleste (pentru test). */
export function browserAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(location.search).get("browser") === "1") localStorage.setItem("imc_allow_browser", "1");
    return localStorage.getItem("imc_allow_browser") === "1";
  } catch {
    return false;
  }
}

export function useStandalone(): { standalone: boolean; mounted: boolean } {
  const [s, setS] = useState({ standalone: false, mounted: false });
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const upd = () => setS({ standalone: isStandaloneNow() || browserAllowed(), mounted: true });
    upd();
    mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);
  return s;
}

/* ---- prompt-ul de instalare Android/desktop (beforeinstallprompt) ---- */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function captureInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function useInstallPrompt() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    available: !!deferred,
    install: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const r = await deferred.userChoice;
      deferred = null;
      listeners.forEach((l) => l());
      return r.outcome === "accepted";
    },
  };
}
