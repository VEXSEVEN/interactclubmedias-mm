"use client";
import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glass, Input, Switch } from "glisse";
import Icon from "./Icon";

/* ============ Select (stil iOS, aceeasi folosire ca <select>) ============ */
interface Opt { value: string; label: React.ReactNode; group?: string; disabled?: boolean }

function parse(children: React.ReactNode, group?: string): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const p = c.props as { value?: string; label?: string; children?: React.ReactNode; disabled?: boolean };
    if (c.type === "optgroup") out.push(...parse(p.children, p.label));
    else if (c.type === "option") out.push({ value: String(p.value ?? p.children), label: p.children, group, disabled: p.disabled });
  });
  return out;
}

function usePopover(open: boolean, close: () => void, anchor: React.RefObject<HTMLElement | null>, pop: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || anchor.current?.contains(t)) return;
      close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
    };
  }, [open, close, anchor, pop]);
}

/** Pozitioneaza popover-ul fix, sub (sau deasupra) ancorei, in interiorul ecranului. */
function usePlace(open: boolean, anchor: React.RefObject<HTMLElement | null>, pop: React.RefObject<HTMLElement | null>, minWidth = 0) {
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });
  useLayoutEffect(() => {
    if (!open || !anchor.current || !pop.current) return;
    const a = anchor.current.getBoundingClientRect();
    const h = pop.current.offsetHeight;
    const w = Math.max(a.width, minWidth);
    const below = window.innerHeight - a.bottom - 12;
    const up = below < Math.min(h, 240) && a.top > below;
    const left = Math.min(Math.max(8, a.left), window.innerWidth - w - 8);
    setStyle({
      position: "fixed", left, width: w, zIndex: 80,
      ...(up ? { bottom: window.innerHeight - a.top + 6, maxHeight: a.top - 16 } : { top: a.bottom + 6, maxHeight: Math.max(160, below) }),
    });
  }, [open, anchor, pop, minWidth]);
  return style;
}

export function Select({ value, onChange, children, className = "", style, placeholder, disabled, "aria-label": aria }: {
  value: string; onChange: (e: { target: { value: string } }) => void; children: React.ReactNode; className?: string; style?: React.CSSProperties; placeholder?: string; disabled?: boolean; "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const opts = parse(children);
  const cur = opts.find((o) => o.value === value);
  const close = () => setOpen(false);
  usePopover(open, close, btn, pop);
  const pos = usePlace(open, btn, pop, 180);
  let lastGroup: string | undefined;

  return (
    <>
      <button ref={btn} type="button" disabled={disabled} aria-label={aria} aria-haspopup="listbox" aria-expanded={open}
        className={`input select ${className}`} style={style} onClick={() => setOpen((o) => !o)}>
        <span className={`select-text ${cur ? "" : "ph"}`}>{cur?.label ?? placeholder ?? "Alege…"}</span>
        <Icon n="chevdown" size={18} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <Glass ref={pop} className="pop" style={pos} role="listbox">
          <div className="pop-scroll">
            {opts.map((o, i) => {
              const head = o.group && o.group !== lastGroup ? <div className="pop-group" key={`g${i}`}>{o.group}</div> : null;
              lastGroup = o.group;
              return (
                <div key={o.value + i}>
                  {head}
                  <button type="button" role="option" aria-selected={o.value === value} disabled={o.disabled} className={`pop-item ${o.value === value ? "on" : ""}`}
                    onClick={() => { onChange({ target: { value: o.value } }); close(); }}>
                    <span>{o.label}</span>
                    {o.value === value && <Icon n="check" size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        </Glass>, document.body)}
    </>
  );
}

/* ============ DateField (calendar iOS) ============ */
const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function DateField({ value, onChange, placeholder = "Alege data", className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const now = new Date();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").map(Number) : null;
  const [view, setView] = useState({ y: parsed?.[0] ?? now.getFullYear() - 16, m: parsed ? parsed[1] - 1 : now.getMonth() });
  const close = () => setOpen(false);
  usePopover(open, close, btn, pop);
  const pos = usePlace(open, btn, pop, 300);

  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(first).fill(0), ...Array.from({ length: count }, (_, i) => i + 1)];
  const shift = (d: number) => setView((v) => { const t = new Date(v.y, v.m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const label = parsed ? `${parsed[2]} ${MONTHS[parsed[1] - 1]} ${parsed[0]}` : "";
  const years = Array.from({ length: 110 }, (_, i) => now.getFullYear() + 5 - i);

  return (
    <>
      <button ref={btn} type="button" className={`input select ${className}`} onClick={() => { if (parsed) setView({ y: parsed[0], m: parsed[1] - 1 }); setOpen((o) => !o); }}>
        <span className={`select-text ${label ? "" : "ph"}`}>{label || placeholder}</span>
        <Icon n="calendar" size={18} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <Glass ref={pop} className="pop cal" style={pos}>
          <div className="cal-head">
            <button type="button" className="cal-nav" aria-label="Luna anterioară" onClick={() => shift(-1)}><Icon n="back" size={20} /></button>
            <div className="cal-sel">
              <select aria-label="Luna" value={view.m} onChange={(e) => setView({ ...view, m: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
              <select aria-label="Anul" value={view.y} onChange={(e) => setView({ ...view, y: Number(e.target.value) })}>{years.map((y) => <option key={y}>{y}</option>)}</select>
            </div>
            <button type="button" className="cal-nav" aria-label="Luna următoare" onClick={() => shift(1)}><Icon n="chevron" size={20} /></button>
          </div>
          <div className="cal-grid">
            {DAYS.map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
            {cells.map((d, i) => d === 0 ? <span key={i} /> : (
              <button type="button" key={i} className={`cal-day ${value === iso(view.y, view.m, d) ? "on" : ""} ${iso(now.getFullYear(), now.getMonth(), now.getDate()) === iso(view.y, view.m, d) ? "today" : ""}`}
                onClick={() => { onChange(iso(view.y, view.m, d)); close(); }}>{d}</button>
            ))}
          </div>
          <div className="cal-foot">
            <button type="button" className="link-btn" onClick={() => { onChange(""); close(); }}>Șterge</button>
            <button type="button" className="link-btn" onClick={() => { onChange(iso(now.getFullYear(), now.getMonth(), now.getDate())); close(); }}>Azi</button>
          </div>
        </Glass>, document.body)}
    </>
  );
}

/* ============ File / Toggle / Radio / Color ============ */
export function FileField({ file, onFile, accept, placeholder = "Alege fișier" }: { file?: File | null; onFile: (f?: File) => void; accept?: string; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="input filefield" onClick={() => ref.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <span className={`select-text ${file ? "" : "ph"}`}>{file ? file.name : placeholder}</span>
      {file ? <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); onFile(undefined); }}>Elimină</button> : <Icon n="plus" size={16} />}
    </div>
  );
}

export function ToggleRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="toggle">
      <span>{children}</span>
      <Switch aria-label={typeof children === "string" ? children : "Comutator"} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function RadioGroup({ value, options, onChange }: { value?: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="radios" role="radiogroup">
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o} key={o} className={`radio ${value === o ? "on" : ""}`} onClick={() => onChange(o)}>
          <span className="dot" />
          <span>{o}</span>
        </button>
      ))}
    </div>
  );
}

/* ============ ColorField: selector Apple (patrat saturatie/luminozitate + curcubeu + hex + culori rapide) ============ */
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
function hexToHsv(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [210, 1, 0.8];
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}
function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}
const QUICK = ["#0a55d6", "#0a84ff", "#5e5ce6", "#bf5af2", "#ff375f", "#ff453a", "#ff9f0a", "#ffd60a", "#30d158", "#00c7be", "#1f2937", "#ffffff"];

function useDrag(onMove: (x: number, y: number) => void) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const r = e.currentTarget.getBoundingClientRect();
      onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const r = e.currentTarget.getBoundingClientRect();
      onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
    },
  };
}

export function ColorField({ value, onChange, label, onClear }: { value: string; onChange: (v: string) => void; label?: string; onClear?: () => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  usePopover(open, close, btn, pop);
  const pos = usePlace(open, btn, pop, 280);
  const [h, s, v] = hexToHsv(value);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const [hue, setHue] = useState(h);
  useEffect(() => { if (s > 0.02 && v > 0.02) setHue(h); }, [h, s, v]);
  const set = (nh: number, ns: number, nv: number) => { setHue(nh); onChange(hsvToHex(nh, ns, nv)); };
  const sv = useDrag((x, y) => set(hue, x, 1 - y));
  const hu = useDrag((x) => set(x * 360, s || 1, v || 1));
  const eye = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <>
      <div className="colorfield">
        <button ref={btn} type="button" className="swatch" style={{ background: value }} aria-label={label || "Alege culoarea"} onClick={() => setOpen((o) => !o)} />
        <span className="mono">{value.toUpperCase()}</span>
        {onClear && <button type="button" className="link-btn" onClick={onClear}>Auto</button>}
      </div>
      {open && typeof document !== "undefined" && createPortal(
        <Glass ref={pop} className="pop picker" style={pos}>
          <div className="sv" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))` }} {...sv}>
            <i className="knob" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }} />
          </div>
          <div className="hue" {...hu}><i className="knob" style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue} 100% 50%)` }} /></div>
          <div className="quick">
            {QUICK.map((c) => <button type="button" key={c} className={`q ${c.toLowerCase() === value.toLowerCase() ? "on" : ""}`} style={{ background: c }} aria-label={c} onClick={() => onChange(c)} />)}
          </div>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <div className="grow"><Input value={hex} onValueChange={(t) => { setHex(t); if (/^#[0-9a-f]{6}$/i.test(t)) onChange(t); }} aria-label="Cod hex" maxLength={7} /></div>
            {eye && <button type="button" className="cal-nav" aria-label="Pipetă" onClick={async () => { try { const r = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open(); onChange(r.sRGBHex); } catch {} }}><Icon n="pipette" size={20} /></button>}
          </div>
        </Glass>, document.body)}
    </>
  );
}
