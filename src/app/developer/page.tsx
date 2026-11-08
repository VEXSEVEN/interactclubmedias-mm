"use client";
import { BulkBar, RoundCheck, useBulk } from "@/components/bulk";
import { DELETE, useConfirm } from "@/components/Confirm";
import { Select } from "@/components/kit";
import { useState } from "react";
import { ref, remove, update } from "firebase/database";
import { Button, Glass, Input } from "glisse";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useSettings, useStations, useVal } from "@/lib/db";
import type { Profile, Role, Theme } from "@/lib/types";
import Guard from "@/components/Guard";
import DashShell from "@/components/DashShell";
import ImageUpload from "@/components/ImageUpload";
import ThemePanel from "@/components/ThemePanel";
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
];

function Dev() {
  const [tab, setTab] = useState("users");
  return (
    <DashShell title="Developer" items={ITEMS} value={tab} onChange={setTab}>
      {tab === "users" && <Users />}
      {tab === "media" && <Media />}
      {tab === "msg" && <Compose />}
      {tab === "data" && <DataTabs />}
    </DashShell>
  );
}

function Media() {
  const { settings, loading } = useSettings();
  const toast = useToast();
  const [bg, setBg] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const bgV = bg ?? settings.bgUrl;
  const banV = banner ?? settings.bannerUrl;
  if (loading) return <p className="muted center">Se încarcă…</p>;
  return (
    <>
    <ThemePanel theme={theme ?? settings.theme} onChange={setTheme} />
    <Glass className="card stack">
      <h2>Imagini site</h2>
      <p className="muted">Încarcă o imagine sau lipește un URL. Fundalul apare pe tot site-ul, bannerul în capul formularului.</p>
      <ImageUpload label="Fundal global" value={bgV} onChange={setBg} folder="bg" />
      <ImageUpload label="Banner formular" value={banV} onChange={setBanner} folder="banner" />
      <div>
        <Button variant="filled" onClick={async () => {
          await update(ref(db, "settings"), JSON.parse(JSON.stringify({ bgUrl: bgV, bannerUrl: banV, theme: theme ?? settings.theme })));
          setBg(null); setBanner(null); setTheme(null);
          toast("Salvat.", "success");
        }}>Salvează imaginile și tema</Button>
      </div>
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
        <Button variant="filled" onClick={create} disabled={busy || !f.email || f.password.length < 6 || (f.role === "station" && !f.stationId)}>
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
            <Button destructive onClick={async () => (await ask("Ștergi profilul?", { ...DELETE, message: "Contul de autentificare rămâne în Firebase Console." })) && remove(ref(db, `users/${id}`))}>Șterge</Button>
          </div>
        </Glass>
      ))}
    </>
  );
}
