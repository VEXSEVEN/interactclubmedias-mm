import type { Theme } from "./types";

const mix = (a: string, pa: number, b: string) => `color-mix(in srgb, ${a} ${pa}%, ${b})`;

/**
 * Aplica tema pe tot site-ul prin variabile CSS.
 * - In dark mode: textul e alb-albăstrui, sticla e neagra semi-transparenta
 * - In light mode: textul derivat din accent, sticla alba semi-transparenta
 */
export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  const dark = t.mode === "dark";
  const set = (k: string, v: string | number) => r.style.setProperty(k, String(v));

  // Text: in dark mode aproape alb, in light mode derivat din accent (inchis)
  const ink = t.text || (dark ? mix(t.accent, 15, "#f4f6ff") : mix(t.accent, 72, "#050b1a"));
  const sub = mix(ink, 100 - (t.subMix ?? 10), t.bg);

  r.dataset.theme = t.mode;
  r.style.colorScheme = t.mode;
  set("--ink", ink);
  set("--muted", sub);
  set("--blue", t.accent);
  set("--blue-deep", mix(t.accent, 62, ink));
  set("--blue-soft", mix(t.accent, 16, "transparent"));
  set("--line", t.line || mix(t.accent, dark ? 38 : 26, "transparent"));
  const base = dark ? "#000" : "#fff";
  set("--bg-a", mix(t.bg, 45, base));
  set("--bg-b", t.bg);
  set("--bg-c", mix(t.bg, 70, t.accent));
  set("--free", t.free || "#0a8f5a");
  set("--busy", t.busy || "#d6342a");
  set("--warn", t.warn || "#b7791f");

  // ---- Glisse variables ----
  // Foreground: textul pe componente Glisse (butoane, taburi)
  set("--lg-foreground", ink);
  set("--lg-muted", sub);

  // Fill: culoarea butoanelor filled si a sliderului
  set("--lg-fill", t.filled || t.accent);
  set("--lg-tab-selected", t.tabSelected || t.accent);

  // Glass: in dark mode tinta neagra, in light mode tinta alba (sau custom glassTint)
  const tint = t.glassTint || (dark ? "#12121e" : "#ffffff");
  const a = t.glassAlpha ?? (dark ? 0.22 : 0.16);
  set("--lg-glass", `color-mix(in srgb, ${tint} ${Math.round(a * 100)}%, transparent)`);
  set("--lg-panel", `color-mix(in srgb, ${tint} ${Math.min(48, Math.round(a * 150))}%, transparent)`);

  // Dark mode: sticla activa (hover/press) mai deschisa
  if (dark) {
    set("--lg-glass-active", `color-mix(in srgb, ${tint} ${Math.round(Math.min(a * 1.5, 0.45) * 100)}%, transparent)`);
    set("--lg-edge", "rgb(255 255 255 / 0.1)");
    set("--lg-segment-label", ink);
    set("--lg-segment-thumb", "rgb(255 255 255 / 0.18)");
  } else {
    r.style.removeProperty("--lg-glass-active");
    r.style.removeProperty("--lg-edge");
    r.style.removeProperty("--lg-segment-label");
    r.style.removeProperty("--lg-segment-thumb");
  }

  set("--lg-glass-bend", t.bend);
  set("--lg-glass-dispersion", 0.4);
  set("--lg-blur", `${t.blur}px`);
  set("--lg-rim-shine", t.rim);
}

export const THEME_CACHE_KEY = "imc_theme_v1";
export function cachedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_CACHE_KEY);
    return v ? (JSON.parse(v) as Theme) : null;
  } catch {
    return null;
  }
}
