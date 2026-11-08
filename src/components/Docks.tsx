"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface DockItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}
interface SecondDock {
  items: DockItem[];
  value: string;
  onChange: (v: string) => void;
}
const Ctx = createContext<{ second: SecondDock | null; setSecond: (s: SecondDock | null) => void }>({ second: null, setSecond: () => {} });

export function DockProvider({ children }: { children: React.ReactNode }) {
  const [second, setSecond] = useState<SecondDock | null>(null);
  return <Ctx.Provider value={{ second, setSecond }}>{children}</Ctx.Provider>;
}
export const useDocks = () => useContext(Ctx);

/** O pagina de dashboard isi inregistreaza al doilea dock (sectiunile ei). */
export function useSecondDock(items: DockItem[], value: string, onChange: (v: string) => void) {
  const { setSecond } = useContext(Ctx);
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = items.map((i) => i.value + i.label).join("|");
  useEffect(() => {
    setSecond({ items, value, onChange: (v) => cb.current(v) });
    return () => setSecond(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);
}
