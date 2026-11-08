"use client";
import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "./firebase";
import { mergeSettings } from "./defaults";
import type { Schedule, Scores, Settings, Station, Team } from "./types";

export function useVal<T>(path: string | null): { data: T | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({ data: null, loading: !!path });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onValue(
      ref(db, path),
      (snap) => setState({ data: snap.exists() ? (snap.val() as T) : null, loading: false }),
      () => setState({ data: null, loading: false })
    );
  }, [path]);
  return state;
}

const SETTINGS_CACHE = "imc_settings_v1";

/** Setari cu cache local: apar instant (si offline), apoi se aliniaza cu baza de date. */
export function useSettings(): { settings: Settings; loading: boolean; live: boolean } {
  const { data, loading } = useVal<Partial<Settings>>("settings");
  const [cache, setCache] = useState<Partial<Settings> | null>(null);
  useEffect(() => {
    try {
      const c = localStorage.getItem(SETTINGS_CACHE);
      if (c) setCache(JSON.parse(c));
    } catch {}
  }, []);
  useEffect(() => {
    if (!loading && data) {
      try {
        localStorage.setItem(SETTINGS_CACHE, JSON.stringify(data));
      } catch {}
    }
  }, [data, loading]);
  const eff = data ?? (loading ? cache : null);
  return { settings: useMemo(() => mergeSettings(eff), [eff]), loading: loading && !cache, live: !loading };
}

export function useStations() {
  const { data, loading } = useVal<Record<string, Omit<Station, "id">>>("stations");
  const stations = useMemo(
    () =>
      Object.entries(data || {})
        .map(([id, s]) => ({ ...s, id }) as Station)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ro", { numeric: true })),
    [data]
  );
  return { stations, loading };
}

export function useTeams() {
  const { data, loading } = useVal<Record<string, Omit<Team, "id">>>("teams");
  const teams = useMemo(
    () => Object.entries(data || {}).map(([id, t]) => ({ ...t, id }) as Team).sort((a, b) => a.createdAt - b.createdAt),
    [data]
  );
  return { teams, loading };
}

export function useScores() {
  const { data, loading } = useVal<Scores>("scores");
  return { scores: data || {}, loading };
}

export function useSchedule() {
  const { data, loading } = useVal<Schedule>("schedule");
  return { schedule: data, loading };
}

export const total = (s?: Record<string, number>) => Object.values(s || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export function ranking(teams: Team[], scores: Scores) {
  const rows = teams.map((t) => ({ team: t, points: total(scores[t.id]) })).sort((a, b) => b.points - a.points || a.team.name.localeCompare(b.team.name));
  let last = -1;
  let rank = 0;
  return rows.map((r, i) => {
    if (r.points !== last) {
      rank = i + 1;
      last = r.points;
    }
    return { ...r, rank };
  });
}

export function useSlots() {
  const { data, loading } = useVal<Record<string, boolean>>("slots");
  return { used: Object.keys(data || {}).length, loading };
}
