"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "glisse";
import Icon from "./Icon";

/** Bifa rotunda, ca in iOS. */
export function RoundCheck({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`rcheck ${checked ? "on" : ""}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(!checked); }}>
      {checked && <Icon n="check" size={14} />}
    </button>
  );
}

/** Selectie multipla peste o lista de id-uri (ramane doar ce exista inca in lista). */
export function useBulk(ids: string[]) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const key = ids.join("|");
  useEffect(() => {
    setSel((s) => {
      const keep = new Set([...s].filter((i) => ids.includes(i)));
      return keep.size === s.size ? s : keep;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const toggle = useCallback((id: string, on?: boolean) => setSel((s) => { const n = new Set(s); if (on ?? !n.has(id)) n.add(id); else n.delete(id); return n; }), []);
  const allSelected = ids.length > 0 && sel.size === ids.length;
  const toggleAll = useCallback(() => setSel(allSelected ? new Set() : new Set(ids)), [allSelected, ids]);
  const clear = useCallback(() => setSel(new Set()), []);
  return useMemo(() => ({ sel, selected: ids.filter((i) => sel.has(i)), has: (id: string) => sel.has(id), toggle, toggleAll, allSelected, clear }), [sel, ids, toggle, toggleAll, allSelected, clear]);
}

/** Bara „Selectează tot” + „Șterge (n)”. */
export function BulkBar({ bulk, total, onDelete, busy }: { bulk: ReturnType<typeof useBulk>; total: number; onDelete: () => void; busy?: boolean }) {
  if (!total) return null;
  const n = bulk.selected.length;
  return (
    <div className="panel bulkbar">
      <span className="row" style={{ flexWrap: "nowrap" }}>
        <RoundCheck checked={bulk.allSelected} onChange={bulk.toggleAll} label="Selectează tot" />
        <span>{n ? `${n} selectate` : `Selectează tot (${total})`}</span>
      </span>
      <Button destructive icon={<Icon n="trash" size={18} />} disabled={!n || busy} onClick={onDelete}>Șterge{n ? ` (${n})` : ""}</Button>
    </div>
  );
}
