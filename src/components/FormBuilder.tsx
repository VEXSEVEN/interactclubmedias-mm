"use client";
import { Select } from "./kit";
import { useRef, useState } from "react";
import { Button, Glass, Input, Switch } from "glisse";
import { uid } from "@/lib/defaults";
import { safeName, uploadFile } from "@/lib/storage";
import type { DocItem, FormField } from "@/lib/types";
import { Field } from "./ui";
import Icon from "./Icon";
import { useToast } from "./Toasts";

const TYPES: [FormField["type"], string][] = [
  ["text", "Short answer (text scurt)"], ["textarea", "Paragraph (text lung)"], ["radio", "Multiple choice (opțiune unică)"], ["select", "Dropdown"],
  ["checkbox", "Bifă (acord)"], ["email", "Email"], ["tel", "Telefon"], ["number", "Număr"], ["date", "Dată"],
];

const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
  const a = [...arr];
  const j = i + dir;
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

export default function FormBuilder({ fields, documents, captainLabel, onChange }: { fields: FormField[]; documents: DocItem[]; captainLabel: string; onChange: (p: { fields?: FormField[]; documents?: DocItem[] }) => void }) {
  const setF = (i: number, p: Partial<FormField>) => onChange({ fields: fields.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const setD = (i: number, p: Partial<DocItem>) => onChange({ documents: documents.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  return (
    <>
      <h2>Întrebări</h2>
      {fields.map((f, i) => (
        <Glass className="card stack field-card" key={f.id}>
          <div className="grid2">
            <Field label="Întrebare"><Input value={f.label} onValueChange={(v) => setF(i, { label: v })} /></Field>
            <Field label="Tip">
              <Select className="input" value={f.type} onChange={(e) => setF(i, { type: e.target.value as FormField["type"], options: ["radio", "select"].includes(e.target.value) ? f.options?.length ? f.options : ["Opțiunea 1", "Opțiunea 2"] : f.options })}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid2">
            <Field label="Câmp ID (cheie date)"><Input value={f.id} onValueChange={(v) => setF(i, { id: v.replace(/[^a-zA-Z0-9_]/g, "_") })} /></Field>
            <Field label="Placeholder (text ajutător)"><Input value={f.placeholder || ""} onValueChange={(v) => setF(i, { placeholder: v })} /></Field>
          </div>
          {(f.type === "radio" || f.type === "select") && (
            <div className="stack">
              <span className="label">Opțiuni</span>
              {(f.options || []).map((o, k) => (
                <div className="row" key={k}>
                  <div className="grow"><Input value={o} onValueChange={(v) => setF(i, { options: (f.options || []).map((x, n) => (n === k ? v : x)) })} /></div>
                  <Button destructive onClick={() => setF(i, { options: (f.options || []).filter((_, n) => n !== k) })} icon={<Icon n="x" size={18} />} aria-label="Șterge" />
                </div>
              ))}
              <div><Button onClick={() => setF(i, { options: [...(f.options || []), `Opțiunea ${(f.options?.length || 0) + 1}`] })}>Adaugă o altă opțiune</Button></div>
            </div>
          )}
          <div className="row between">
            <Field label="Se completează">
              <Select className="input" value={f.scope} onChange={(e) => setF(i, { scope: e.target.value as FormField["scope"] })}>
                <option value="team">O dată pe echipă</option><option value="member">Pentru fiecare membru</option>
              </Select>
            </Field>
            <span className="row">Obligatoriu <Switch aria-label="Obligatoriu" checked={f.required} onCheckedChange={(v) => setF(i, { required: v })} /></span>
          </div>
          <div className="row">
            <Button onClick={() => onChange({ fields: move(fields, i, -1) })} disabled={i === 0}>Sus</Button>
            <Button onClick={() => onChange({ fields: move(fields, i, 1) })} disabled={i === fields.length - 1}>Jos</Button>
            <Button onClick={() => onChange({ fields: [...fields.slice(0, i + 1), { ...f, id: uid("f") }, ...fields.slice(i + 1)] })}>Duplică</Button>
            <Button destructive onClick={() => onChange({ fields: fields.filter((_, j) => j !== i) })}>Șterge</Button>
          </div>
        </Glass>
      ))}
      <div><Button onClick={() => onChange({ fields: [...fields, { id: uid("f"), label: "Întrebare nouă", type: "text", required: false, scope: "team" }] })}>Adaugă întrebare</Button></div>

      <h2>Documente (descărcare → semnare → reîncărcare)</h2>
      <p className="muted">Încarci documentul (PDF/Word/imagine). Participanții îl descarcă, îl completează și semnează, apoi încarcă varianta semnată în formular.</p>
      {documents.map((d, i) => (
        <DocCard key={d.id} d={d} first1={captainLabel.trim() || "Membru 1"} first={i === 0} last={i === documents.length - 1} set={(p) => setD(i, p)}
          up={() => onChange({ documents: move(documents, i, -1) })} down={() => onChange({ documents: move(documents, i, 1) })}
          del={() => onChange({ documents: documents.filter((_, j) => j !== i) })} />
      ))}
      <div><Button onClick={() => onChange({ documents: [...documents, { id: uid("d"), title: "Document nou", text: "", required: true, signer: "captain" }] })}>Adaugă document</Button></div>
    </>
  );
}

function DocCard({ d, set, up, down, del, first, last, first1 }: { first1: string; d: DocItem; set: (p: Partial<DocItem>) => void; up: () => void; down: () => void; del: () => void; first: boolean; last: boolean }) {
  const toast = useToast();
  const inp = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(f?: File) {
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return toast("Fișierul depășește 15 MB.", "error");
    setBusy(true);
    try {
      const url = await uploadFile(`public/docs/${d.id}_${safeName(f.name)}`, f);
      set({ fileUrl: url, fileName: f.name });
      toast("Document încărcat. Apasă Salvează.", "success");
    } catch {
      toast("Încărcarea a eșuat (reguli Storage?).", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Glass className="card stack field-card">
      <Field label="Titlu document"><Input value={d.title} onValueChange={(v) => set({ title: v })} /></Field>
      <Field label="Instrucțiuni"><textarea className="input" rows={3} value={d.text} onChange={(e) => set({ text: e.target.value })} /></Field>
      <div className="row">
        <input ref={inp} type="file" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="filled" onClick={() => inp.current?.click()} disabled={busy}>{busy ? "Se încarcă…" : d.fileUrl ? "Înlocuiește fișierul" : "Încarcă fișierul de descărcat"}</Button>
        {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer">{d.fileName || "Vezi fișierul"}</a>}
      </div>
      <Field label="Cine încarcă varianta semnată">
        <Select className="input" value={d.signer} onChange={(e) => set({ signer: e.target.value as DocItem["signer"] })}>
          <option value="captain">{`Doar ${first1} (un fișier / echipă)`}</option><option value="all">Fiecare membru</option>
        </Select>
      </Field>
      <div className="row between">
        <span className="row">Obligatoriu <Switch aria-label="Obligatoriu" checked={d.required} onCheckedChange={(v) => set({ required: v })} /></span>
        <span className="row"><Button onClick={up} disabled={first}>Sus</Button><Button onClick={down} disabled={last}>Jos</Button><Button destructive onClick={del}>Șterge</Button></span>
      </div>
    </Glass>
  );
}
