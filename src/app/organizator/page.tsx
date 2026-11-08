"use client";
import { BulkBar, RoundCheck, useBulk } from "@/components/bulk";
import { DELETE, useConfirm } from "@/components/Confirm";
import { useEffect, useMemo, useState } from "react";
import { ref, update } from "firebase/database";
import { Button, Glass, Input, SearchField, SegmentedControl, Slider, Switch } from "glisse";
import { db } from "@/lib/firebase";
import { randomPassword, teamEmail, toList } from "@/lib/defaults";
import { runRules } from "@/lib/rules";
import { total, useScores, useSettings, useSlots, useStations, useTeams, useVal } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { RegStatus, Registration, RuleTrigger, Settings } from "@/lib/types";
import Guard from "@/components/Guard";
import DashShell from "@/components/DashShell";
import FormBuilder from "@/components/FormBuilder";
import RulesBuilder from "@/components/RulesBuilder";
import Compose from "@/components/Compose";
import StationsPanel from "@/components/StationsPanel";
import RotationPanel from "@/components/RotationPanel";
import ImageUpload from "@/components/ImageUpload";
import { Field, Pill, StatCard } from "@/components/ui";
import { useToast } from "@/components/Toasts";

const ITEMS = [
  { value: "dash", label: "Acasă", title: "Dashboard", icon: "dash" },
  { value: "regs", label: "Echipe", title: "Înscrieri", icon: "list" },
  { value: "builder", label: "Formular", title: "Formular & Builder", icon: "form" },
  { value: "rules", label: "Reguli", title: "Variabile & Reguli", icon: "puzzle" },
  { value: "stations", label: "Stații", title: "Stații & Rotație", icon: "pin" },
  { value: "msg", label: "Mesaje", title: "Mesagerie", icon: "bell" },
  { value: "settings", label: "Setări", title: "Setări eveniment", icon: "gear" },
];

export default function OrganizatorPage() {
  return (
    <Guard roles={["organizer"]}>
      <Organizer />
    </Guard>
  );
}

const TONE: Record<RegStatus, "info" | "warn" | "free" | "busy"> = { pending: "warn", approved: "info", paid: "free", rejected: "busy" };
const LABEL: Record<RegStatus, string> = { pending: "În așteptare", approved: "Aprobată", paid: "Achitată", rejected: "Respinsă" };

function Organizer() {
  const [tab, setTab] = useState("dash");
  const { settings, loading } = useSettings();
  const toast = useToast();
  const [d, setD] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading && !dirty) setD(settings);
  }, [loading, settings, dirty]);

  const patch = (p: Partial<Settings>) => {
    setDirty(true);
    setD((x) => (x ? { ...x, ...p } : x));
  };

  async function save() {
    if (!d) return;
    try {
      await update(ref(db), { settings: JSON.parse(JSON.stringify(d)) });
      setDirty(false);
      toast("Salvat.", "success");
    } catch {
      toast("Nu s-a putut salva.", "error");
    }
  }

  const editing = ["builder", "rules", "settings"].includes(tab);

  return (
    <DashShell title="Organizator" items={ITEMS} value={tab} onChange={setTab}>
      {tab === "dash" && <Dashboard />}
      {tab === "regs" && <Regs />}
      {tab === "stations" && <><StationsPanel /><RotationPanel /></>}
      {tab === "msg" && <Compose />}
      {d && tab === "builder" && <FormBuilder fields={d.fields} documents={d.documents} captainLabel={d.captainLabel} onChange={patch} />}
      {d && tab === "rules" && <RulesBuilder variables={d.variables} rules={d.rules} fields={d.fields} onChange={patch} />}
      {d && tab === "settings" && <SettingsPanel d={d} patch={patch} />}
      {editing && d && (
        <Glass className="savebar">
          <span className="helper">{dirty ? "Ai modificări nesalvate." : "Salvează formularul pentru a aplica modificările."}</span>
          <Button variant="filled" onClick={save}>Salvează</Button>
        </Glass>
      )}
    </DashShell>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard() {
  const { data } = useVal<Record<string, Registration>>("registrations");
  const { settings } = useSettings();
  const { used } = useSlots();
  const { teams } = useTeams();
  const { stations } = useStations();
  const regs = Object.values(data || {});
  const by = (s: RegStatus) => regs.filter((r) => r.status === s).length;
  return (
    <>
      <div className="stats">
        <StatCard label="Înscrieri totale" value={regs.length} />
        <StatCard label="Locuri ocupate (rezervate)" value={<>{used}<span className="muted"> / {settings.maxTeams || "∞"}</span></>} sub={`${by("approved")} aprobate · ${by("pending")} în așteptare · ${by("paid")} achitate`} />
        <StatCard label="Echipe create" value={teams.length} sub="după achitare" />
        <StatCard label="Stații" value={stations.length} />
      </div>
      {settings.variables.length > 0 && (
        <Glass className="card stack">
          <h3>Variabile active</h3>
          <div className="row">{settings.variables.map((v) => <Pill key={v.id} tone="info">{v.name}: {String(v.value)}</Pill>)}</div>
        </Glass>
      )}
      <Glass className="card stack">
        <h3>Ultimele înscrieri</h3>
        {Object.entries(data || {}).sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, 6).map(([id, r]) => (
          <div className="row between" key={id}><span>{r.teamName}</span><Pill tone={TONE[r.status]}>{LABEL[r.status]}</Pill></div>
        ))}
        {!regs.length && <p className="muted">Nicio înscriere încă.</p>}
      </Glass>
    </>
  );
}

/* ---------------- Setari ---------------- */
function SettingsPanel({ d, patch }: { d: Settings; patch: (p: Partial<Settings>) => void }) {
  return (
    <>
      <Glass className="card stack">
        <h2>Setări generale eveniment</h2>
        <div className="grid2">
          <Field label="Titlu site / eveniment"><Input value={d.title} onValueChange={(v) => patch({ title: v })} /></Field>
          <Field label="Subtitlu"><Input value={d.subtitle} onValueChange={(v) => patch({ subtitle: v })} /></Field>
        </div>
        <div className="row between"><span>Înscrieri deschise</span><Switch aria-label="Înscrieri deschise" checked={d.open} onCheckedChange={(v) => patch({ open: v })} /></div>
        <div className="grid2">
          <Field label="Număr maxim de echipe (0 = nelimitat)"><Input type="number" value={String(d.maxTeams)} onValueChange={(v) => patch({ maxTeams: Math.max(0, Number(v) || 0) })} /></Field>
          <Field label="Persoane minim / echipă"><Input type="number" value={String(d.minPerTeam)} onValueChange={(v) => patch({ minPerTeam: Math.max(1, Number(v) || 1) })} /></Field>
          <Field label="Persoane maxim / echipă"><Input type="number" value={String(d.maxPerTeam)} onValueChange={(v) => patch({ maxPerTeam: Math.max(d.minPerTeam, Number(v) || 1) })} /></Field>
          <Field label="Text footer"><Input value={d.footerText} onValueChange={(v) => patch({ footerText: v })} /></Field>
          <Field label="Primul membru se numește" helper="Gol = „Membru 1” (fără capitan)."><Input value={d.captainLabel} onValueChange={(v) => patch({ captainLabel: v })} placeholder="Capitan" /></Field>
        </div>
      </Glass>
      <Glass className="card stack">
        <h2>Imagini</h2>
        <ImageUpload label="Fundal global" value={d.bgUrl} onChange={(v) => patch({ bgUrl: v })} folder="bg" />
        <ImageUpload label="Banner formular" value={d.bannerUrl} onChange={(v) => patch({ bannerUrl: v })} folder="banner" />
      </Glass>
      <Glass className="card stack">
        <h2>Regulament</h2>
        <Field label="Titlu"><Input value={d.rulesTitle} onValueChange={(v) => patch({ rulesTitle: v })} /></Field>
        <Field label="Text"><textarea className="input" rows={8} value={d.rulesText} onChange={(e) => patch({ rulesText: e.target.value })} /></Field>
        <Field label={`Butonul „Continuă” se deblochează după ${d.rulesDelaySec} secunde`}>
          <Slider aria-label="Secunde" min={5} max={60} step={1} value={d.rulesDelaySec} onValueChange={(v) => patch({ rulesDelaySec: v })} />
        </Field>
      </Glass>
    </>
  );
}

/* ---------------- Inscrieri ---------------- */
function Regs() {
  const { data } = useVal<Record<string, Registration>>("registrations");
  const { settings } = useSettings();
  const { scores } = useScores();
  const { makeAuthUser } = useAuth();
  const toast = useToast();
  const ask = useConfirm();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return Object.entries(data || {})
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .filter(([id, r]) => (filter === "all" || r.status === filter) && (!needle || (id + r.teamName + JSON.stringify(r.answers || {}) + JSON.stringify(r.members || [])).toLowerCase().includes(needle)));
  }, [data, q, filter]);

  async function fireRules(trigger: RuleTrigger, r: Registration) {
    if (!settings.rules.some((x) => x.trigger === trigger)) return;
    const out = runRules(trigger, settings, r.answers || {});
    await update(ref(db), { "settings/variables": out.variables, "settings/open": out.open });
  }

  async function approve(id: string, r: Registration) {
    await update(ref(db), { [`registrations/${id}/status`]: "approved", [`statuses/${id}/status`]: "approved" });
    await fireRules("on_approve", r);
    toast("Înscriere aprobată.", "success");
  }

  async function reject(id: string, r: Registration) {
    if (!(await ask(`Respingi ${r.teamName}?`, { message: "Locul și numele echipei se eliberează.", confirmLabel: "Respinge", destructive: true }))) return;
    await update(ref(db), { [`registrations/${id}/status`]: "rejected", [`statuses/${id}/status`]: "rejected", [`slots/${r.slotId}`]: null, [`names/${r.slug}`]: null });
    await fireRules("on_reject", r);
    toast("Înscriere respinsă.", "success");
  }

  /** Achitat -> se creeaza automat echipa (cu punctaj) + cont: username = numele echipei, parola generata. */
  async function paid(id: string, r: Registration) {
    if (!(await ask(`Confirmi plata pentru ${r.teamName}?`, { message: "Se creează automat echipa și contul de acces.", confirmLabel: "Confirmă plata" }))) return;
    setBusy(id);
    try {
      const password = randomPassword();
      const email = teamEmail(r.teamName);
      const uid = await makeAuthUser(email, password);
      await update(ref(db), {
        [`users/${uid}`]: { role: "team", teamId: id, email, name: r.teamName },
        [`teams/${id}`]: { name: r.teamName, size: toList(r.members).length, createdAt: Date.now() },
        [`scores/${id}/_start`]: 0,
        [`credentials/${id}`]: { username: r.teamName, password },
        [`registrations/${id}/status`]: "paid",
        [`statuses/${id}/status`]: "paid",
      });
      await fireRules("on_paid", r);
      toast(`Echipa ${r.teamName} a fost creată. Parola e vizibilă pe pagina de status.`, "success");
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === "auth/email-already-in-use" ? "Există deja un cont cu acest nume de echipă." : "Nu s-a putut crea echipa.", "error");
    } finally {
      setBusy("");
    }
  }

  const bulk = useBulk(rows.map(([id]) => id));
  async function delMany() {
    const ids = bulk.selected;
    if (!(await ask(`Ștergi ${ids.length} înscrieri?`, { ...DELETE, message: "Se șterg și echipele, punctajele și parolele create din ele." }))) return;
    const u: Record<string, null> = {};
    for (const id of ids) {
      const r = data?.[id];
      if (!r) continue;
      Object.assign(u, { [`registrations/${id}`]: null, [`statuses/${id}`]: null, [`slots/${r.slotId}`]: null, [`names/${r.slug}`]: null, [`teams/${id}`]: null, [`scores/${id}`]: null, [`credentials/${id}`]: null });
    }
    await update(ref(db), u);
    bulk.clear();
    toast(`${ids.length} înscrieri șterse.`, "success");
  }

  async function del(id: string, r: Registration) {
    if (!(await ask(`Ștergi definitiv ${r.teamName}?`, DELETE))) return;
    await update(ref(db), {
      [`registrations/${id}`]: null, [`statuses/${id}`]: null, [`slots/${r.slotId}`]: null, [`names/${r.slug}`]: null,
      [`teams/${id}`]: null, [`scores/${id}`]: null, [`credentials/${id}`]: null,
    });
    toast("Șters.", "success");
  }

  function csv() {
    const esc = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
    const lines = [["Cod", "Echipa", "Status", "Membri", ...settings.fields.filter((f) => f.scope !== "member").map((f) => f.label), "Punctaj"].map(esc).join(",")];
    for (const [id, r] of rows) {
      lines.push([id, r.teamName, LABEL[r.status], toList<{ name: string }>(r.members).map((m) => m.name).join("; "), ...settings.fields.filter((f) => f.scope !== "member").map((f) => r.answers?.[f.id] ?? ""), total(scores[id])].map(esc).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv" }));
    a.download = "inscrieri.csv";
    a.click();
  }

  return (
    <>
      <SearchField value={q} onValueChange={setQ} placeholder="Caută înscrieri (echipă, cod, nume, răspunsuri)…" />
      <div className="row between">
        <SegmentedControl aria-label="Filtru" value={filter} onValueChange={setFilter} items={[{ value: "all", label: "Toate" }, { value: "pending", label: "Așteptare" }, { value: "approved", label: "Aprobate" }, { value: "paid", label: "Achitate" }]} />
        <Button onClick={csv} disabled={!rows.length}>Export CSV</Button>
      </div>
      <BulkBar bulk={bulk} total={rows.length} onDelete={delMany} />
      {rows.map(([id, r]) => {
        const members = toList<Registration["members"][number]>(r.members);
        return (
          <details className="panel" key={id}>
            <summary><span className="row" style={{ flexWrap: "nowrap" }}><RoundCheck checked={bulk.has(id)} onChange={(v) => bulk.toggle(id, v)} label={`Selectează ${r.teamName}`} /><span><strong>{r.teamName}</strong> <span className="muted">· {id} · {members.length} pers.</span></span></span><Pill tone={TONE[r.status]}>{LABEL[r.status]}</Pill></summary>
            <div className="stack">
              {settings.fields.filter((f) => f.scope !== "member").map((f) => <p key={f.id}><span className="muted">{f.label}: </span>{String(r.answers?.[f.id] ?? "—")}</p>)}
              {members.map((m, i) => (
                <p key={i}><strong>{m.name}</strong>{settings.fields.filter((f) => f.scope === "member").map((f) => <span className="muted" key={f.id}> · {f.label}: {String(m.answers?.[f.id] ?? "—")}</span>)}</p>
              ))}
              {settings.documents.map((doc) => {
                const files = Object.entries((r.files?.[doc.id] || {}) as Record<string, { url: string; name: string }>);
                return (
                  <div key={doc.id} className="stack">
                    <span className="label">{doc.title}</span>
                    {files.length ? files.map(([i, f]) => <a key={i} href={f.url} target="_blank" rel="noreferrer">{doc.signer === "all" ? members[Number(i)]?.name || `Membru ${Number(i) + 1}` : members[0]?.name || "Primul membru"} — {f.name}</a>) : <span className="helper">Neîncărcat</span>}
                  </div>
                );
              })}
              <div className="row">
                {r.status === "pending" && <Button onClick={() => approve(id, r)}>Aprobă</Button>}
                {(r.status === "pending" || r.status === "approved") && <Button variant="filled" disabled={busy === id} onClick={() => paid(id, r)}>{busy === id ? "Se creează…" : "Marchează achitat"}</Button>}
                {r.status !== "rejected" && r.status !== "paid" && <Button destructive onClick={() => reject(id, r)}>Respinge</Button>}
                <Button destructive onClick={() => del(id, r)}>Șterge</Button>
              </div>
            </div>
          </details>
        );
      })}
      {!rows.length && <p className="muted center">Nicio înscriere găsită.</p>}
    </>
  );
}
