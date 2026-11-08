"use client";
import { Glass, Input } from "glisse";
import type { FormField } from "@/lib/types";
import { DateField, RadioGroup, Select, ToggleRow } from "./kit";

export function Field({ label, helper, children }: { label?: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      {children}
      {helper && <span className="helper">{helper}</span>}
    </div>
  );
}

/** Camp dinamic generat din setarile organizatorului. */
export function DynamicField({ f, value, onChange }: { f: FormField; value: string | boolean | undefined; onChange: (v: string | boolean) => void }) {
  const label = f.label + (f.required ? " *" : "");
  const v = (value as string) || "";
  if (f.type === "textarea")
    return <Field label={label} helper={f.helper}><textarea className="input area" rows={3} placeholder={f.placeholder} value={v} onChange={(e) => onChange(e.target.value)} /></Field>;
  if (f.type === "select")
    return (
      <Field label={label} helper={f.helper}>
        <Select value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder || "Alege…"}>
          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </Field>
    );
  if (f.type === "radio")
    return <Field label={label} helper={f.helper}><RadioGroup value={v} options={f.options || []} onChange={onChange} /></Field>;
  if (f.type === "checkbox") return <ToggleRow checked={!!value} onChange={onChange}>{label}</ToggleRow>;
  if (f.type === "date") return <Field label={label} helper={f.helper}><DateField value={v} onChange={onChange} placeholder={f.placeholder} /></Field>;
  return (
    <Field label={label} helper={f.helper}>
      <Input type={f.type} placeholder={f.placeholder} value={v} onValueChange={onChange} inputMode={f.type === "tel" ? "tel" : f.type === "number" ? "numeric" : undefined} />
    </Field>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Glass className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="helper">{sub}</span>}
    </Glass>
  );
}

export function Pill({ tone, children }: { tone: "free" | "busy" | "info" | "warn"; children: React.ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
