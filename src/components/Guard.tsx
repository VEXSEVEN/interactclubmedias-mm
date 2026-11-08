"use client";
import Link from "next/link";
import { Button, Glass } from "glisse";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export default function Guard({ roles, children, station }: { roles: Role[]; children: React.ReactNode; station?: boolean }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <p className="muted center">Se încarcă…</p>;
  if (!user)
    return (
      <Glass className="card stack center">
        <h2>Autentificare necesară</h2>
        <p className="muted">{station ? "Introdu codul de acces al stației." : "Această pagină este pentru staff."}</p>
        <Link href="/login">
          <Button variant="filled">{station ? "Introdu codul stației" : "Conectează-te"}</Button>
        </Link>
      </Glass>
    );
  if (!profile)
    return (
      <Glass className="card stack">
        <h2>Cont fără rol</h2>
        <p className="muted">Contul tău nu are încă un rol atribuit. Cere unui developer să îți creeze profilul. UID-ul tău:</p>
        <code className="code">{user.uid}</code>
      </Glass>
    );
  if (!roles.includes(profile.role) && profile.role !== "developer")
    return (
      <Glass className="card stack center">
        <h2>Acces interzis</h2>
        <p className="muted">Contul tău ({profile.role}) nu are acces aici.{station ? " Pentru o stație ai nevoie de codul ei de acces." : ""}</p>
        {station && <Link href="/login"><Button variant="filled">Introdu codul stației</Button></Link>}
      </Glass>
    );
  return <>{children}</>;
}
