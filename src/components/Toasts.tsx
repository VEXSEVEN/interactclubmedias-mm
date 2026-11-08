"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { Glass } from "glisse";

type Kind = "info" | "success" | "error";
const Ctx = createContext<(m: string, k?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; m: string; k: Kind }[]>([]);
  const push = useCallback((m: string, k: Kind = "info") => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, m, k }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <Glass key={t.id} className={`toast toast-${t.k}`}>
            {t.m}
          </Glass>
        ))}
      </div>
    </Ctx.Provider>
  );
}
