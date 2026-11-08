"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Glass, Input, SegmentedControl } from "glisse";
import { useAuth } from "@/lib/auth";
import { ranking, useSchedule, useScores, useStations, useTeams } from "@/lib/db";
import { stationOfTeam } from "@/lib/schedule";
import { askPermission, canNotify, isIOS, registerPush, showNotification } from "@/lib/notify";
import { useStandalone } from "@/lib/pwa";
import { Field, Pill } from "@/components/ui";
import { useToast } from "@/components/Toasts";

export default function JucatorPage() {
  const { user, profile, loading, loginTeam, logout } = useAuth();
  const { standalone, mounted } = useStandalone();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await loginTeam(name.trim(), pass.trim());
    } catch {
      toast("Utilizator sau parolă incorecte.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !mounted) return <p className="muted center">Se încarcă…</p>;
  if (profile?.role === "team" && profile.teamId) return <Panel teamId={profile.teamId} onLogout={() => logout()} />;
  if (user && profile)
    return (
      <Glass className="card stack center">
        <h2>Panoul jucătorului</h2>
        <p className="muted">Ești conectat ca staff ({profile.role}). Panoul jucătorului se vede cu contul unei echipe.</p>
      </Glass>
    );

  // din browser jucatorul vede doar formularul si statusul; contul se foloseste in aplicatia instalata
  if (!standalone)
    return (
      <Glass className="card stack center">
        <h1>Instalează aplicația</h1>
        <p className="muted">Contul echipei se folosește doar în aplicație. Din browser poți completa formularul și vedea statusul înscrierii și datele contului.</p>
        <Link href="/install"><Button variant="filled">Cum instalez aplicația</Button></Link>
        <Link href="/status"><Button>Vezi datele contului (Status)</Button></Link>
      </Glass>
    );

  return (
    <Glass className="card stack">
      <h1>Contul echipei</h1>
      <p className="muted">Utilizator = numele echipei. Parola o găsești pe pagina de status după confirmarea plății.</p>
      <Field label="Numele echipei"><Input value={name} onValueChange={setName} autoComplete="username" autoCapitalize="none" /></Field>
      <Field label="Parolă"><Input type="password" value={pass} onValueChange={setPass} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && go()} /></Field>
      <Button variant="filled" onClick={go} disabled={busy || !name || !pass}>{busy ? "Se conectează…" : "Intră"}</Button>
      <p className="helper center">Nu ai parola? <Link href="/status">Verifică statusul înscrierii</Link></p>
    </Glass>
  );
}

function Panel({ teamId, onLogout }: { teamId: string; onLogout: () => void }) {
  const toast = useToast();
  const { profile } = useAuth();
  const { teams } = useTeams();
  const { scores } = useScores();
  const { stations } = useStations();
  const { schedule } = useSchedule();

  const [tab, setTab] = useState("team");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => setPerm(canNotify() ? Notification.permission : "unsupported"), []);

  const team = teams.find((t) => t.id === teamId);
  const board = useMemo(() => ranking(teams, scores), [teams, scores]);
  const mine = board.find((r) => r.team.id === teamId);
  const myScores = Object.fromEntries(Object.entries(scores[teamId] || {}).filter(([k]) => !k.startsWith("_")));
  const stName = (id?: string | null) => stations.find((s) => s.id === id)?.name || "—";

  async function enable() {
    const p = await askPermission();
    setPerm(p);
    if (p === "granted") {
      const ok = await registerPush({ role: "team", teamId, stationId: profile?.stationId });
      toast(ok ? "Notificările sunt active, inclusiv cu aplicația închisă." : "Notificările sunt active cât timp aplicația e deschisă.", "success");
    } else toast("Notificările au fost refuzate din setările telefonului.", "error");
  }

  const cur = schedule?.currentRound ?? 0;
  const nowSt = stationOfTeam(schedule, cur, teamId);
  const nextSt = schedule ? stationOfTeam(schedule, cur + 1, teamId) : null;

  return (
    <>
      <SegmentedControl aria-label="Secțiune" value={tab} onValueChange={setTab}
        items={[{ value: "team", label: "Echipa mea" }, { value: "stations", label: "Stații" }, { value: "board", label: "Clasament" }]} />

      {tab === "team" && (
        <>
          <Glass className="card stack center">
            <h2>{team?.name || "Echipa mea"}</h2>
            <div className="score">{mine?.points ?? 0}</div>
            <p className="muted">puncte · locul {mine?.rank ?? "—"} din {teams.length}</p>
          </Glass>

          {schedule && (
            <Glass className="card stack">
              <h3>Traseul tău</h3>
              <div className="row between"><span className="muted">Acum (runda {cur + 1})</span><strong>{nowSt ? stName(nowSt) : "Pauză"}</strong></div>
              <div className="row between"><span className="muted">Următoarea</span><strong>{nextSt ? stName(nextSt) : "—"}</strong></div>
            </Glass>
          )}

          <Glass className="card stack">
            <h3>Punctaj pe stații</h3>
            {stations.map((s) => (
              <div className="row between" key={s.id}>
                <span>{s.name}</span>
                <span className="pts">{myScores[s.id] ?? "—"}{s.maxPoints ? <span className="muted"> / {s.maxPoints}</span> : null}</span>
              </div>
            ))}
            {!stations.length && <p className="muted">Nu există stații încă.</p>}
          </Glass>

          <Glass className="card stack">
            <h3>Notificări</h3>
            {perm === "unsupported" && <p className="muted">Telefonul acesta nu suportă notificări.</p>}
            {perm === "default" && <Button variant="filled" onClick={enable}>Activează notificările</Button>}
            {perm === "denied" && <p className="muted">Notificările sunt blocate. Activează-le din setările telefonului pentru această aplicație{isIOS() ? " (Setări → Notificări)" : ""}.</p>}
            {perm === "granted" && (
              <div className="row between">
                <span className="muted">Active: punctaj, stații eliberate și mesaje.</span>
                <Button onClick={() => showNotification("Test notificare", "Totul funcționează.", `test-${Date.now()}`)}>Testează</Button>
              </div>
            )}
          </Glass>
          <div><Button onClick={onLogout}>Deconectare</Button></div>
        </>
      )}

      {tab === "stations" && (
        <div className="list">
          {stations.map((s) => (
            <Glass className="item" key={s.id}>
              <div className="grow"><h3>{s.name}</h3><p className="helper">{s.description || `Capacitate: ${s.capacity} persoane`}</p></div>
              <Pill tone={s.occupied ? "busy" : "free"}>{s.occupied ? "Ocupată" : "Liberă"} · {Object.keys(s.present || {}).length}/{s.teamSlots ?? 2}</Pill>
            </Glass>
          ))}
          {!stations.length && <p className="muted center">Nu există stații încă.</p>}
        </div>
      )}

      {tab === "board" && (
        <div className="list">
          {board.map((r) => (
            <Glass className={`item ${r.team.id === teamId ? "me" : ""}`} key={r.team.id}>
              <span className="rank">{r.rank}</span><span className="grow">{r.team.name}</span><span className="pts">{r.points}</span>
            </Glass>
          ))}
          {!board.length && <p className="muted center">Nicio echipă încă.</p>}
        </div>
      )}
    </>
  );
}
