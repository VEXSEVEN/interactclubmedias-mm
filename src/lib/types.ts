export type Role = "developer" | "organizer" | "station" | "team";

export interface Profile {
  role: Role;
  email?: string;
  name?: string;
  stationId?: string;
  teamId?: string;
}

export type FieldType = "text" | "textarea" | "tel" | "email" | "number" | "date" | "select" | "radio" | "checkbox";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  scope: "team" | "member"; // o data pe echipa sau pentru fiecare membru
  placeholder?: string;
  options?: string[];
  helper?: string;
}

/** Document pus de organizator: se descarca, se completeaza/semneaza si se reincarca. */
export interface DocItem {
  id: string;
  title: string;
  text: string;
  required: boolean;
  signer: "captain" | "all"; // cine incarca varianta semnata
  fileUrl?: string;
  fileName?: string;
}

export type VariableType = "int" | "float" | "str" | "bool";
export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  value: number | string | boolean;
}

export type RuleTrigger = "on_approve" | "on_paid" | "on_reject";
export type Operator = "equals" | "not_equals" | "contains" | "not_contains" | "gt" | "lt" | "gte" | "lte";
export interface Condition {
  id: string;
  sourceType: "field" | "variable";
  sourceId: string;
  operator: Operator;
  value: string;
}
export interface Action {
  id: string;
  type: "increment_var" | "decrement_var" | "set_var" | "close_form" | "open_form";
  targetVar?: string;
  amount?: number;
  value?: string;
}
export interface Rule {
  id: string;
  name: string;
  trigger: RuleTrigger;
  logic: "and" | "or";
  conditions: Condition[];
  actions: Action[];
  elseActions?: Action[];
}

export interface Theme {
  mode: "light" | "dark";
  accent: string; // culoarea principala: butoane, accente SI textul de pe tot site-ul (derivat)
  bg: string; // culoarea de baza a fundalului
  subMix: number; // % din culoarea fundalului amestecat in subtitluri (implicit 10)
  bend: number; // refractia sticlei 0..1
  blur: number; // frost in px
  rim: number; // luciul marginii 0..1
  // suprascrieri pe componente (optional): daca lipsesc se calculeaza din accent
  text?: string; // culoarea textului
  filled?: string; // butoane principale
  glassTint?: string; // culoarea sticlei
  glassAlpha?: number; // opacitatea sticlei 0..0.6
  line?: string; // borduri
  free?: string; // "Liber" / succes
  busy?: string; // "Ocupat" / eroare
  warn?: string; // "In asteptare"
  tabSelected?: string; // eticheta tab selectat din dock
}

export interface Settings {
  theme: Theme;
  captainLabel: string; // eticheta primului membru; gol = "Membru 1"
  title: string;
  subtitle: string;
  rulesTitle: string;
  rulesText: string;
  rulesDelaySec: number;
  open: boolean;
  maxTeams: number; // 0 = nelimitat
  minPerTeam: number;
  maxPerTeam: number;
  bgUrl: string;
  bannerUrl: string;
  footerText: string;
  fields: FormField[];
  documents: DocItem[];
  variables: Variable[];
  rules: Rule[];
}

export interface Station {
  id: string;
  name: string;
  description?: string;
  capacity: number; // cate persoane pot intra odata
  teamSlots?: number; // cate echipe simultan; statia devine ocupata cand sunt atatea echipe prezente (implicit 2)
  maxPoints?: number;
  occupied?: boolean;
  present?: Record<string, boolean>; // echipe aflate acum la statie
  visited?: Record<string, boolean>; // echipe care au fost deja la statie (nu se merge de 2 ori)
  updatedAt?: number;
}

export interface Team {
  id: string;
  name: string;
  size: number;
  createdAt: number;
}

export type Scores = Record<string, Record<string, number>>; // teamId -> stationId -> puncte

export interface Schedule {
  generatedAt: number;
  currentRound: number;
  roundCount: number;
  rounds: Record<string, Record<string, string[]>> | Record<string, string[]>[];
}

export type RegStatus = "pending" | "approved" | "paid" | "rejected";

export interface Registration {
  teamName: string;
  slug: string;
  slotId: string;
  status: RegStatus;
  createdAt: number;
  answers?: Record<string, string | boolean>;
  members: { name: string; answers?: Record<string, string | boolean> }[];
  files?: Record<string, Record<string, { url: string; name: string }>>;
}

export interface PublicStatus {
  teamName: string;
  status: RegStatus;
  createdAt: number;
}

export type EventType = "score" | "free" | "message";
export interface AppEvent {
  id: string;
  target: string; // _all | _teams | _stations | <teamId>
  type: EventType;
  title: string;
  body: string;
  ts: number;
  from?: string;
}
