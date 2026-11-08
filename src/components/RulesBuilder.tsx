"use client";
import { Select } from "./kit";
import { Button, Glass, Input, Switch } from "glisse";
import { uid } from "@/lib/defaults";
import type { Action, Condition, FormField, Rule, Variable } from "@/lib/types";
import { Field } from "./ui";
import Icon from "./Icon";

const TRIGGERS: Record<Rule["trigger"], string> = { on_approve: "Când înscrierea e aprobată", on_paid: "Când echipa achită (se creează echipa)", on_reject: "Când înscrierea e respinsă" };
const OPS: Record<Condition["operator"], string> = { equals: "este egal cu", not_equals: "diferit de", contains: "conține", not_contains: "nu conține", gt: ">", lt: "<", gte: "≥", lte: "≤" };
const ACTS: Record<Action["type"], string> = { decrement_var: "Scade variabila", increment_var: "Crește variabila", set_var: "Setează variabila", close_form: "Închide înscrierile", open_form: "Deschide înscrierile" };

export default function RulesBuilder({ variables, rules, fields, onChange }: { variables: Variable[]; rules: Rule[]; fields: FormField[]; onChange: (p: { variables?: Variable[]; rules?: Rule[] }) => void }) {
  const setV = (i: number, p: Partial<Variable>) => onChange({ variables: variables.map((v, j) => (j === i ? { ...v, ...p } : v)) });
  const setR = (i: number, p: Partial<Rule>) => onChange({ rules: rules.map((v, j) => (j === i ? { ...v, ...p } : v)) });

  return (
    <>
      <Glass className="card stack">
        <h2>Variabile personalizate (int, float, str, bool)</h2>
        <p className="muted">Contoare și valori globale pentru limite sau decizii logice (ex: locuri_liceu).</p>
        {variables.map((v, i) => (
          <div className="row" key={v.id}>
            <div className="grow"><Input value={v.name} onValueChange={(x) => setV(i, { name: x.replace(/\s+/g, "_") })} placeholder="nume_variabila" /></div>
            <Select className="input" style={{ width: 120 }} value={v.type} onChange={(e) => setV(i, { type: e.target.value as Variable["type"], value: e.target.value === "bool" ? false : e.target.value === "str" ? "" : 0 })}>
              <option value="int">int</option><option value="float">float</option><option value="str">str</option><option value="bool">bool</option>
            </Select>
            <div style={{ width: 130 }}>
              {v.type === "bool" ? <Switch aria-label="Valoare" checked={!!v.value} onCheckedChange={(x) => setV(i, { value: x })} /> :
                <Input value={String(v.value)} type={v.type === "str" ? "text" : "number"} onValueChange={(x) => setV(i, { value: v.type === "str" ? x : Number(x) || 0 })} />}
            </div>
            <Button destructive onClick={() => onChange({ variables: variables.filter((_, j) => j !== i) })} icon={<Icon n="x" size={18} />} aria-label="Șterge" />
          </div>
        ))}
        {!variables.length && <p className="helper center">Nu există variabile definite încă.</p>}
        <div><Button variant="filled" onClick={() => onChange({ variables: [...variables, { id: uid("v"), name: `variabila_${variables.length + 1}`, type: "int", value: 10 }] })}>Adaugă variabilă</Button></div>
      </Glass>

      <Glass className="card stack">
        <h2>Constructor logic pe blocuri</h2>
        <p className="muted">CÂND (eveniment) → DACĂ (condiții ȘI/SAU) → ATUNCI și ALTFEL (acțiuni). Regulile rulează când organizatorul aprobă, respinge sau marchează plata.</p>
        {rules.map((r, i) => (
          <div className="block stack" key={r.id}>
            <div className="row">
              <div className="grow"><Input value={r.name} onValueChange={(x) => setR(i, { name: x })} /></div>
              <Button destructive onClick={() => onChange({ rules: rules.filter((_, j) => j !== i) })}>Șterge blocul</Button>
            </div>
            <Field label="CÂND">
              <Select className="input" value={r.trigger} onChange={(e) => setR(i, { trigger: e.target.value as Rule["trigger"] })}>
                {Object.entries(TRIGGERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
            <div className="stack">
              <div className="row between">
                <span className="label">DACĂ</span>
                <Select className="input" style={{ width: 190 }} value={r.logic} onChange={(e) => setR(i, { logic: e.target.value as Rule["logic"] })}>
                  <option value="and">TOATE condițiile (ȘI)</option><option value="or">ORICARE condiție (SAU)</option>
                </Select>
              </div>
              {r.conditions.map((c, k) => {
                const upd = (p: Partial<Condition>) => setR(i, { conditions: r.conditions.map((x, n) => (n === k ? { ...x, ...p } : x)) });
                return (
                  <div className="row" key={c.id}>
                    <Select className="input" style={{ width: 110 }} value={c.sourceType} onChange={(e) => upd({ sourceType: e.target.value as Condition["sourceType"], sourceId: "" })}>
                      <option value="field">Câmp</option><option value="variable">Variabilă</option>
                    </Select>
                    <Select className="input grow" value={c.sourceId} onChange={(e) => upd({ sourceId: e.target.value })}>
                      <option value="">Alege…</option>
                      {c.sourceType === "field" ? fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>) : variables.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
                    </Select>
                    <Select className="input" style={{ width: 130 }} value={c.operator} onChange={(e) => upd({ operator: e.target.value as Condition["operator"] })}>
                      {Object.entries(OPS).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
                    </Select>
                    <div style={{ width: 130 }}><Input value={c.value} onValueChange={(x) => upd({ value: x })} /></div>
                    <Button destructive onClick={() => setR(i, { conditions: r.conditions.filter((_, n) => n !== k) })} icon={<Icon n="x" size={18} />} aria-label="Șterge" />
                  </div>
                );
              })}
              <div><Button onClick={() => setR(i, { conditions: [...r.conditions, { id: uid("c"), sourceType: "variable", sourceId: "", operator: "lte", value: "0" }] })}>Adaugă condiție</Button></div>
            </div>
            <Actions title="ATUNCI" list={r.actions} variables={variables} onChange={(a) => setR(i, { actions: a })} />
            <Actions title="ALTFEL" list={r.elseActions || []} variables={variables} onChange={(a) => setR(i, { elseActions: a })} />
          </div>
        ))}
        {!rules.length && <p className="helper center">Nu există blocuri de automatizare create încă.</p>}
        <div><Button variant="filled" onClick={() => onChange({ rules: [...rules, { id: uid("r"), name: `Regulă ${rules.length + 1}`, trigger: "on_paid", logic: "and", conditions: [], actions: [] }] })}>Adaugă bloc nou</Button></div>
      </Glass>
    </>
  );
}

function Actions({ title, list, variables, onChange }: { title: string; list: Action[]; variables: Variable[]; onChange: (a: Action[]) => void }) {
  const upd = (k: number, p: Partial<Action>) => onChange(list.map((x, n) => (n === k ? { ...x, ...p } : x)));
  return (
    <div className="stack">
      <span className="label">{title}</span>
      {list.map((a, k) => (
        <div className="row" key={a.id}>
          <Select className="input grow" value={a.type} onChange={(e) => upd(k, { type: e.target.value as Action["type"] })}>
            {Object.entries(ACTS).map(([t, l]) => <option key={t} value={t}>{l}</option>)}
          </Select>
          {a.type.endsWith("_var") && (
            <Select className="input grow" value={a.targetVar || ""} onChange={(e) => upd(k, { targetVar: e.target.value })}>
              <option value="">Variabila…</option>
              {variables.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
            </Select>
          )}
          {(a.type === "increment_var" || a.type === "decrement_var") && <div style={{ width: 90 }}><Input type="number" value={String(a.amount ?? 1)} onValueChange={(x) => upd(k, { amount: Number(x) || 1 })} /></div>}
          {a.type === "set_var" && <div style={{ width: 120 }}><Input value={a.value || ""} onValueChange={(x) => upd(k, { value: x })} /></div>}
          <Button destructive onClick={() => onChange(list.filter((_, n) => n !== k))} icon={<Icon n="x" size={18} />} aria-label="Șterge" />
        </div>
      ))}
      <div><Button onClick={() => onChange([...list, { id: uid("a"), type: "decrement_var", amount: 1 }])}>Adaugă acțiune</Button></div>
    </div>
  );
}
