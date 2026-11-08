import type { Theme } from "./types";

const mix = (a: string, pa: number, b: string) => `color-mix(in srgb, ${a} ${pa}%, ${b})`;

/**
 * Aplica tema pe tot site-ul prin variabile CSS.
 * - Textul se calculeaza din culoarea principala (accent): o schimbi si se schimba tot textul.
 * - Subtitlurile = textul amestecat cu `subMix`% (implicit 10%) din culoarea fundalului.
 */
export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  const dark = t.mode === "dark";
  const set = (k: string, v: string | number) => r.style.setProperty(k, String(v));
  const ink = t.text || (dark ? mix(t.accent, 38, "#ffffff") : mix(t.accent, 72, "#050b1a"));
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
  // Glisse
  set("--lg-foreground", ink);
  set("--lg-muted", sub);
  set("--lg-fill", t.filled || t.accent);
  set("--lg-tab-selected", t.tabSelected || t.accent);
  const tint = t.glassTint || "#ffffff";
  const a = t.glassAlpha ?? (dark ? 0.07 : 0.16);
  set("--lg-glass", `color-mix(in srgb, ${tint} ${Math.round(a * 100)}%, transparent)`);
  set("--lg-panel", `color-mix(in srgb, ${tint} ${Math.min(62, Math.round(a * 260))}%, transparent)`);
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
