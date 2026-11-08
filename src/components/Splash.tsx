"use client";
import { useEffect, useState } from "react";

/** Ecran negru de incarcare pana cand tot (autentificare, setari, date) e gata. */
export default function Splash({ ready, title }: { ready: boolean; title: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 450);
    return () => clearTimeout(t);
  }, [ready]);
  if (gone) return null;
  return (
    <div className={`splash ${ready ? "out" : ""}`} role="status" aria-live="polite">
      <svg className="splash-logo" viewBox="0 0 120 120" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" aria-hidden>
        <circle cx="52" cy="52" r="34" />
        <path d="M78 78 L104 104" />
      </svg>
      <strong>{title}</strong>
      <div className="splash-bar"><i /></div>
      <span>Se încarcă…</span>
    </div>
  );
}
