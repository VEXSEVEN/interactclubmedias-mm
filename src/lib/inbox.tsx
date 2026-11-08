"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { limitToLast, onValue, query, ref } from "firebase/database";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { showNotification } from "./notify";
import { useToast } from "@/components/Toasts";
import type { AppEvent } from "./types";

interface InboxState {
  events: AppEvent[];
  unread: number;
  isRead: (id: string) => boolean;
  markAllRead: () => void;
}
const Ctx = createContext<InboxState>({ events: [], unread: 0, isRead: () => true, markAllRead: () => {} });
export const useInbox = () => useContext(Ctx);

const cap = (a: string[]) => a.slice(-300);

/**
 * Inbox global (sta montat intre pagini, deci schimbarea tab-urilor NU mai repeta notificari).
 * Fiecare eveniment are un id unic (cheia RTDB). Ce a fost deja notificat / citit se tine local, per cont:
 *  - eveniment aparut cat aplicatia e deschisa -> o singura notificare (toast + notificare de sistem, tag = id)
 *  - evenimente aparute cat aplicatia era inchisa -> NU se renotifica (le-a livrat deja push-ul); apar in inbox + un singur toast la deschidere
 */
export function InboxProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [byTarget, setByTarget] = useState<Record<string, AppEvent[]>>({});
  const [read, setRead] = useState<string[]>([]);
  const notified = useRef<Set<string>>(new Set());
  const loaded = useRef<Set<string>>(new Set());
  const catchup = useRef(0);
  const uid = user?.uid;

  const role = profile?.role;
  const targets = useMemo(() => {
    if (role === "team") return ["_all", "_teams", ...(profile?.teamId ? [profile.teamId] : [])];
    if (role === "station") return ["_all", "_stations"];
    return [];
  }, [role, profile?.teamId]);

  const key = uid ? `imc_inbox_${uid}` : "";
  useEffect(() => {
    notified.current = new Set();
    loaded.current = new Set();
    setByTarget({});
    setRead([]);
    if (!key) return;
    try {
      const st = JSON.parse(localStorage.getItem(key) || "{}") as { read?: string[]; notified?: string[] };
      setRead(st.read || []);
      notified.current = new Set(st.notified || []);
    } catch {}
  }, [key]);

  const persist = useCallback(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ read: cap(readRef.current), notified: cap([...notified.current]) }));
    } catch {}
  }, [key]);
  const readRef = useRef<string[]>([]);
  readRef.current = read;

  useEffect(() => {
    if (!key || !targets.length) return;
    const offs = targets.map((t) =>
      onValue(query(ref(db, `events/${t}`), limitToLast(60)), (snap) => {
        const list: AppEvent[] = [];
        snap.forEach((c) => {
          list.push({ ...(c.val() as Omit<AppEvent, "id" | "target">), id: c.key as string, target: t });
        });
        const live = loaded.current.has(t); // primul snapshot = ce exista deja (catch-up)
        loaded.current.add(t);
        let changed = false;
        for (const ev of list) {
          if (notified.current.has(ev.id)) continue;
          notified.current.add(ev.id);
          changed = true;
          if (live) {
            toast(`${ev.title} · ${ev.body}`, "info");
            showNotification(ev.title, ev.body, ev.id);
          } else catchup.current++;
        }
        if (!live && catchup.current > 0) {
          toast(catchup.current === 1 ? "Ai un mesaj nou." : `Ai ${catchup.current} mesaje noi.`, "info");
          catchup.current = 0;
        }
        if (changed) persist();
        setByTarget((s) => ({ ...s, [t]: list }));
      })
    );
    return () => offs.forEach((o) => o());
  }, [key, targets, persist, toast]);

  const events = useMemo(() => Object.values(byTarget).flat().sort((a, b) => b.ts - a.ts), [byTarget]);
  const readSet = useMemo(() => new Set(read), [read]);
  const markAllRead = useCallback(() => {
    setRead((r) => {
      const next = [...new Set([...r, ...events.map((e) => e.id)])];
      readRef.current = next;
      queueMicrotask(persist);
      return next;
    });
  }, [events, persist]);

  const value = useMemo(() => ({ events, unread: events.filter((e) => !readSet.has(e.id)).length, isRead: (id: string) => readSet.has(id), markAllRead }), [events, readSet, markAllRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
