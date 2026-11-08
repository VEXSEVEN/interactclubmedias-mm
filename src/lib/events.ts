import { push, ref, set } from "firebase/database";
import { db } from "./firebase";
import type { EventType } from "./types";

/** Scrie un eveniment (livrat in inbox + push FCM prin Cloud Function). target: _all | _teams | _stations | <teamId> */
export async function sendEvent(target: string, e: { type: EventType; title: string; body: string; from?: string }) {
  const r = push(ref(db, `events/${target}`));
  await set(r, { ...e, ts: Date.now() });
  return r.key;
}
