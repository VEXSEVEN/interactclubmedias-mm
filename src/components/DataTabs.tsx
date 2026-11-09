"use client";
import { useEffect, useMemo, useState } from "react";
import { get, ref, remove, set } from "firebase/database";
import { deleteObject, getDownloadURL, listAll, ref as sref } from "firebase/storage";
import { Button, Glass, Input, SegmentedControl } from "glisse";
import { app, db, storage } from "@/lib/firebase";
import { toList } from "@/lib/defaults";
import { total, useSettings, useStations, useVal } from "@/lib/db";
import type { AppEvent, Registration } from "@/lib/types";
import { Field, Pill } from "./ui";
import { Select } from "./kit";
import { useToast } from "./Toasts";
import Icon from "./Icon";
import { BulkBar, RoundCheck, useBulk } from "./bulk";
import { DELETE, useConfirm } from "./Confirm";

export default function DataTabs() {
  const [tab, setTab] = useState("rtdb");
  return (
    <>
      <div style={{width: "100%"}}>
      <SegmentedControl aria-label="Range" value={tab} onValueChange={setTab} items={[
        { value: "storage", label: "Storage" },
        { value: "firestore", label: "Firestore" }, 
        { value: "rtdb", label: "Realtime DB" }, 
        { value: "teams", label: "Echipe" }]} /></div>
      {tab === "storage" && <StorageTab />}
      {tab === "firestore" && <FirestoreTab />}
      {tab === "rtdb" && <RtdbTab />}
      {tab === "teams" && <TeamsTab />}
    </>
  );
}

/* ---------------- Realtime Database ---------------- */
function RtdbTab() {
  const toast = useToast();
  const ask = useConfirm();
  const [path, setPath] = useState("/");
  const [text, setText] = useState("");

  async function load(p = path) {
    try {
      const snap = await get(ref(db, p === "/" ? undefined : p));
      setText(JSON.stringify(snap.val(), null, 2) ?? "null");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Eroare la citire.", "error");
    }
  }
  useEffect(() => { load("/"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <Glass className="card stack">
      <h2>Realtime Database</h2>
      <p className="muted">Citește și modifică orice cale (ex: /teams, /scores/ABC123, /settings).</p>
      <Input value={path} onValueChange={setPath} onKeyDown={(e) => e.key === "Enter" && load()} />
      <div className="row">
        <Button onClick={() => load()}>Încarcă</Button>
        <Button onClick={async () => {
          try {
            if (path === "/" && !(await ask("Suprascrii TOATĂ baza de date?", { confirmLabel: "Suprascrie", destructive: true }))) return;
            await set(ref(db, path === "/" ? undefined : path), JSON.parse(text));
            toast("Salvat.", "success");
          } catch (e) { toast(e instanceof Error ? e.message : "JSON invalid.", "error"); }
        }}>Salvează</Button>
        <Button destructive onClick={async () => {
          if (path === "/" || !(await ask(`Ștergi ${path}?`, DELETE))) return;
          await remove(ref(db, path));
          setText("null");
        }}>Șterge calea</Button>
      </div>
      <textarea className="input area mono-area" rows={18} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
    </Glass>
  );
}

/* ---------------- Storage ---------------- */
async function deleteFolder(path: string): Promise<number> {
  const r = await listAll(sref(storage, path));
  let n = 0;
  for (const i of r.items) { await deleteObject(i); n++; }
  for (const p of r.prefixes) n += await deleteFolder(p.fullPath);
  return n;
}

function StorageFolder({ path, name, onDeleted }: { path: string; name: string; onDeleted?: () => void }) {
  const toast = useToast();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ folders: { name: string; path: string }[]; files: { name: string; path: string }[] } | null>(null);
  const bulk = useBulk((data?.files || []).map((f) => f.path));

  async function load() {
    try {
      const r = await listAll(sref(storage, path));
      setData({ folders: r.prefixes.map((p) => ({ name: p.name, path: p.fullPath })), files: r.items.map((i) => ({ name: i.name, path: i.fullPath })) });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nu pot citi Storage (reguli?).", "error");
      setData({ folders: [], files: [] });
    }
  }

  async function removeFolder() {
    if (!(await ask(`Ștergi folderul ${name}?`, { ...DELETE, message: "Se șterg toate fișierele din el, inclusiv din subfoldere." }))) return;
    setBusy(true);
    try {
      const n = await deleteFolder(path);
      toast(`${n} fișiere șterse.`, "success");
      if (onDeleted) onDeleted(); else load();
    } catch {
      toast("Nu s-a putut șterge folderul.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!(await ask(`Ștergi ${bulk.selected.length} fișiere?`, DELETE))) return;
    setBusy(true);
    try {
      await Promise.all(bulk.selected.map((p) => deleteObject(sref(storage, p))));
      bulk.clear();
      load();
    } catch {
      toast("Unele fișiere nu s-au putut șterge.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="panel" onToggle={(e) => { if (e.target !== e.currentTarget) return; const o = (e.target as HTMLDetailsElement).open; setOpen(o); if (o && !data) load(); }}>
      <summary>
        <span className="row" style={{ flexWrap: "nowrap" }}><Icon n="folder" size={20} /><strong>{name}</strong></span>
        <span className="row" style={{ flexWrap: "nowrap" }}>
          <span className="helper">{data ? `${data.folders.length} foldere · ${data.files.length} fișiere` : ""}</span>
          <Button destructive disabled={busy} icon={<Icon n="trash" size={18} />} aria-label={`Șterge folderul ${name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFolder(); }} />
        </span>
      </summary>
      {open && (
        <div className="stack">
          {!data && <p className="muted">Se încarcă…</p>}
          {data?.folders.map((f) => <StorageFolder key={f.path} path={f.path} name={f.name} onDeleted={load} />)}
          {data && data.files.length > 0 && <BulkBar bulk={bulk} total={data.files.length} onDelete={removeSelected} busy={busy} />}
          {data?.files.map((f) => (
            <div className="item" key={f.path}>
              <RoundCheck checked={bulk.has(f.path)} onChange={(v) => bulk.toggle(f.path, v)} label={`Selectează ${f.name}`} />
              <Icon n="file" size={20} />
              <span className="grow" style={{ wordBreak: "break-all" }}>{f.name}</span>
              <Button onClick={async () => window.open(await getDownloadURL(sref(storage, f.path)), "_blank")}>Deschide</Button>
              <Button destructive icon={<Icon n="trash" size={18} />} aria-label={`Șterge ${f.name}`} onClick={async () => { if (!(await ask(`Ștergi ${f.name}?`, DELETE))) return; await deleteObject(sref(storage, f.path)); load(); }} />
            </div>
          ))}
          {data && !data.folders.length && !data.files.length && <p className="muted">Gol.</p>}
        </div>
      )}
    </details>
  );
}

function StorageTab() {
  return (
    <>
      <p className="muted">Fișierele din Firebase Storage: <code>public/</code> (documente, imagini) și <code>uploads/</code> (documente semnate de echipe, pe cod de înscriere). Poți șterge fișiere, selecții sau foldere întregi.</p>
      <StorageFolder path="public" name="public" />
      <StorageFolder path="uploads" name="uploads" />
    </>
  );
}

/* ---------------- Firestore ---------------- */
function FirestoreTab() {
  const toast = useToast();
  const ask = useConfirm();
  const [col, setCol] = useState("");
  const [docs, setDocs] = useState<{ id: string; text: string }[]>([]);
  const [newId, setNewId] = useState("");

  async function load() {
    if (!col.trim()) return;
    try {
      const fs = await import("firebase/firestore");
      const snap = await fs.getDocs(fs.query(fs.collection(fs.getFirestore(app), col.trim()), fs.limit(50)));
      setDocs(snap.docs.map((d) => ({ id: d.id, text: JSON.stringify(d.data(), null, 2) })));
      if (snap.empty) toast("Colecție goală sau inexistentă.", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Firestore: acces refuzat (verifică regulile).", "error");
    }
  }
  const put = async (id: string, text: string) => {
    try {
      const fs = await import("firebase/firestore");
      await fs.setDoc(fs.doc(fs.getFirestore(app), col.trim(), id), JSON.parse(text));
      toast("Salvat.", "success");
      load();
    } catch (e) { toast(e instanceof Error ? e.message : "Eroare.", "error"); }
  };

  return (
    <Glass className="card stack">
      <h2>Firestore</h2>
      <p className="muted">Aplicația folosește Realtime Database; aici poți inspecta și o bază Firestore, dacă o ai activată (necesită reguli care permit citirea).</p>
      <Input value={col} onValueChange={setCol} placeholder="colecție, ex: users" onKeyDown={(e) => e.key === "Enter" && load()} />
      <div className="row"><Button onClick={load}>Încarcă colecția</Button></div>
      {docs.map((d, i) => (
        <div className="panel stack" key={d.id}>
          <strong>{d.id}</strong>
          <textarea className="input area mono-area" rows={6} value={d.text} onChange={(e) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)))} />
          <div className="row">
            <Button onClick={() => put(d.id, d.text)}>Salvează</Button>
            <Button destructive onClick={async () => {
              if (!(await ask(`Ștergi ${d.id}?`, DELETE))) return;
              const fs = await import("firebase/firestore");
              await fs.deleteDoc(fs.doc(fs.getFirestore(app), col.trim(), d.id));
              load();
            }}>Șterge</Button>
          </div>
        </div>
      ))}
      {col.trim() && (
        <div className="row">
          <div className="grow"><Input value={newId} onValueChange={setNewId} placeholder="id document nou" /></div>
          <Button onClick={() => newId.trim() && put(newId.trim(), "{}")}>Creează</Button>
        </div>
      )}
    </Glass>
  );
}

/* ---------------- Echipe: cine ce si cum a completat ---------------- */
const when = (ts?: number) => (ts ? new Date(ts).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function TeamsTab() {
  const { data } = useVal<Record<string, Registration>>("registrations");
  const { settings } = useSettings();
  const { stations } = useStations();
  const ids = useMemo(() => Object.entries(data || {}).sort((a, b) => b[1].createdAt - a[1].createdAt), [data]);
  const [sel, setSel] = useState("");
  const id = sel || ids[0]?.[0] || "";
  const reg = id ? data?.[id] : undefined;
  const { data: cred } = useVal<{ username: string; password: string }>(id ? `credentials/${id}` : null);
  const { data: scores } = useVal<Record<string, number>>(id ? `scores/${id}` : null);
  const { data: events } = useVal<Record<string, Omit<AppEvent, "id" | "target">>>(id ? `events/${id}` : null);
  const members = toList<Registration["members"][number]>(reg?.members);
  const show = (v: unknown) => (v === undefined || v === "" ? "—" : typeof v === "boolean" ? (v ? "Da" : "Nu") : String(v));

  return (
    <>
      <Field label="Echipa">
        <Select value={id} onChange={(e) => setSel(e.target.value)} placeholder="Alege echipa…">
          {ids.map(([k, r]) => <option key={k} value={k}>{r.teamName} · {k}</option>)}
        </Select>
      </Field>
      {reg && (
        <>
          <Glass className="card stack">
            <div className="row between"><h2>{reg.teamName}</h2><Pill tone={reg.status === "paid" ? "free" : reg.status === "rejected" ? "busy" : "warn"}>{reg.status}</Pill></div>
            <p className="helper">Cod {id} · înscrisă {when(reg.createdAt)} · {members.length} membri</p>
            {cred && <p>Cont: <code className="code">{cred.username}</code> / <code className="code">{cred.password}</code></p>}
            <p className="helper">Scor total: <strong>{total(scores || {})}</strong></p>
          </Glass>

          <Glass className="card stack">
            <h3>Răspunsuri echipă</h3>
            {settings.fields.filter((f) => f.scope !== "member").map((f) => <p key={f.id}><span className="muted">{f.label}: </span>{show(reg.answers?.[f.id])}</p>)}
          </Glass>

          {members.map((m, i) => (
            <Glass className="card stack" key={i}>
              <h3>{i === 0 && settings.captainLabel ? settings.captainLabel : `Membru ${i + 1}`}: {m.name}</h3>
              {settings.fields.filter((f) => f.scope === "member").map((f) => <p key={f.id}><span className="muted">{f.label}: </span>{show(m.answers?.[f.id])}</p>)}
              {settings.documents.map((d) => {
                const file = (reg.files?.[d.id] as Record<string, { url: string; name: string }> | undefined)?.[d.signer === "all" ? String(i) : "0"];
                if (d.signer === "captain" && i !== 0) return null;
                return <p key={d.id}><span className="muted">{d.title}: </span>{file ? <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a> : "neîncărcat"}</p>;
              })}
            </Glass>
          ))}

          <Glass className="card stack">
            <h3>Punctaj pe stații</h3>
            {stations.map((s) => <div className="row between" key={s.id}><span>{s.name}</span><span className="pts">{scores?.[s.id] ?? "—"}</span></div>)}
          </Glass>

          <Glass className="card stack">
            <h3>Notificări / mesaje primite</h3>
            {Object.entries(events || {}).sort((a, b) => b[1].ts - a[1].ts).map(([k, e]) => <p key={k}><span className="helper">{when(e.ts)} · </span><strong>{e.title}</strong> — {e.body}</p>)}
            {!events && <p className="muted">Niciun eveniment personal.</p>}
          </Glass>
        </>
      )}
      {!ids.length && <p className="muted center">Nicio echipă înscrisă.</p>}
    </>
  );
}
