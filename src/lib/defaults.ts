import type { Settings, Theme } from "./types";

export const DEFAULT_THEME: Theme = { mode: "light", accent: "#0a55d6", bg: "#cfe2ff", subMix: 10, bend: 0.45, blur: 6, rim: 0.3 };
export const THEME_PRESETS: { name: string; theme: Theme }[] = [
  { name: "Albastru", theme: DEFAULT_THEME },
  { name: "Alb", theme: { mode: "light", accent: "#1f2937", bg: "#ffffff", subMix: 10, bend: 0.45, blur: 8, rim: 0.4 } },
  { name: "Violet", theme: { mode: "light", accent: "#6d3df0", bg: "#e4dcff", subMix: 10, bend: 0.45, blur: 6, rim: 0.3 } },
  { name: "Verde", theme: { mode: "light", accent: "#0a8f5a", bg: "#d4f3e4", subMix: 10, bend: 0.45, blur: 6, rim: 0.3 } },
  { name: "Roz", theme: { mode: "light", accent: "#e0307a", bg: "#ffd9ea", subMix: 10, bend: 0.45, blur: 6, rim: 0.3 } },
  { name: "Noapte", theme: { mode: "dark", accent: "#4d8dff", bg: "#0b1530", subMix: 10, bend: 0.5, blur: 8, rim: 0.2 } },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  captainLabel: "Capitan",
  title: "Interact Club Medias",
  subtitle: "Murder Mystery",
  rulesTitle: "Regulament",
  rulesText:
    "1. Echipele se prezintă la locul de start cu 15 minute înainte de începerea jocului.\n" +
    "2. Fiecare echipă primește un traseu propriu; nu schimbați stațiile între echipe.\n" +
    "3. La fiecare stație veți primi un punctaj. Punctajul este final și poate fi urmărit în timp real în aplicație.\n" +
    "4. Respectați indicațiile organizatorilor și ale responsabililor de stație.\n" +
    "5. Nu se părăsește zona de joc fără anunțarea organizatorilor.\n" +
    "6. Fair play: orice încercare de fraudă duce la descalificarea echipei.",
  rulesDelaySec: 5,
  open: true,
  maxTeams: 0,
  minPerTeam: 2,
  maxPerTeam: 2,
  bgUrl: "",
  fields: [],
  documents: [],
  bannerUrl: "",
  footerText: "InteractClubMedias.com • TransilvaniaHosting.com",
  variables: [],
  rules: [],
};

export function mergeSettings(v: Partial<Settings> | null | undefined): Settings {
  const s = { ...DEFAULT_SETTINGS, ...(v || {}) } as Settings;
  s.theme = { ...DEFAULT_THEME, ...(v?.theme || {}) };
  s.fields = toList<Settings["fields"][number]>(v?.fields ?? DEFAULT_SETTINGS.fields);
  s.documents = toList<Settings["documents"][number]>(v?.documents);
  s.variables = toList<Settings["variables"][number]>(v?.variables);
  s.rules = toList<Settings["rules"][number]>(v?.rules).map((r) => ({
    ...r,
    conditions: toList(r.conditions),
    actions: toList(r.actions),
    elseActions: toList(r.elseActions),
  }));
  return s;
}

/** RTDB poate intoarce tablouri ca obiecte si ignora tablourile goale. */
export function toList<T>(v: unknown): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => x != null) as T[];
  if (typeof v === "object") return Object.values(v as Record<string, T>).filter((x) => x != null);
  return [];
}

export const uid = (p = "id") => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function teamCode(len = 8) {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ALPHA[n % ALPHA.length]).join("");
}
export const randomPassword = () => teamCode(8);

/** "Echipa Ăștia 1" -> "echipa-astia-1" (cheie valida in RTDB + parte din emailul de login). */
export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
export const teamEmail = (name: string) => `${slugify(name)}@team.interactmedias.app`;

/** Cod de acces la statie (8 caractere) si emailul tehnic al contului de statie. */
export const stationEmail = (sid: string) => `st-${sid.toLowerCase()}@station.interactmedias.app`;
