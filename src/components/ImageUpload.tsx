"use client";
import { useRef, useState } from "react";
import { Button, Input } from "glisse";
import { safeName, uploadFile } from "@/lib/storage";
import { useToast } from "./Toasts";

/** Incarca o imagine in Firebase Storage (public/) si intoarce URL-ul; poate fi lipit si manual. */
export default function ImageUpload({ label, value, onChange, folder }: { label: string; value: string; onChange: (url: string) => void; folder: string }) {
  const inp = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function pick(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Alege o imagine (JPG, PNG, WebP).", "error");
    if (f.size > 12 * 1024 * 1024) return toast("Imaginea depășește 12 MB.", "error");
    setBusy(true);
    try {
      onChange(await uploadFile(`public/${folder}/${Date.now()}_${safeName(f.name)}`, f));
      toast("Imagine încărcată. Apasă Salvează ca să o aplici.", "success");
    } catch {
      toast("Încărcarea a eșuat. Verifică regulile Storage și că ești conectat.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="preview" />
      )}
      <div className="row">
        <input ref={inp} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="filled" onClick={() => inp.current?.click()} disabled={busy}>
          {busy ? "Se încarcă…" : value ? "Schimbă imaginea" : "Încarcă imagine"}
        </Button>
        {value && <Button destructive onClick={() => onChange("")}>Elimină</Button>}
      </div>
      <Input value={value} onValueChange={onChange} placeholder="sau lipește un URL de imagine" />
    </div>
  );
}
