"use client";
import Icon from "./Icon";
import { useSecondDock } from "./Docks";

export interface DashItem {
  value: string;
  label: string; // scurt, pentru dock
  title?: string; // titlul paginii
  icon: string;
}

/** Panou: continutul sectiunii; navigarea se face din al doilea dock (vezi AppShell). */
export default function DashShell({ title, items, value, onChange, children }: { title: string; items: DashItem[]; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  useSecondDock(items.map((i) => ({ value: i.value, label: i.label, icon: <Icon n={i.icon} size={20} /> })), value, onChange);
  const cur = items.find((i) => i.value === value);
  return (
    <section className="dash-main">
      <h1>{cur?.title ?? cur?.label ?? title}</h1>
      {children}
    </section>
  );
}
