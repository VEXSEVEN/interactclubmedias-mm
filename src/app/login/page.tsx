"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Glass, Input, SegmentedControl } from "glisse";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/ui";
import { useToast } from "@/components/Toasts";

export default function LoginPage() {
  const { login, loginStation, user, profile, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState("station");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      if (mode === "station") {
        await loginStation(code);
        router.push("/statie");
      } else {
        await login(email, pass);
        router.push("/statie");
      }
    } catch {
      toast(mode === "station" ? "Cod de stație invalid." : "Email sau parolă incorecte.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (user && profile && profile.role !== "team")
    return (
      <Glass className="card stack center">
        <h2>Ești conectat</h2>
        <p className="muted">Rol: {profile.role}</p>
        <Button variant="filled" onClick={() => router.push(profile.role === "developer" ? "/developer" : profile.role === "organizer" ? "/organizator" : "/statie")}>Continuă</Button>
        <Button onClick={() => logout()}>Schimbă contul</Button>
      </Glass>
    );

  return (
    <Glass className="card stack">
      <h1>Staff</h1>
      <SegmentedControl aria-label="Tip acces" value={mode} onValueChange={setMode} items={[{ value: "station", label: "Cod stație" }, { value: "staff", label: "Organizator / Dev" }]} />
      {mode === "station" ? (
        <>
          <p className="muted">Fiecare stație are un cod propriu de 8 caractere, primit de la organizator. Codul deschide doar stația ta.</p>
          <Field label="Cod de acces stație"><Input value={code} onValueChange={(v) => setCode(v.toUpperCase().trim())} maxLength={8} placeholder="ABCD2345" onKeyDown={(e) => e.key === "Enter" && go()} /></Field>
          <Button variant="filled" onClick={go} disabled={busy || code.length < 8}>{busy ? "Se verifică…" : "Intră în stație"}</Button>
        </>
      ) : (
        <>
          <Field label="Email"><Input type="email" value={email} onValueChange={setEmail} autoComplete="username" /></Field>
          <Field label="Parolă"><Input type="password" value={pass} onValueChange={setPass} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && go()} /></Field>
          <Button variant="filled" onClick={go} disabled={busy || !email || !pass}>{busy ? "Se conectează…" : "Conectează-te"}</Button>
        </>
      )}
    </Glass>
  );
}
