"use client";
import { DELETE, useConfirm } from "./Confirm";
import { useState } from "react";
import { ref, update } from "firebase/database";
import { Button, Glass, Input } from "glisse";
import { db } from "@/lib/firebase";
import { stationEmail, teamCode, uid } from "@/lib/defaults";
import { useStations, useVal } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { Station } from "@/lib/types";
import { Field, Pill } from "./ui";
import { useToast } from "./Toasts";

export default function StationsPanel() {
  const { stations } = useStations();
  const { data: secrets } = useVal<Record<string, string>>("stationSecrets");
  const { makeAuthUser } = useAuth();
  const toast = useToast();
  const ask = useConfirm();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");

  /** Creeaza contul tehnic al statiei: parola = codul de acces. */
  async function access(sid: string, base: Record<string, unknown> = {}) {
    const code = teamCode(8);
    const email = stationEmail(sid);
    const authUid = await makeAuthUser(email, code);
    await update(ref(db), {
      ...base,
      [`users/${authUid}`]: { role: "station", stationId: sid, email },
      [`stationSecrets/${sid}`]: code,
      [`stationCodes/${code}`]: sid,
    });
  }

  async function add() {
    if (!name.trim()) return;
    const id = uid("s");
    setBusy("new");
    try {
      await access(id, { [`stations/${id}`]: { name: name.trim(), capacity: 6, teamSlots: 2, occupied: false, updatedAt: Date.now() } });
      setName("");
      toast("Stație creată. Codul de acces e afișat în card.", "success");
    } catch {
      toast("Nu s-a putut crea stația.", "error");
    } finally {
      setBusy("");
    }
  }

  const save = (id: string, p: Partial<Station>) => update(ref(db, `stations/${id}`), JSON.parse(JSON.stringify(p))).then(() => toast("Salvat.", "success")).catch(() => toast("Eroare la salvare.", "error"));

  return (
    <>
      <Glass className="card stack">
        <h2>Stație nouă</h2>
        <Input value={name} onValueChange={setName} placeholder="Numele stației" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button variant="filled" onClick={add} disabled={!name.trim() || busy === "new"}>{busy === "new" ? "Se creează…" : "Adaugă stația"}</Button>
      </Glass>
      {stations.map((s) => (
        <StationRow key={s.id} s={s} code={secrets?.[s.id]} busy={busy === s.id}
          onSave={(p) => save(s.id, p)}
          onMakeCode={async () => { setBusy(s.id); try { await access(s.id); toast("Cod generat.", "success"); } catch { toast("Nu s-a putut genera codul.", "error"); } finally { setBusy(""); } }}
          onDelete={async () => {
            if (!(await ask(`Ștergi stația ${s.name}?`, { ...DELETE, message: "Codul ei de acces nu va mai funcționa." }))) return;
            const code = secrets?.[s.id];
            await update(ref(db), { [`stations/${s.id}`]: null, [`stationSecrets/${s.id}`]: null, ...(code ? { [`stationCodes/${code}`]: null } : {}) });
          }} />
      ))}
    </>
  );
}

function StationRow({ s, code, busy, onSave, onDelete, onMakeCode }: { s: Station; code?: string; busy: boolean; onSave: (p: Partial<Station>) => void; onDelete: () => void; onMakeCode: () => void }) {
  const [v, setV] = useState({ name: s.name, description: s.description || "", capacity: String(s.capacity ?? 6), teamSlots: String(s.teamSlots ?? 2), maxPoints: String(s.maxPoints ?? "") });
  return (
    <div className="panel stack">
      <div className="row between">
        <h3>{s.name}</h3>
        {code ? <span className="row"><Pill tone="info">Cod acces</Pill><code className="code">{code}</code><Button onClick={() => navigator.clipboard?.writeText(code)}>Copiază</Button></span>
          : <Button variant="filled" onClick={onMakeCode} disabled={busy}>{busy ? "Se generează…" : "Generează cod de acces"}</Button>}
      </div>
      <Field label="Nume"><Input value={v.name} onValueChange={(x) => setV({ ...v, name: x })} /></Field>
      <Field label="Descriere"><Input value={v.description} onValueChange={(x) => setV({ ...v, description: x })} /></Field>
      <div className="grid2">
        <Field label="Persoane care pot intra odată"><Input type="number" value={v.capacity} onValueChange={(x) => setV({ ...v, capacity: x })} /></Field>
        <Field label="Echipe simultan (stație ocupată când e plină)"><Input type="number" value={v.teamSlots} onValueChange={(x) => setV({ ...v, teamSlots: x })} /></Field>
        <Field label="Punctaj maxim (opțional)"><Input type="number" value={v.maxPoints} onValueChange={(x) => setV({ ...v, maxPoints: x })} /></Field>
      </div>
      <div className="row between">
        <Button destructive onClick={onDelete}>Șterge</Button>
        <Button variant="filled" onClick={() => onSave({ name: v.name.trim() || s.name, description: v.description, capacity: Math.max(1, Number(v.capacity) || 1), teamSlots: Math.max(1, Number(v.teamSlots) || 2), maxPoints: v.maxPoints ? Number(v.maxPoints) : (null as unknown as undefined) })}>Salvează</Button>
      </div>
    </div>
  );
}
