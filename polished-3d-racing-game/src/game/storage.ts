// Local high-score table persisted to localStorage.

export type HighScore = {
  score: number;
  distance: number;
  topSpeed: number;
  date: number;
};

const KEY = "neon-rush.highscores.v1";
const MAX = 8;

function safeParse(raw: string | null): HighScore[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d && typeof d.score === "number")
      .map((d) => ({
        score: Math.floor(d.score),
        distance: Math.floor(d.distance || 0),
        topSpeed: Math.floor(d.topSpeed || 0),
        date: d.date || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function loadHighScores(): HighScore[] {
  try {
    return safeParse(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function saveHighScores(list: HighScore[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** Inserts a run, returns the updated table and the rank (1-based) or -1. */
export function submitScore(entry: Omit<HighScore, "date"> & { date?: number }): { table: HighScore[]; rank: number } {
  const full: HighScore = {
    score: Math.floor(entry.score),
    distance: Math.floor(entry.distance || 0),
    topSpeed: Math.floor(entry.topSpeed || 0),
    date: entry.date ?? Date.now(),
  };
  const table = [...loadHighScores(), full].sort((a, b) => b.score - a.score).slice(0, MAX);
  saveHighScores(table);
  const rank = table.findIndex((e) => e === full) + 1;
  return { table, rank: rank > 0 ? rank : -1 };
}
