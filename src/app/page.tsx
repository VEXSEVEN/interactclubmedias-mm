"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { get, ref, update } from "firebase/database";
import { Button, Glass, Input } from "glisse";
import { db } from "@/lib/firebase";
import { useSettings, useSlots } from "@/lib/db";
import { slugify, teamCode, uid } from "@/lib/defaults";
import { safeName, uploadFile } from "@/lib/storage";
import type { Registration } from "@/lib/types";
import { DynamicField, Field, Pill } from "@/components/ui";
import { FileField } from "@/components/kit";
import { useToast } from "@/components/Toasts";

type Member = { name: string; answers: Record<string, string | boolean> };

export default function FormularPage() {
  const { settings: s, loading } = useSettings();
  const { used } = useSlots();
  const toast = useToast();

  const [stage, setStage] = useState<"rules" | "form" | "done">("rules");
  const [left, setLeft] = useState<number | null>(null);
  const started = useRef(false);

  const [teamName, setTeamName] = useState("");
  const [teamAnswers, setTeamAnswers] = useState<Record<string, string | boolean>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  // regulamentul apare primul; butonul se deblocheaza dupa rulesDelaySec secunde
  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    setLeft(s.rulesDelaySec);
    const t = setInterval(() => setLeft((l) => (l === null ? l : Math.max(0, l - 1))), 1000);
    return () => clearInterval(t);
  }, [loading, s.rulesDelaySec]);

  useEffect(() => {
    if (loading) return;
    setMembers((m) => {
      const need = Math.max(1, s.minPerTeam);
      return m.length >= need ? m : [...m, ...Array.from({ length: need - m.length }, () => ({ name: "", answers: {} }))];
    });
  }, [loading, s.minPerTeam]);

  const teamFields = s.fields.filter((f) => f.scope !== "member");
  const memberFields = s.fields.filter((f) => f.scope === "member");
  const remaining = s.maxTeams > 0 ? Math.max(0, s.maxTeams - used) : null;
  const full = remaining === 0;
  const closed = !s.open || full;

  const who = (i: number) => (i === 0 && s.captainLabel.trim() ? s.captainLabel.trim() : `Membru ${i + 1}`);
  const setMember = (i: number, patch: Partial<Member>) => setMembers((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const signers = (d: { signer: string }) => (d.signer === "all" ? members.map((_, i) => i) : [0]);

  function validate(): string | null {
    if (teamName.trim().length < 2 || slugify(teamName).length < 2) return "Alege un nume de echipă (minim 2 caractere).";
    if (members.length < s.minPerTeam) return `Echipa are nevoie de minim ${s.minPerTeam} persoane.`;
    for (const f of teamFields) if (f.required && !teamAnswers[f.id]) return `Completează: ${f.label}`;
    for (const [i, m] of members.entries()) {
      if (m.name.trim().length < 2) return `Completează numele membrului ${i + 1}.`;
      for (const f of memberFields) if (f.required && !m.answers[f.id]) return `${m.name}: completează ${f.label}`;
    }
    for (const d of s.documents) {
      if (!d.required) continue;
      for (const i of signers(d)) if (!files[`${d.id}:${i}`]) return `Încarcă documentul semnat „${d.title}”${d.signer === "all" ? ` pentru ${members[i].name || who(i)}` : ""}.`;
    }
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) return toast(err, "error");
    if (closed) return toast("Înscrierile sunt închise sau nu mai sunt locuri.", "error");
    setBusy(true);
    try {
      const slug = slugify(teamName);
      if ((await get(ref(db, `names/${slug}`))).exists()) throw new Error("Există deja o echipă cu acest nume. Alege altul.");
      const slots = await get(ref(db, "slots"));
      if (s.maxTeams > 0 && (slots.exists() ? Object.keys(slots.val()).length : 0) >= s.maxTeams) throw new Error("Nu mai sunt locuri disponibile.");

      const c = teamCode(8);
      const uploaded: NonNullable<Registration["files"]> = {};
      for (const [k, f] of Object.entries(files)) {
        const [d, i] = k.split(":");
        const url = await uploadFile(`uploads/${c}/${d}_${i}_${safeName(f.name)}`, f);
        (uploaded[d] ||= {})[i] = { url, name: f.name };
      }
      const now = Date.now();
      const slotId = uid("sl");
      const reg: Registration = {
        teamName: teamName.trim(), slug, slotId, status: "pending", createdAt: now,
        answers: teamAnswers,
        members: members.map((m) => ({ name: m.name.trim(), answers: m.answers })),
        files: uploaded,
      };
      await update(ref(db), {
        [`registrations/${c}`]: JSON.parse(JSON.stringify(reg)),
        [`statuses/${c}`]: { teamName: reg.teamName, status: "pending", createdAt: now },
        [`slots/${slotId}`]: true,
        [`names/${slug}`]: true,
      });
      localStorage.setItem("imc_reg", c);
      setCode(c);
      setStage("done");
    } catch (e) {
      toast(e instanceof Error && !("code" in e) ? e.message : "Nu s-a putut trimite formularul. Încearcă din nou.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted center">Se încarcă…</p>;

  if (stage === "done")
    return (

      <Glass
        style={{
          "--lg-glass-bend": 0.65,
          "--lg-glass-dispersion": 0.6,
          "--lg-blur": "6px",
          "--lg-rim-shine": 0.35,
        } as React.CSSProperties}
        className="card stack center">
        <h1>Te-ai înregistrat!</h1>
        <p>Înscrierea echipei <strong>{teamName}</strong> a fost primită.</p>
        <p className="muted">
          Plata se face în ziua evenimentului. Imediat ce este confirmată, echipa se creează automat cu punctajul ei, iar pe pagina de status primești
          parola contului (utilizator: numele echipei).
        </p>
        <span className="helper">Codul înscrierii tale — păstrează-l:</span>
        <div className="teamcode">{code}</div>
        <Link href="/status"><Button >Vezi statusul înscrierii</Button></Link>
        <Link href="/install"><Button>Instalează aplicația pe telefon</Button></Link>
      </Glass>
    );

  const hero = (
    <Glass className="hero">
      {s.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.bannerUrl} alt="" className="banner" />
      )}
      <div className="stack center hero-body">
        <h1>{s.title}</h1>
        <h2 className="accent">{s.subtitle}</h2>
        <div className="row between" style={{ width: "100%" }}>
          <Pill tone={closed ? "busy" : "free"}>{!s.open ? "Înscrieri închise" : full ? "Locuri epuizate" : "Înscrieri deschise"}</Pill>
          <span className="helper">Locuri: <strong>{remaining === null ? "nelimitate" : `${remaining} libere din ${s.maxTeams}`}</strong></span>
        </div>
        {s.maxTeams > 0 && <div className="bar"><i style={{ width: `${Math.min(100, (used / s.maxTeams) * 100)}%` }} /></div>}
      </div>
    </Glass>
  );

  if (stage === "rules")
    return (
      <>
        {hero}
        <Glass className="card stack">
          <h2>{s.rulesTitle}</h2>
          <div className="rules">{s.rulesText}</div>
          <Button  disabled={left !== 0} onClick={() => setStage("form")}>
            {left ? `Citește regulamentul… ${left}s` : "Am citit și continui"}
          </Button>
        </Glass>
        <p className="helper center">Ai deja o înscriere? <Link href="/status">Verifică statusul</Link></p>
      </>
    );

  if (closed)
    return (
      <>
        {hero}
        <Glass className="card stack center">
          <h2>{full ? "Nu mai sunt locuri" : "Înscrierile sunt închise"}</h2>
          <p className="muted">Revino mai târziu sau întreabă un organizator.</p>
        </Glass>
      </>
    );

  return (
    <>
      {hero}
      <h2>Înscriere echipă</h2>

      <Glass className="card stack">
        <Field label="Numele echipei * (va fi și utilizatorul tău)">
          <Input value={teamName} onValueChange={setTeamName} maxLength={40} />
        </Field>
        {teamFields.map((f) => (
          <DynamicField key={f.id} f={f} value={teamAnswers[f.id]} onChange={(v) => setTeamAnswers((a) => ({ ...a, [f.id]: v }))} />
        ))}
      </Glass>

      <h2>Membri ({members.length}/{s.maxPerTeam})</h2>
      {members.map((m, i) => (
        <Glass className="card stack" key={i}>
          <div className="row between">
            <h3>{who(i)}</h3>
            {members.length > s.minPerTeam && <Button onClick={() => setMembers((x) => x.filter((_, j) => j !== i))} destructive>Scoate</Button>}
          </div>
          <Field label="Nume și prenume *"><Input value={m.name} onValueChange={(v) => setMember(i, { name: v })} /></Field>
          {memberFields.map((f) => (
            <DynamicField key={f.id} f={f} value={m.answers[f.id]} onChange={(v) => setMember(i, { answers: { ...m.answers, [f.id]: v } })} />
          ))}
        </Glass>
      ))}
      {members.length < s.maxPerTeam && <div><Button onClick={() => setMembers((m) => [...m, { name: "", answers: {} }])}>Adaugă membru</Button></div>}

      {s.documents.length > 0 && <h2>Documente</h2>}
      {s.documents.map((d) => (
        <Glass className="card stack" key={d.id}>
          <h3>{d.title}{d.required && " *"}</h3>
          {d.text && <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{d.text}</p>}
          {d.fileUrl ? (
            <a className="dl" href={d.fileUrl} target="_blank" rel="noreferrer" download>
              <Button>Descarcă documentul{d.fileName ? ` (${d.fileName})` : ""}</Button>
            </a>
          ) : (
            <p className="helper">Documentul nu a fost încă publicat de organizatori.</p>
          )}
          {signers(d).map((i) => {
            const key = `${d.id}:${i}`;
            return (
              <Field key={key} label={d.signer === "all" ? `Document semnat — ${members[i]?.name || who(i)}` : `Document semnat — ${who(0)}`} helper={files[key]?.name || "PDF sau poză, maxim 10 MB"}>
                <FileField file={files[key]} accept="application/pdf,image/*,.doc,.docx" placeholder="Alege fișierul semnat" onFile={(f) => {
                  if (f && f.size > 10 * 1024 * 1024) return toast("Fișierul depășește 10 MB.", "error");
                  setFiles((x) => {
                    const n = { ...x };
                    if (f) n[key] = f; else delete n[key];
                    return n;
                  });
                }} />
              </Field>
            );
          })}
        </Glass>
      ))}

      <Button  onClick={submit} disabled={busy}>{busy ? "Se trimite…" : "Trimite înscrierea"}</Button>
      {s.footerText && <p className="helper center">{s.footerText}</p>}
    </>
  );
}
