import type { Schedule, Station } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Rotatie randomizata, fara coliziuni:
 * - echipele sunt amestecate si impartite in grupuri (cate echipe incap simultan la o statie,
 *   dupa capacitatea statiei in persoane / maxim persoane pe echipa);
 * - la runda r, grupul j merge la statia (j + r) mod N, deci doua grupuri nu ajung niciodata
 *   la aceeasi statie in aceeasi runda, iar fiecare echipa trece prin toate statiile.
 */
export function generateSchedule(teamIds: string[], stations: Station[], maxPerTeam: number): Schedule | null {
  if (!teamIds.length || !stations.length) return null;
  const st = shuffle(stations);
  const teams = shuffle(teamIds);
  const per = Math.max(1, maxPerTeam);
  const k = Math.max(1, Math.min(...st.map((s) => Math.floor((s.capacity || per) / per))));
  const groups: string[][] = [];
  for (let i = 0; i < teams.length; i += k) groups.push(teams.slice(i, i + k));
  const S = st.length;
  const N = Math.max(groups.length, S);
  const rounds: Record<string, Record<string, string[]>> = {};
  for (let r = 0; r < N; r++) {
    const round: Record<string, string[]> = {};
    groups.forEach((g, j) => {
      const idx = (j + r) % N;
      if (idx < S) round[st[idx].id] = g;
    });
    rounds[String(r)] = round;
  }
  return { generatedAt: Date.now(), currentRound: 0, roundCount: N, rounds };
}

export function roundAt(s: Schedule | null | undefined, r: number): Record<string, string[]> {
  if (!s) return {};
  const rounds = s.rounds as unknown as Record<string, Record<string, string[]>>;
  return rounds?.[r] || rounds?.[String(r)] || {};
}

export function stationOfTeam(s: Schedule | null | undefined, r: number, teamId: string): string | null {
  const round = roundAt(s, r);
  for (const [sid, teams] of Object.entries(round)) {
    if ((teams || []).includes(teamId)) return sid;
  }
  return null;
}
