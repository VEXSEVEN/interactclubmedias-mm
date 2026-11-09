"use client";
import { BulkBar, RoundCheck, useBulk } from "@/components/bulk";
import { DELETE, useConfirm } from "@/components/Confirm";
import { ColorField, Select } from "@/components/kit";
import { useState, useEffect } from "react";
import { ref, remove, update } from "firebase/database";
import { Button, Glass, Input, SegmentedControl, Slider } from "glisse";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useSettings, useStations, useVal } from "@/lib/db";
import { applyTheme, THEME_CACHE_KEY } from "@/lib/theme";
import { THEME_PRESETS } from "@/lib/defaults";
import type { Profile, Role, Theme } from "@/lib/types";
import Guard from "@/components/Guard";
import DashShell from "@/components/DashShell";
import ImageUpload from "@/components/ImageUpload";
import Compose from "@/components/Compose";
import DataTabs from "@/components/DataTabs";
import { Field, Pill } from "@/components/ui";
import { useToast } from "@/components/Toasts";

export default function DeveloperPage() {
  return (
    <Guard roles={[]}>
      <Dev />
    </Guard>
  );
}

const ITEMS = [
  { value: "users", label: "Conturi", icon: "user" },
  { value: "msg", label: "Mesaje", title: "Mesagerie", icon: "bell" },
  { value: "media", label: "Temă", title: "Temă & imagini", icon: "image" },
  { value: "data", label: "Date", title: "Date (acces total)", icon: "code" },
  { value: "logs", label: "Update-uri", title: "Istoric Update-uri (Changelog)", icon: "file" },
];

function Dev() {
  const [tab, setTab] = useState("users");
  return (
    <DashShell title="Developer" items={ITEMS} value={tab} onChange={setTab}>
      {tab === "users" && <Users />}
      {tab === "media" && <Media />}
      {tab === "msg" && <Compose />}
      {tab === "data" && <DataTabs />}
      {tab === "logs" && <UpdateLogs />}
    </DashShell>
  );
}

type ColorKey = "text" | "glassTint" | "line" | "filled" | "tabSelected" | "free" | "busy" | "warn";

function Media() {
  const { settings, loading } = useSettings();
  const toast = useToast();
  const [bg, setBg] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const activeTheme = theme ?? settings?.theme;
  const bgV = bg ?? settings?.bgUrl ?? "";
  const banV = banner ?? settings?.bannerUrl ?? "";

  const set = (p: Partial<Theme>) => {
    if (!activeTheme) return;
    const t = { ...activeTheme, ...p };
    applyTheme(t);
    setTheme(t);
  };

  useEffect(() => {
    return () => {
      if (settings?.theme) applyTheme(settings.theme);
    };
  }, [settings?.theme]);

  if (loading || !activeTheme) return <p className="muted center">Se încarcă…</p>;

  const opt = (key: ColorKey, label: string, auto: string, help?: string) => (
    <Field label={label} helper={help}>
      <ColorField
        value={(activeTheme[key] as string) || auto}
        label={label}
        onChange={(v) => set({ [key]: v } as Partial<Theme>)}
        onClear={activeTheme[key] ? () => set({ [key]: undefined } as Partial<Theme>) : undefined}
      />
    </Field>
  );

  return (
    <>
      <Glass className="card stack">
        <h2>Imagini site</h2>
        <p className="muted">Încarcă o imagine sau lipește un URL. Fundalul apare pe tot site-ul, bannerul în capul formularului.</p>
        <ImageUpload label="Fundal global" value={bgV} onChange={setBg} folder="bg" />
        <ImageUpload label="Banner formular" value={banV} onChange={setBanner} folder="banner" />
        <div>
          <Button onClick={async () => {
            const themeToSave = theme ?? settings.theme;
            await update(ref(db, "settings"), JSON.parse(JSON.stringify({ bgUrl: bgV, bannerUrl: banV, theme: themeToSave })));

            applyTheme(themeToSave);
            try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(themeToSave)); } catch { }

            setBg(null);
            setBanner(null);
            setTheme(null);
            toast("Salvat.", "success");
          }}>
            1. Reîncarcă Tema Actuală & 2. Salvează imaginile și Tema!
          </Button>
        </div>
      </Glass>

      <Glass className="card stack">
        <h2>Temă — presetări</h2>
        <div className="row">
          {THEME_PRESETS.map((p) => (
            <Button
              key={p.name}
              onClick={() => set({ ...p.theme, text: undefined, glassTint: undefined, line: undefined, filled: undefined, tabSelected: undefined })}
              tint={p.theme.accent}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <SegmentedControl
          aria-label="Mod"
          value={activeTheme.mode}
          onValueChange={(v) => set({ mode: v as Theme["mode"] })}
          items={[{ value: "light", label: "Luminos" }, { value: "dark", label: "Întunecat" }]}
        />
      </Glass>

      <Glass className="card stack">
        <h2>Culori principale</h2>
        <div className="grid2">
          <Field label="Culoare principală" helper="Schimbă butoanele, accentele și tot textul site-ul (textul se calculează din ea).">
            <ColorField value={activeTheme.accent} label="Culoare principală" onChange={(v) => set({ accent: v })} />
          </Field>
          <Field label="Culoare fundal">
            <ColorField value={activeTheme.bg} label="Culoare fundal" onChange={(v) => set({ bg: v })} />
          </Field>
        </div>
        <Field label={`Subtitluri: ${activeTheme.subMix}% din culoarea fundalului`} helper="Textul secundar = culoarea textului amestecată cu acest procent din fundal.">
          <Slider aria-label="Amestec subtitluri" min={0} max={60} step={1} value={activeTheme.subMix} onValueChange={(v) => set({ subMix: v })} />
        </Field>
      </Glass>

      <Glass className="card stack">
        <h2>Componente</h2>
        <div className="grid2">
          {opt("text", "Text (suprascrie automat)", "#0d1b36", "Auto = derivat din culoarea principală.")}
          {opt("filled", "Butoane principale", activeTheme.accent)}
          {opt("tabSelected", "Tab selectat (dock)", activeTheme.accent)}
          {opt("line", "Borduri", activeTheme.accent)}
          {opt("free", "Liber / succes", "#0a8f5a")}
          {opt("busy", "Ocupat / eroare", "#d6342a")}
          {opt("warn", "În așteptare", "#b7791f")}
        </div>
      </Glass>

      <Glass className="card stack">
        <h2>Sticlă (liquid glass)</h2>
        <div className="grid2">{opt("glassTint", "Culoarea sticlei", "#ffffff")}</div>
        <Field label={`Opacitatea sticlei: ${Math.round((activeTheme.glassAlpha ?? (activeTheme.mode === "dark" ? 0.07 : 0.16)) * 100)}%`}>
          <Slider aria-label="Opacitate" min={0} max={0.6} step={0.01} value={activeTheme.glassAlpha ?? (activeTheme.mode === "dark" ? 0.07 : 0.16)} onValueChange={(v) => set({ glassAlpha: v })} />
        </Field>
        <Field label={`Refracția: ${activeTheme.bend.toFixed(2)}`}>
          <Slider aria-label="Refracție" min={0} max={1} step={0.05} value={activeTheme.bend} onValueChange={(v) => set({ bend: v })} />
        </Field>
        <Field label={`Frost (blur): ${activeTheme.blur}px`}>
          <Slider aria-label="Blur" min={0} max={24} step={1} value={activeTheme.blur} onValueChange={(v) => set({ blur: v })} />
        </Field>
        <Field label={`Luciul marginii: ${activeTheme.rim.toFixed(2)}`}>
          <Slider aria-label="Luciu" min={0} max={1} step={0.05} value={activeTheme.rim} onValueChange={(v) => set({ rim: v })} />
        </Field>
      </Glass>
    </>
  );
}

function Users() {
  const { createAccount } = useAuth();
  const { data } = useVal<Record<string, Profile>>("users");
  const { stations } = useStations();
  const toast = useToast();
  const ask = useConfirm();
  const [f, setF] = useState({ email: "", password: "", name: "", role: "station" as Role, stationId: "" });
  const [busy, setBusy] = useState(false);

  const userIds = Object.keys(data || {});
  const bulk = useBulk(userIds);
  async function delMany() {
    if (!(await ask(`Ștergi ${bulk.selected.length} profile?`, { ...DELETE, message: "Conturile de autentificare rămân în Firebase Console." }))) return;
    await update(ref(db), Object.fromEntries(bulk.selected.map((id) => [`users/${id}`, null])));
    bulk.clear();
  }

  async function create() {
    setBusy(true);
    try {
      await createAccount(f);
      toast("Cont creat.", "success");
      setF({ ...f, email: "", password: "", name: "" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Eroare la creare.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Glass className="card stack">
        <h2>Cont nou</h2>
        <Field label="Nume (opțional)"><Input value={f.name} onValueChange={(v) => setF({ ...f, name: v })} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onValueChange={(v) => setF({ ...f, email: v })} autoComplete="off" /></Field>
        <Field label="Parolă (minim 6 caractere)"><Input type="password" value={f.password} onValueChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" /></Field>
        <Field label="Rol">
          <Select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            <option value="station">Stație de joc</option><option value="organizer">Organizator</option><option value="developer">Developer</option>
          </Select>
        </Field>
        {f.role === "station" && (
          <Field label="Stația legată de cont">
            <Select className="input" value={f.stationId} onChange={(e) => setF({ ...f, stationId: e.target.value })}>
              <option value="">Alege stația…</option>
              {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
        <Button onClick={create} disabled={busy || !f.email || f.password.length < 6 || (f.role === "station" && !f.stationId)}>
          {busy ? "Se creează…" : "Creează contul"}
        </Button>
      </Glass>

      <h2>Conturi</h2>
      <BulkBar bulk={bulk} total={userIds.length} onDelete={delMany} />
      {Object.entries(data || {}).map(([id, p]) => (
        <Glass className="card stack" key={id}>
          <div className="row between">
            <RoundCheck checked={bulk.has(id)} onChange={(v) => bulk.toggle(id, v)} label="Selectează" />
            <div className="grow"><h3>{p.name || p.email}</h3><p className="helper">{p.email} · {id}</p></div>
            <Pill tone="info">{p.role}</Pill>
          </div>
          <div className="row">
            <Select className="input grow" value={p.role} onChange={(e) => update(ref(db, `users/${id}`), { role: e.target.value })}>
              <option value="station">station</option><option value="organizer">organizer</option><option value="developer">developer</option><option value="team">team</option>
            </Select>
            {p.role === "station" && (
              <Select className="input grow" value={p.stationId || ""} onChange={(e) => update(ref(db, `users/${id}`), { stationId: e.target.value })}>
                <option value="">Fără stație</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
            <Button destructive onClick={async () => (await ask("Ștergi profilul?", { ...DELETE, message: "Contul de autentificare rămân în Firebase Console." })) && remove(ref(db, `users/${id}`))}>Șterge</Button>
          </div>
        </Glass>
      ))}
    </>
  );
}

const UPDATE_LOGS = [
  {
    version: "v1.2.1",
    date: "09.11.2026 12:45",
    title: "Service Worker Push, transparență sticlă & log-uri sistem",
    changes: [
      "Notificări Service Worker adaptate pentru Interact Club Mediaș cu renotify, vibrație și deschidere inteligentă.",
      "Optimizare opacitate carduri în Dark Mode (fondul nu mai este negru intens, ci sticlă translucidă fină).",
      "Logging detaliat la înregistrarea FCM Push Tokens.",
      "Tab dedicat de Update Logs în panoul Developer."
    ]
  },
  {
    version: "v1.2.0",
    date: "09.11.2026 12:29",
    title: "Eliminare spotlight & fix formulare",
    changes: [
      "Eliminat complet efectul de spotlight (radial gradient hover/click) de pe toate cardurile.",
      "Fix formulare: ID-urile câmpurilor nu mai resetează cardul la tastare.",
      "Documentele șterse rămân șterse și nu mai reapar automat din valorile demo."
    ]
  },
  {
    version: "v1.1.0",
    date: "09.11.2026 01:23",
    title: "Vizibilitate butoane & remediere aberație cromatică",
    changes: [
      "Textul butoanelor este mereu vizibil pe fundaluri întunecate.",
      "Backdrop-ul refractat este activat strict pe ecrane desktop fără imagini cu text, eliminând glitch-ul RGB.",
      "Rezolvată persistența temei la salvare în baza de date."
    ]
  },
  {
    version: "v1.0.0",
    date: "09.11.2026 00:16",
    title: "Lansare inițială platformă",
    changes: [
      "Formular de înregistrare, sistem de status echipă, rotație stații și panouri organizator/developer."
    ]
  }
];

function UpdateLogs() {
  return (
    <>
      <div className="list">
        {UPDATE_LOGS.map((log) => (
          <Glass className="card stack" key={log.version}>
            <div className="row between">
              <span className="row" style={{ gap: "8px" }}>
                <Pill tone="info">{log.version}</Pill>
                <strong>{log.title}</strong>
              </span>
              <span className="helper">{log.date}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {log.changes.map((c, i) => (
                <li key={i} className="muted" style={{ fontSize: "0.92rem" }}>{c}</li>
              ))}
            </ul>
          </Glass>
        ))}
      </div>
    </>
  );
}
