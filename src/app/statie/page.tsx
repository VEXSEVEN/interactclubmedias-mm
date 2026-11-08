"use client";
import { DELETE, useConfirm } from "@/components/Confirm";
import { Select, ToggleRow } from "@/components/kit";
import { useEffect, useState } from "react";
import { ref, set, update } from "firebase/database";
import { Button, Glass, Input } from "glisse";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useSchedule, useScores, useStations, useTeams } from "@/lib/db";
import { sendEvent } from "@/lib/events";
import { roundAt } from "@/lib/schedule";
import Guard from "@/components/Guard";
import { Field, Pill } from "@/components/ui";
import { useToast } from "@/components/Toasts";

export default function StatiePage() {
  return (
    <Guard roles={["station", "organizer"]} station>
      <Station />
    </Guard>
  );
}

function Station() {
  const { profile } = useAuth();
  const toast = useToast();
  const ask = useConfirm();
  const { stations } = useStations();
  const { teams } = useTeams();
  const { scores } = useScores();
  const { schedule } = useSchedule();

  const locked = profile?.role === "station";
  const [pick, setPick] = useState("");
  const sid = locked ? profile?.stationId || "" : pick || stations[0]?.id || "";
  const st = stations.find((s) => s.id === sid);

  const [teamId, setTeamId] = useState("");
  const [points, setPoints] = useState("");
  const [release, setRelease] = useState(true);
  const [adding, setAdding] = useState("");

  const here = Object.keys(st?.present || {}).filter((k) => st?.present?.[k]);
  const visited = Object.keys(st?.visited || {});
  const slots = Math.max(1, st?.teamSlots ?? 2);
  const nm = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const expected = (roundAt(schedule, schedule?.currentRound ?? 0)[sid] || []).filter((id) => !here.includes(id));

  useEffect(() => {
    setTeamId((cur) => (cur && here.includes(cur) ? cur : here[0] || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, here.join(",")]);

  if (locked && !profile?.stationId) return <Glass className="card"><p className="muted">Contul tău nu e legat de nicio stație.</p></Glass>;
  if (!st) return <p className="muted center">Nu există stații. Organizatorul trebuie să le creeze.</p>;

  /** Statia devine ocupata DOAR cand sunt prezente `slots` echipe (implicit 2); altfel ramane libera. O echipa nu intra de 2 ori la aceeasi statie. */
  async function setPresent(id: string, on: boolean) {
    const next = new Set(here);
    if (on) next.add(id); else next.delete(id);
    if (on && (visited.includes(id) || scores[id]?.[sid] !== undefined)) return toast("Echipa a fost deja la această stație.", "error");
    if (on && next.size > slots) return toast(`Stația are deja ${slots} echipe.`, "error");
    const wasBusy = here.length >= slots;
    const nowBusy = next.size >= slots;
    try {
      await update(ref(db, `stations/${sid}`), { [`present/${id}`]: on ? true : null, ...(on ? { [`visited/${id}`]: true } : {}), occupied: nowBusy, updatedAt: Date.now() });
      if (wasBusy && !nowBusy) sendEvent("_teams", { type: "free", title: "Stație eliberată", body: `${st?.name} este liberă acum.` }).catch(() => {});
    } catch {
      toast("Nu ai drepturi pentru această acțiune.", "error");
    }
  }

  async function addScore() {
    const n = Number(points);
    if (!teamId) return toast("Alege echipa.", "error");
    if (scores[teamId]?.[sid] !== undefined) return toast("Această echipă a primit deja punctaj la stație. Punctajul se dă o singură dată.", "error");
    if (!Number.isFinite(n) || n < 0) return toast("Punctaj invalid.", "error");
    if (st?.maxPoints && n > st.maxPoints) return toast(`Maxim ${st.maxPoints} puncte la această stație.`, "error");
    try {
      await set(ref(db, `scores/${teamId}/${sid}`), n);
      toast(`${n} puncte salvate pentru ${nm(teamId)}.`, "success");
      sendEvent(teamId, { type: "score", title: "Punctaj adăugat", body: `${st?.name}: ${n} puncte` }).catch(() => {});
      setPoints("");
      if (release && here.includes(teamId)) await setPresent(teamId, false);
    } catch {
      toast("Nu s-a putut salva punctajul.", "error");
    }
  }

  const given = teams.filter((t) => scores[t.id]?.[sid] !== undefined);
  const candidates = teams.filter((t) => !here.includes(t.id) && !visited.includes(t.id) && scores[t.id]?.[sid] === undefined);

  return (
    <>
      {!locked && (
        <Select className="input" value={sid} onChange={(e) => setPick(e.target.value)} aria-label="Stație">
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      )}

      <Glass className="card stack">
        <div className="row between">
          <h1>{st.name}</h1>
          <Pill tone={st.occupied ? "busy" : "free"}>{st.occupied ? `Ocupată ${here.length}/${slots}` : `Liberă ${here.length}/${slots}`}</Pill>
        </div>
        <p className="helper">Stația devine ocupată doar când sunt {slots} echipe prezente. Până atunci rămâne liberă.</p>
        <div className="list">
          {here.map((id) => (
            <div className="item" key={id}>
              <span className="grow">{nm(id)}</span>
              <Button onClick={() => setPresent(id, false)}>Pleacă</Button>
            </div>
          ))}
          {!here.length && <p className="muted">Nicio echipă la stație.</p>}
        </div>
        {here.length < slots && (
          <div className="row">
            <Select className="input grow" value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">Echipă sosită…</option>
              {expected.length > 0 && <optgroup label="Așteptate în runda curentă">{expected.map((id) => <option key={id} value={id}>{nm(id)}</option>)}</optgroup>}
              <optgroup label="Toate echipele">{candidates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
            </Select>
            <Button variant="filled" disabled={!adding} onClick={() => { setPresent(adding, true); setAdding(""); }}>Check-in</Button>
          </div>
        )}
      </Glass>

      <Glass className="card stack">
        <h2>Adaugă punctaj</h2>
        <Field label="Echipa">
          <Select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Alege echipa…</option>
            {here.length > 0 && <optgroup label="La stație acum">{here.map((id) => <option key={id} value={id}>{nm(id)}</option>)}</optgroup>}
            <optgroup label="Fără punctaj la stație">{teams.filter((t) => scores[t.id]?.[sid] === undefined).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
          </Select>
        </Field>
        <Field label={`Puncte${st.maxPoints ? ` (max ${st.maxPoints})` : ""}`}>
          <Input type="number" inputMode="numeric" value={points} onValueChange={setPoints} onKeyDown={(e) => e.key === "Enter" && addScore()} />
        </Field>
        <ToggleRow checked={release} onChange={setRelease}>Eliberează echipa după salvare</ToggleRow>
        <Button variant="filled" onClick={addScore} disabled={!teamId || points === "" || (!!teamId && scores[teamId]?.[sid] !== undefined)}>Salvează punctajul (o singură dată)</Button>
        {teamId && scores[teamId]?.[sid] !== undefined && <p className="helper">Echipa are deja {scores[teamId][sid]} puncte aici — nu se mai poate modifica de la stație.</p>}
      </Glass>

      {!locked && visited.filter((id) => !here.includes(id) && scores[id]?.[sid] === undefined).length > 0 && (
        <div className="panel stack">
          <h3>Au plecat fără punctaj</h3>
          {visited.filter((id) => !here.includes(id) && scores[id]?.[sid] === undefined).map((id) => (
            <div className="row between" key={id}><span className="grow">{nm(id)}</span><Button onClick={() => update(ref(db, `stations/${sid}/visited`), { [id]: null })}>Permite revenirea</Button></div>
          ))}
        </div>
      )}

      {given.length > 0 && (
        <div className="panel stack">
          <h3>Punctaje date aici</h3>
          {given.map((t) => (
            <div className="row between" key={t.id}>
              <span className="grow">{t.name}</span><span className="pts">{scores[t.id][sid]}</span>
              {!locked && <Button destructive onClick={async () => { if (await ask(`Anulezi punctajul și vizita pentru ${t.name}?`, { confirmLabel: "Anulează punctajul", destructive: true })) await update(ref(db), { [`scores/${t.id}/${sid}`]: null, [`stations/${sid}/visited/${t.id}`]: null }); }}>Anulează</Button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
