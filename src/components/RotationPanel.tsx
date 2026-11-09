"use client";
import { DELETE, useConfirm } from "./Confirm";
import { ref, remove, set, update } from "firebase/database";
import { Button, Glass } from "glisse";
import { db } from "@/lib/firebase";
import { generateSchedule, roundAt } from "@/lib/schedule";
import { useSchedule, useSettings, useStations, useTeams } from "@/lib/db";
import { useToast } from "./Toasts";

/* ---------------- Rotatie ---------------- */
export default function RotationPanel() {
  const { settings } = useSettings();
  const { teams } = useTeams();
  const { stations } = useStations();
  const { schedule } = useSchedule();
  const toast = useToast();
  const ask = useConfirm();

  const per = Math.max(1, settings.maxPerTeam);
  const k = stations.length ? Math.max(1, Math.min(...stations.map((s) => Math.floor((s.capacity || per) / per)))) : 1;
  const nm = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const sn = (id: string) => stations.find((s) => s.id === id)?.name || id;
  const rounds = schedule?.roundCount ?? 0;
  const cur = schedule?.currentRound ?? 0;

  async function generate() {
    if (schedule && !(await ask("Înlocuiești rotația existentă?", { confirmLabel: "Înlocuiește" }))) return;
    const s = generateSchedule(teams.map((t) => t.id), stations, per);
    if (!s) return toast("Ai nevoie de cel puțin o echipă și o stație.", "error");
    await set(ref(db, "schedule"), s);
    toast("Rotație generată.", "success");
  }
  const setRound = (r: number) => update(ref(db, "schedule"), { currentRound: Math.max(0, Math.min(rounds - 1, r)) });

  return (
    <>
      <Glass className="card stack">
        <h2>Rotație randomizată</h2>
        <p className="muted">
          {teams.length} echipe{settings.maxTeams ? ` din maxim ${settings.maxTeams}` : ""} · {stations.length} stații · la o stație pot fi {k} {k === 1 ? "echipă" : "echipe"} odată
          (capacitate stație ÷ {per} persoane/echipă). Echipele nu se întâlnesc la aceeași stație în aceeași rundă.
        </p>
        <Button onClick={generate} disabled={!teams.length || !stations.length}>
          {schedule ? "Regenerează rotația" : "Generează rotația"}
        </Button>
      </Glass>

      {schedule && (
        <>
          <Glass className="card row between">
            <Button onClick={() => setRound(cur - 1)} disabled={cur <= 0}>Runda anterioară</Button>
            <strong>Runda {cur + 1} / {rounds}</strong>
            <Button onClick={() => setRound(cur + 1)} disabled={cur >= rounds - 1}>Runda următoare</Button>
          </Glass>
          <Glass className="card scroll-x">
            <table className="tbl">
              <thead>
                <tr><th>Runda</th>{stations.map((s) => <th key={s.id}>{s.name}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: rounds }, (_, r) => {
                  const round = roundAt(schedule, r);
                  return (
                    <tr key={r} className={r === cur ? "cur" : ""}>
                      <td>{r + 1}</td>
                      {stations.map((s) => <td key={s.id}>{(round[s.id] || []).map(nm).join(", ") || "—"}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Glass>
          <Button destructive onClick={async () => (await ask("Ștergi rotația?", DELETE)) && remove(ref(db, "schedule"))}>Șterge rotația</Button>
          <p className="helper">Stații: {stations.map((s) => sn(s.id)).join(", ")}</p>
        </>
      )}
    </>
  );
}

