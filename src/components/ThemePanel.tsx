"use client";
import { useEffect, useState } from "react";
import { Button, Glass, SegmentedControl, Slider } from "glisse";
import { THEME_PRESETS } from "@/lib/defaults";
import { applyTheme, THEME_CACHE_KEY } from "@/lib/theme";
import { useSettings } from "@/lib/db";
import { db } from "@/lib/firebase";
import { ref, update } from "firebase/database";
import type { Theme } from "@/lib/types";
import { Field } from "./ui";
import { ColorField } from "./kit";
import ImageUpload from "./ImageUpload";

type ColorKey = "text" | "glassTint" | "line" | "filled" | "tabSelected" | "free" | "busy" | "warn";

export default function ThemePanel() {
  const { settings, loading } = useSettings();

  const [bg, setBg] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  const activeTheme = theme ?? settings?.theme;
  const bgV = bg ?? settings?.bgUrl ?? "";
  const banV = banner ?? settings?.bannerUrl ?? "";

  const set = (p: Partial<Theme>) => {
    if (!activeTheme) return;
    const t = { ...activeTheme, ...p };
    applyTheme(t);
    setTheme(t);
  };

  useEffect(() => {
    return () => {
      if (settings?.theme) applyTheme(settings.theme);
    };
  }, [settings?.theme]);

  if (loading || !activeTheme) return <p className="muted center">Se încarcă…</p>;

  const opt = (key: ColorKey, label: string, auto: string, help?: string) => (
    <Field label={label} helper={help}>
      <ColorField 
        value={(activeTheme[key] as string) || auto} 
        label={label} 
        onChange={(v) => set({ [key]: v } as Partial<Theme>)} 
        onClear={activeTheme[key] ? () => set({ [key]: undefined } as Partial<Theme>) : undefined} 
      />
    </Field>
  );

  return (
    <>
      <Glass className="card stack">
        <h2>Imagini site</h2>
        <p className="muted">Încarcă o imagine sau lipește un URL. Fundalul apare pe tot site-ul, bannerul în capul formularului.</p>
        <ImageUpload label="Fundal global" value={bgV} onChange={setBg} folder="bg" />
        <ImageUpload label="Banner formular" value={banV} onChange={setBanner} folder="banner" />
        <div>
          <Button onClick={async () => {
            const themeToSave = theme ?? settings.theme;
            await update(ref(db, "settings"), JSON.parse(JSON.stringify({ bgUrl: bgV, bannerUrl: banV, theme: themeToSave })));
            
            applyTheme(themeToSave);
            try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(themeToSave)); } catch {}
            
            setBg(null); 
            setBanner(null); 
            setTheme(null);
            alert("Salvat cu succes!");
          }}>
            Reîncarcă Tema Actuală & Salvează imaginile și tema
          </Button>
        </div>
      </Glass>

      <Glass className="card stack">
        <h2>Temă — presetări</h2>
        <div className="row">
          {THEME_PRESETS.map((p) => (
            <Button 
              key={p.name} 
              onClick={() => set({ ...p.theme, text: undefined, glassTint: undefined, line: undefined, filled: undefined, tabSelected: undefined })} 
              tint={p.theme.accent}
            >
              {p.name}
            </Button>
          ))}
        </div>
        <SegmentedControl 
          aria-label="Mod" 
          value={activeTheme.mode} 
          onValueChange={(v) => set({ mode: v as Theme["mode"] })} 
          items={[{ value: "light", label: "Luminos" }, { value: "dark", label: "Întunecat" }]} 
        />
      </Glass>

      <Glass className="card stack">
        <h2>Culori principale</h2>
        <div className="grid2">
          <Field label="Culoare principală" helper="Schimbă butoanele, accentele și tot textul site-ul (textul se calculează din ea).">
            <ColorField value={activeTheme.accent} label="Culoare principală" onChange={(v) => set({ accent: v })} />
          </Field>
          <Field label="Culoare fundal">
            <ColorField value={activeTheme.bg} label="Culoare fundal" onChange={(v) => set({ bg: v })} />
          </Field>
        </div>
        <Field label={`Subtitluri: ${activeTheme.subMix}% din culoarea fundalului`} helper="Textul secundar = culoarea textului amestecată cu acest procent din fundal.">
          <Slider aria-label="Amestec subtitluri" min={0} max={60} step={1} value={activeTheme.subMix} onValueChange={(v) => set({ subMix: v })} />
        </Field>
      </Glass>

      <Glass className="card stack">
        <h2>Componente</h2>
        <div className="grid2">
          {opt("text", "Text (suprascrie automat)", "#0d1b36", "Auto = derivat din culoarea principală.")}
          {opt("filled", "Butoane principale", activeTheme.accent)}
          {opt("tabSelected", "Tab selectat (dock)", activeTheme.accent)}
          {opt("line", "Borduri", activeTheme.accent)}
          {opt("free", "Liber / succes", "#0a8f5a")}
          {opt("busy", "Ocupat / eroare", "#d6342a")}
          {opt("warn", "În așteptare", "#b7791f")}
        </div>
      </Glass>

      <Glass className="card stack">
        <h2>Sticlă (liquid glass)</h2>
        <div className="grid2">{opt("glassTint", "Culoarea sticlei", "#ffffff")}</div>
        <Field label={`Opacitatea sticlei: ${Math.round((activeTheme.glassAlpha ?? (activeTheme.mode === "dark" ? 0.07 : 0.16)) * 100)}%`}>
          <Slider aria-label="Opacitate" min={0} max={0.6} step={0.01} value={activeTheme.glassAlpha ?? (activeTheme.mode === "dark" ? 0.07 : 0.16)} onValueChange={(v) => set({ glassAlpha: v })} />
        </Field>
        <Field label={`Refracția: ${activeTheme.bend.toFixed(2)}`}>
          <Slider aria-label="Refracție" min={0} max={1} step={0.05} value={activeTheme.bend} onValueChange={(v) => set({ bend: v })} />
        </Field>
        <Field label={`Frost (blur): ${activeTheme.blur}px`}>
          <Slider aria-label="Blur" min={0} max={24} step={1} value={activeTheme.blur} onValueChange={(v) => set({ blur: v })} />
        </Field>
        <Field label={`Luciul marginii: ${activeTheme.rim.toFixed(2)}`}>
          <Slider aria-label="Luciu" min={0} max={1} step={0.05} value={activeTheme.rim} onValueChange={(v) => set({ rim: v })} />
        </Field>
      </Glass>
    </>
  );
}