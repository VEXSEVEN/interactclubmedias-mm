"use client";
import { useEffect } from "react";
import { Button, Glass, SegmentedControl, Slider } from "glisse";
import { THEME_PRESETS } from "@/lib/defaults";
import { applyTheme } from "@/lib/theme";
import { useSettings } from "@/lib/db";
import type { Theme } from "@/lib/types";
import { Field } from "./ui";
import { ColorField } from "./kit";

type ColorKey = "text" | "glassTint" | "line" | "filled" | "tabSelected" | "free" | "busy" | "warn";

/** Tema completa, pe componente. Doar developerul o vede. Se previzualizeaza live; Salveaza o aplica tuturor. */
export default function ThemePanel({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const { settings } = useSettings();
  const set = (p: Partial<Theme>) => {
    const t = { ...theme, ...p };
    applyTheme(t);
    onChange(t);
  };
  useEffect(() => () => applyTheme(settings.theme), [settings.theme]); // la iesire fara salvare revine tema salvata

  const opt = (key: ColorKey, label: string, auto: string, help?: string) => (
    <Field label={label} helper={help}>
      <ColorField value={(theme[key] as string) || auto} label={label} onChange={(v) => set({ [key]: v } as Partial<Theme>)} onClear={theme[key] ? () => set({ [key]: undefined } as Partial<Theme>) : undefined} />
    </Field>
  );

  return (
    <>
      <Glass className="card stack">
        <h2>Temă — presetări</h2>
        <div className="row">
          {THEME_PRESETS.map((p) => <Button key={p.name} onClick={() => set({ ...p.theme, text: undefined, glassTint: undefined, line: undefined, filled: undefined, tabSelected: undefined })} tint={p.theme.accent}>{p.name}</Button>)}
        </div>
        <SegmentedControl aria-label="Mod" value={theme.mode} onValueChange={(v) => set({ mode: v as Theme["mode"] })} items={[{ value: "light", label: "Luminos" }, { value: "dark", label: "Întunecat" }]} />
      </Glass>

      <Glass className="card stack">
        <h2>Culori principale</h2>
        <div className="grid2">
          <Field label="Culoare principală" helper="Schimbă butoanele, accentele și tot textul site-ul (textul se calculează din ea)."><ColorField value={theme.accent} label="Culoare principală" onChange={(v) => set({ accent: v })} /></Field>
          <Field label="Culoare fundal"><ColorField value={theme.bg} label="Culoare fundal" onChange={(v) => set({ bg: v })} /></Field>
        </div>
        <Field label={`Subtitluri: ${theme.subMix}% din culoarea fundalului`} helper="Textul secundar = culoarea textului amestecată cu acest procent din fundal.">
          <Slider aria-label="Amestec subtitluri" min={0} max={60} step={1} value={theme.subMix} onValueChange={(v) => set({ subMix: v })} />
        </Field>
      </Glass>

      <Glass className="card stack">
        <h2>Componente</h2>
        <div className="grid2">
          {opt("text", "Text (suprascrie automat)", "#0d1b36", "Auto = derivat din culoarea principală.")}
          {opt("filled", "Butoane principale", theme.accent)}
          {opt("tabSelected", "Tab selectat (dock)", theme.accent)}
          {opt("line", "Borduri", theme.accent)}
          {opt("free", "Liber / succes", "#0a8f5a")}
          {opt("busy", "Ocupat / eroare", "#d6342a")}
          {opt("warn", "În așteptare", "#b7791f")}
        </div>
      </Glass>

      <Glass className="card stack">
        <h2>Sticlă (liquid glass)</h2>
        <div className="grid2">{opt("glassTint", "Culoarea sticlei", "#ffffff")}</div>
        <Field label={`Opacitatea sticlei: ${Math.round((theme.glassAlpha ?? (theme.mode === "dark" ? 0.07 : 0.16)) * 100)}%`}><Slider aria-label="Opacitate" min={0} max={0.6} step={0.01} value={theme.glassAlpha ?? (theme.mode === "dark" ? 0.07 : 0.16)} onValueChange={(v) => set({ glassAlpha: v })} /></Field>
        <Field label={`Refracția: ${theme.bend.toFixed(2)}`}><Slider aria-label="Refracție" min={0} max={1} step={0.05} value={theme.bend} onValueChange={(v) => set({ bend: v })} /></Field>
        <Field label={`Frost (blur): ${theme.blur}px`}><Slider aria-label="Blur" min={0} max={24} step={1} value={theme.blur} onValueChange={(v) => set({ blur: v })} /></Field>
        <Field label={`Luciul marginii: ${theme.rim.toFixed(2)}`}><Slider aria-label="Luciu" min={0} max={1} step={0.05} value={theme.rim} onValueChange={(v) => set({ rim: v })} /></Field>
      </Glass>
    </>
  );
}
