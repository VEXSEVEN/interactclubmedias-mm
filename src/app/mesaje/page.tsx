"use client";
import { useEffect } from "react";
import { Button, Glass } from "glisse";
import { useInbox } from "@/lib/inbox";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const when = (ts: number) => new Date(ts).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function MesajePage() {
  const { user, profile } = useAuth();
  const { events, isRead, markAllRead } = useInbox();

  // marcheaza ca citite dupa ce se vad (ramane vizibil ca nou in aceasta deschidere)
  useEffect(() => {
    const t = setTimeout(markAllRead, 1500);
    return () => clearTimeout(t);
  }, [events.length, markAllRead]);

  if (!user || (profile?.role !== "team" && profile?.role !== "station"))
    return (
      <Glass className="card stack center">
        <h2>Mesaje</h2>
        <p className="muted">Mesajele de la organizatori apar aici după ce te conectezi în aplicație.</p>
        <Link href="/jucator"><Button  >Conectează-te</Button></Link>
      </Glass>
    );

  return (
    <>
      <h1>Mesaje</h1>
      <div className="list">
        {events.map((e) => (
          <Glass className="card stack msg" key={e.id}>
            <div className="row between">
              <strong>{!isRead(e.id) && <span className="unread" aria-label="nou" />}{e.title}</strong>
              <span className="helper">{when(e.ts)}</span>
            </div>
            <p style={{ whiteSpace: "pre-wrap" }}>{e.body}</p>
            {e.type === "message" && e.from && <span className="helper">de la {e.from}</span>}
          </Glass>
        ))}
        {!events.length && <p className="muted center">Nu ai mesaje încă.</p>}
      </div>
    </>
  );
}
