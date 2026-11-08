"use client";
import { useMemo, useState } from "react";
import { ref } from "firebase/database";
import { Button, Glass, Input } from "glisse";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { sendEvent } from "@/lib/events";
import { useTeams, useVal } from "@/lib/db";
import type { AppEvent } from "@/lib/types";
import { Field } from "./ui";
import { Select } from "./kit";
import { BulkBar, RoundCheck, useBulk } from "./bulk";
import { DELETE, useConfirm } from "./Confirm";
import { update } from "firebase/database";
import { useToast } from "./Toasts";

const when = (ts: number) => new Date(ts).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Mesagerie admin (organizator + developer): ajunge in inbox si ca push, chiar si cu aplicatia inchisa. */
export default function Compose() {
  const { profile } = useAuth();
  const { teams } = useTeams();
  const toast = useToast();
  const ask = useConfirm();
  const { data } = useVal<Record<string, Record<string, Omit<AppEvent, "id" | "target">>>>("events");
  const { data: tokens } = useVal<Record<string, unknown>>("pushTokens");
  const [target, setTarget] = useState("_all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const label = (t: string) => (t === "_all" ? "Toți" : t === "_teams" ? "Toate echipele" : t === "_stations" ? "Toate stațiile" : teams.find((x) => x.id === t)?.name || t);
  const history = useMemo(
    () =>
      Object.entries(data || {})
        .flatMap(([t, m]) => Object.entries(m || {}).map(([id, e]) => ({ ...e, id, target: t }) as AppEvent))
        .filter((e) => e.type === "message")
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 40),
    [data]
  );

  const bulk = useBulk(history.map((e) => `${e.target}/${e.id}`));
  async function delMany() {
    if (!(await ask(`Ștergi ${bulk.selected.length} mesaje?`, DELETE))) return;
    await update(ref(db), Object.fromEntries(bulk.selected.map((k) => [`events/${k}`, null])));
    bulk.clear();
  }

  async function send() {
    if (!title.trim() || !body.trim()) return toast("Completează titlul și mesajul.", "error");
    setBusy(true);
    try {
      await sendEvent(target, { type: "message", title: title.trim(), body: body.trim(), from: profile?.name || (profile?.role === "developer" ? "Developer" : "Organizator") });
      setTitle("");
      setBody("");
      toast("Mesaj trimis.", "success");
    } catch {
      toast("Nu s-a putut trimite.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Glass className="card stack">
        <h2>Mesaj nou</h2>
        <Field label="Destinatari">
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="_all">Toți (echipe + stații)</option>
            <option value="_teams">Toate echipele</option>
            <option value="_stations">Toate stațiile</option>
            <optgroup label="O echipă">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
          </Select>
        </Field>
        <Field label="Titlu"><Input value={title} onValueChange={setTitle} maxLength={80} /></Field>
        <Field label="Mesaj"><textarea className="input area" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} /></Field>
        <Button variant="filled" onClick={send} disabled={busy}>{busy ? "Se trimite…" : "Trimite mesajul"}</Button>
        {tokens && <p className="helper">Dispozitive înregistrate pentru push: <strong>{Object.keys(tokens).length}</strong></p>}
        <p className="helper">Destinatarii îl primesc ca notificare. Dacă aplicația era închisă, îl găsesc oricum în Mesaje la următoarea deschidere.</p>
      </Glass>

      <h2>Trimise</h2>
      <BulkBar bulk={bulk} total={history.length} onDelete={delMany} />
      <div className="list">
        {history.map((e) => (
          <div className="panel stack" key={e.id}>
            <div className="row between"><span className="row" style={{ flexWrap: "nowrap" }}><RoundCheck checked={bulk.has(`${e.target}/${e.id}`)} onChange={(v) => bulk.toggle(`${e.target}/${e.id}`, v)} label="Selectează" /><strong>{e.title}</strong></span><span className="helper">{when(e.ts)} · {label(e.target)}</span></div>
            <p style={{ whiteSpace: "pre-wrap" }}>{e.body}</p>
            <div><Button destructive onClick={async () => { if (await ask("Ștergi mesajul?", DELETE)) await update(ref(db), { [`events/${e.target}/${e.id}`]: null }); }}>Șterge</Button></div>
          </div>
        ))}
        {!history.length && <p className="muted center">Niciun mesaj trimis încă.</p>}
      </div>
    </>
  );
}
