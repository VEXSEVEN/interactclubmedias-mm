"use client";
import { useEffect, useState } from "react";
import { Button, Glass, SegmentedControl } from "glisse";
import { detectPlatform, useInstallPrompt, useStandalone, type Platform } from "@/lib/pwa";
import { useToast } from "@/components/Toasts";
import Icon from "@/components/Icon";

/** Inlocuieste {share} / {more} / {morev} cu iconite lucide. */
function rich(t: string) {
  return t.split(/(\{share\}|\{more\}|\{morev\})/).map((p, i) => (p === "{share}" ? <span key={i} className="inl"><Icon n="share" size={16} /></span> : p === "{more}" ? <span key={i} className="inl"><Icon n="more" size={16} /></span> : p === "{morev}" ? <span key={i} className="inl"><Icon n="morev" size={16} /></span> : p));
}

const GUIDE: Record<Platform, { title: string; note?: string; steps: [string, string][] }> = {
  ios: {
    title: "iPhone / iPad (Safari)",
    note: "Necesită iOS 16.4 sau mai nou. Deschide acest link în Safari — în alte browsere meniul de instalare poate lipsi.",
    steps: [
      ["Deschide site-ul în Safari", "Dacă ești într-o altă aplicație (Instagram, WhatsApp), apasă {more} și alege „Deschide în Safari”."],
      ["Apasă Share", "Pătratul cu săgeată în sus {share}, din bara de jos a Safari (pe iPad, sus)."],
      ["Alege „Adaugă pe ecranul principal”", "Derulează lista în jos dacă nu o vezi — „Add to Home Screen”."],
      ["Apasă „Adaugă”", "Numele aplicației rămâne „Murder Mystery”. Apare o iconiță pe ecranul principal."],
      ["Deschide aplicația din iconiță", "Nu din Safari. Doar aici te poți loga ca jucător."],
      ["Permite notificările", "La prima deschidere apasă „Permite notificările” și confirmă pe iPhone. Fără asta nu primești punctajul."],
    ],
  },
  android: {
    title: "Android (Chrome)",
    steps: [
      ["Deschide site-ul în Chrome", "Dacă ești în altă aplicație, alege „Deschide în Chrome”."],
      ["Apasă „Instalează aplicația”", "Butonul de mai sus face totul. Dacă nu apare: meniul {morev} din Chrome → „Instalează aplicația” sau „Adaugă la ecranul principal”."],
      ["Confirmă „Instalează”", "Iconița apare pe ecranul principal și în lista de aplicații."],
      ["Deschide aplicația din iconiță", "Doar aici te poți loga ca jucător."],
      ["Permite notificările", "La prima deschidere apasă „Permite notificările” și confirmă în fereastra Android."],
    ],
  },
  desktop: {
    title: "Computer (Chrome / Edge)",
    note: "Pentru joc folosește telefonul; pe computer instalarea e opțională.",
    steps: [
      ["Deschide site-ul în Chrome sau Edge", "Safari pe Mac folosește Fișier → Adaugă în Dock."],
      ["Apasă iconița de instalare", "În bara de adrese, în dreapta (monitor cu săgeată) sau meniul {morev} → „Instalează”."],
      ["Deschide aplicația instalată", "Se deschide într-o fereastră proprie."],
    ],
  },
};

export default function InstallPage() {
  const toast = useToast();
  const { standalone } = useStandalone();
  const { available, install } = useInstallPrompt();
  const [os, setOs] = useState<Platform>("ios");
  useEffect(() => setOs(detectPlatform()), []);
  const g = GUIDE[os];

  return (
    <>
      <h1>Instalează aplicația</h1>
      {standalone ? (
        <Glass className="card stack center">
          <h2>Aplicația este instalată</h2>
          <p className="muted">Ești deja în aplicație. Mergi la Jucător ca să te loghezi.</p>
        </Glass>
      ) : (
        <p className="muted">Aplicația e un shortcut pe telefon (PWA): se deschide ca o aplicație obișnuită, îți arată punctajul în timp real și îți trimite notificări. Te-am detectat automat — poți schimba sistemul de mai jos.</p>
      )}
      <div style={{ width: "100%" }}>
        <SegmentedControl aria-label="Sistem" value={os} onValueChange={(v) => setOs(v as Platform)} items={[{ value: "ios", label: "iPhone" }, { value: "android", label: "Android" }, { value: "desktop", label: "Computer" }]} />
      </div>
      {!standalone && (os === "android" || os === "desktop") && (
        <Glass className="card stack center">
          <h2>Instalare rapidă</h2>
          {available ? (
            <Button onClick={async () => { const ok = await install(); toast(ok ? "Aplicația se instalează…" : "Instalarea a fost anulată.", ok ? "success" : "info"); }}>Instalează aplicația</Button>
          ) : (
            <p className="muted">Butonul apare când browserul permite instalarea. Dacă nu îl vezi, urmează pașii de mai jos.</p>
          )}
        </Glass>
      )}

      <Glass className="card stack">
        <h2>{g.title}</h2>
        {g.note && <p className="helper">{g.note}</p>}
        <ol className="steps">
          {g.steps.map(([t, d], i) => (
            <li key={i}><span className="stepno">{i + 1}</span><div><strong>{t}</strong><p className="muted">{rich(d)}</p></div></li>
          ))}
        </ol>
      </Glass>

      <div className="row">
        <Button onClick={() => navigator.clipboard?.writeText(location.origin).then(() => toast("Link copiat.", "success"))}>Copiază linkul aplicației</Button>
      </div>
    </>
  );
}
