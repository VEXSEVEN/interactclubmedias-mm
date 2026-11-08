"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Glass, TabBar } from "glisse";
import { useAuth } from "@/lib/auth";
import { useSettings, useVal } from "@/lib/db";
import { useInbox } from "@/lib/inbox";
import { captureInstallPrompt, useStandalone } from "@/lib/pwa";
import { applyTheme, cachedTheme, THEME_CACHE_KEY } from "@/lib/theme";
import Icon from "./Icon";
import { useDocks } from "./Docks";
import Onboarding from "./Onboarding";
import Splash from "./Splash";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = (usePathname() || "/").replace(/\/$/, "") || "/";
  const router = useRouter();
  const { user, profile, loading: authLoading, logout } = useAuth();
  const { settings, loading: setLoading, live } = useSettings();
  const { second } = useDocks();
  const { standalone, mounted } = useStandalone();
  const { unread } = useInbox();
  const teamsQ = useVal(user ? "teams" : null);
  const stationsQ = useVal(user ? "stations" : null);

  // ---- ecran de incarcare: pana cand auth + setari + date sunt gata (cu rezerva de timp) ----
  const [soft, setSoft] = useState(false);
  const [hard, setHard] = useState(false);
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setSoft(true), 3000);
    const b = setTimeout(() => setHard(true), 9000);
    const c = setTimeout(() => setMinDone(true), 700);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, []);
  const hasCache = !setLoading && !live;
  const settingsOk = live || (hasCache && soft) || hard;
  const dataOk = !user || (!teamsQ.loading && !stationsQ.loading) || hard;
  const ready = mounted && minDone && !authLoading && settingsOk && dataOk;

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    captureInstallPrompt();
  }, []);

  // tema din cache, inainte de primul desen; apoi cea live
  useLayoutEffect(() => {
    const c = cachedTheme();
    if (c) applyTheme(c);
  }, []);
  useEffect(() => {
    applyTheme(settings.theme);
    if (live) { try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(settings.theme)); } catch {} }
  }, [settings.theme, live]);

  useEffect(() => {
    // lumina care urmareste cursorul pe suprafetele de sticla
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".card, .panel, .stat, .hero") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);

  const role = profile?.role;
  const dashboard = path.startsWith("/organizator") || path.startsWith("/developer");
  const inboxLabel = (<span className="tablabel">Mesaje{unread > 0 && <b className="badge">{unread > 9 ? "9+" : unread}</b>}</span>);
  const T = {
    form: { value: "/", label: "Formular", icon: <Icon n="form" />, href: "/" },
    status: { value: "/status", label: "Status", icon: <Icon n="check" />, href: "/status" },
    player: { value: "/jucator", label: "Jucător", icon: <Icon n="user" />, href: "/jucator" },
    install: { value: "/install", label: "Instalează", icon: <Icon n="down" />, href: "/install" },
    inbox: { value: "/mesaje", label: inboxLabel, icon: <Icon n="bell" />, href: "/mesaje" },
    station: { value: "/statie", label: "Stație", icon: <Icon n="pin" />, href: "/statie" },
    org: { value: "/organizator", label: "Organizator", icon: <Icon n="sliders" />, href: "/organizator" },
    dev: { value: "/developer", label: "Dev", icon: <Icon n="code" />, href: "/developer" },
    staff: { value: "/login", label: "Staff", icon: <Icon n="key" />, href: "/login" },
  };
  const tabs =
    role === "developer" ? [T.form, T.station, T.org, T.dev]
    : role === "organizer" ? [T.form, T.station, T.org]
    : role === "station" ? [T.station, T.inbox]
    : role === "team" ? [T.player, T.inbox, T.status]
    : standalone ? [T.player, T.status, T.form, T.staff]
    : [T.form, T.status, T.install, T.staff];
  const current = tabs.find((t) => t.value === path)?.value ?? null;

  return (
    <div className="app">
      <Bg url={settings.bgUrl} />
      <main className={`page ${dashboard ? "wide" : ""}`}>{children}</main>

      <div className="docks">
        {dashboard ? (
          <>
            {second && (
              <div className="dock dock-second" key="second">
                <TabBar aria-label="Secțiuni panou" items={second.items} value={second.value} onValueChange={second.onChange} />
              </div>
            )}
            <Glass className="dock-aside" key="aside">
              <Button icon={<Icon n="back" size={20} />} aria-label="Înapoi la site" onClick={() => router.push("/")} />
              {user && <Button icon={<Icon n="out" size={20} />} aria-label="Deconectare" onClick={() => { logout(); router.push("/"); }} />}
            </Glass>
          </>
        ) : (
          <>
            <div className="dock dock-main">
              <TabBar aria-label="Pagini" items={tabs} value={current} link={Link} />
            </div>
            {user && (
              <Glass className="dock-aside">
                <Button icon={<Icon n="out" size={20} />} aria-label="Deconectare" onClick={() => logout()} />
              </Glass>
            )}
          </>
        )}
      </div>

      <Onboarding profile={profile} />
      <Splash ready={ready} title={settings.title} />
    </div>
  );
}

/**
 * Fundal: imagine proprie sau gradient din tema + pete in miscare.
 * `data-glisse-backdrop` face ca Glisse sa CLONEZE fundalul in fiecare sticla (refractie in toate browserele) —
 * greu pentru GPU-ul telefoanelor si cu o imagine mare face fundalul sa dispara la scroll. De aceea se foloseste
 * doar pe desktop (pointer fin) si fara imagine proprie; pe telefon Glisse indoaie fundalul viu (Chromium) sau pastreaza frost-ul.
 */
function Bg({ url }: { url: string }) {
  const [fine, setFine] = useState(false);
  useEffect(() => setFine(window.matchMedia("(pointer: fine)").matches), []);
  const mark = fine && !url;
  return (
    <div className="bg" {...(mark ? { "data-glisse-backdrop": "" } : {})} aria-hidden>
      {url && <div className="bg-img" style={{ backgroundImage: `url(${url})` }} />}
      {!url && (
        <>
          <i className="blob b1" />
          <i className="blob b2" />
          <i className="blob b3" />
          <svg className="ring" viewBox="0 0 400 400" fill="none" stroke="currentColor" strokeWidth="26" strokeLinecap="round"><circle cx="170" cy="170" r="120" /><path d="M262 262 L360 360" /></svg>
        </>
      )}
    </div>
  );
}
