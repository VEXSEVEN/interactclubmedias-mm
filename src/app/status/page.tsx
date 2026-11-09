"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Glass, Input } from "glisse";
import { useVal } from "@/lib/db";
import type { PublicStatus } from "@/lib/types";
import { Field, Pill } from "@/components/ui";
import { useToast } from "@/components/Toasts";

const TXT = {
  pending: ["În așteptare", "Înscrierea a fost primită. Plata se face în ziua evenimentului; după confirmare se creează echipa și apar aici utilizatorul și parola."],
  approved: ["Aprobată", "Documentele au fost verificate. Mai e nevoie doar de plata din ziua evenimentului, după care primești aici parola."],
  paid: ["Achitată — echipa e creată", "Participarea este confirmată. Folosește datele de mai jos ca să intri în contul echipei."],
  rejected: ["Respinsă", "Înscrierea nu a fost acceptată. Contactează un organizator pentru detalii."],
} as const;

export default function StatusPage() {
  const toast = useToast();
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  useEffect(() => {
    const c = localStorage.getItem("imc_reg") || "";
    setInput(c);
    setCode(c);
  }, []);

  const { data: st, loading } = useVal<PublicStatus>(code ? `statuses/${code}` : null);
  const paid = st?.status === "paid";
  const { data: cred } = useVal<{ username: string; password: string }>(paid ? `credentials/${code}` : null);

  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast("Copiat.", "success"));

  return (
    <>
      <h1>Status înscriere</h1>
      <Glass className="card stack">
        <Field label="Codul înscrierii (primit după trimiterea formularului)">
          <Input value={input} onValueChange={(v) => setInput(v.toUpperCase().trim())} maxLength={8} placeholder="ABCD2345" onKeyDown={(e) => e.key === "Enter" && (setCode(input), localStorage.setItem("imc_reg", input))} />
        </Field>
        <Button onClick={() => { setCode(input); localStorage.setItem("imc_reg", input); }} disabled={input.length < 8}>Verifică</Button>
      </Glass>

      {code && !loading && !st && <Glass className="card"><p className="muted center">Nu există nicio înscriere cu acest cod.</p></Glass>}

      {st && (
        <Glass className="card stack">
          <div className="row between"><h2>{st.teamName}</h2><Pill tone={paid ? "free" : st.status === "rejected" ? "busy" : "info"}>{TXT[st.status][0]}</Pill></div>
          <p className="muted">{TXT[st.status][1]}</p>
          {paid && cred && (
            <div className="stack">
              <div className="cred"><span className="helper">Utilizator (numele echipei)</span><strong>{cred.username}</strong><Button onClick={() => copy(cred.username)}>Copiază</Button></div>
              <div className="cred"><span className="helper">Parolă</span><strong className="mono">{cred.password}</strong><Button onClick={() => copy(cred.password)}>Copiază</Button></div>
              <p className="helper">Contul se folosește doar în aplicația instalată pe telefon. Instalează-o, apoi intră cu datele de mai sus.</p>
              <Link href="/install"><Button  >Instalează aplicația</Button></Link>
              <Link href="/jucator"><Button>Intră în contul echipei</Button></Link>
            </div>
          )}
        </Glass>
      )}
    </>
  );
}
