"use client";
import { useEffect, useState } from "react";
import { Button, Glass } from "glisse";
import { askPermission, canNotify, registerPush } from "@/lib/notify";
import { useStandalone } from "@/lib/pwa";
import type { Profile } from "@/lib/types";
import Icon from "./Icon";

/** In aplicatia instalata: cere direct permisiunea de notificari (pe iOS e nevoie de o atingere) si inregistreaza push-ul. */
export default function Onboarding({ profile }: { profile: Profile | null }) {
  const { standalone } = useStandalone();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("granted");
  const [later, setLater] = useState(false);
  const eligible = profile?.role === "team" || profile?.role === "station";
  const info = { role: profile?.role || "", teamId: profile?.teamId, stationId: profile?.stationId };

  useEffect(() => {
    setPerm(canNotify() ? Notification.permission : "unsupported");
    setLater(sessionStorage.getItem("imc_later") === "1");
  }, []);

  useEffect(() => {
    if (eligible && perm === "granted") registerPush(info);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, perm, profile?.teamId, profile?.stationId]);

  if (!standalone || !eligible || perm !== "default" || later) return null;
  return (
    <div className="overlay">
      <Glass className="card stack center onboard">
        <span className="logo"><Icon n="bell" size={26} /></span>
        <h2>Activează notificările</h2>
        <p className="muted">Primești o notificare când ți se adaugă punctaj, când se eliberează o stație și când organizatorii îți trimit un mesaj — chiar și cu aplicația închisă.</p>
        <Button variant="filled" onClick={async () => setPerm(await askPermission())}>Permite notificările</Button>
        <Button onClick={() => { sessionStorage.setItem("imc_later", "1"); setLater(true); }}>Mai târziu</Button>
      </Glass>
    </div>
  );
}
