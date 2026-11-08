"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button, Glass } from "glisse";

export interface ConfirmOpts {
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
export const DELETE: ConfirmOpts = { confirmLabel: "Șterge", destructive: true };

type Ask = (title: string, opts?: ConfirmOpts) => Promise<boolean>;
const Ctx = createContext<Ask>(async () => false);
export const useConfirm = () => useContext(Ctx);

/** Dialog de confirmare in stil iOS (in locul ferestrei native a browserului). */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<{ title: string; opts: ConfirmOpts } | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask: Ask = useCallback((title, opts = {}) => new Promise<boolean>((res) => {
    resolver.current?.(false);
    resolver.current = res;
    setSt({ title, opts });
  }), []);

  const done = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setSt(null);
  };

  useEffect(() => {
    if (!st) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && done(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [st]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {st && (
        <div className="overlay dialog-wrap" role="presentation" onPointerDown={(e) => e.target === e.currentTarget && done(false)}>
          <Glass className="dialog" role="alertdialog" aria-modal="true" aria-label={st.title}>
            <div className="dialog-body">
              <strong>{st.title}</strong>
              {st.opts.message && <p className="muted">{st.opts.message}</p>}
            </div>
            <div className="dialog-actions">
              <Button onClick={() => done(false)}>{st.opts.cancelLabel || "Anulează"}</Button>
              <Button variant="filled" destructive={st.opts.destructive} onClick={() => done(true)} autoFocus>{st.opts.confirmLabel || "Confirmă"}</Button>
            </div>
          </Glass>
        </div>
      )}
    </Ctx.Provider>
  );
}
