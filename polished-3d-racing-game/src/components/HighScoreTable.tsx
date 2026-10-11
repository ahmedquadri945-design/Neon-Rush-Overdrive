import type { HighScore } from "../game/storage";
import { formatScore } from "../game/utils";
import { IconTrophy } from "./Icons";

const medals = ["text-amber-300", "text-slate-300", "text-orange-400"];

export function HighScoreTable({ scores, highlightRank }: { scores: HighScore[]; highlightRank?: number }) {
  if (scores.length === 0) {
    return (
      <div className="text-center text-cyan-200/60 py-4 font-semibold tracking-wide">
        No runs yet — set the first record!
      </div>
    );
  }
  return (
    <ol className="space-y-1.5">
      {scores.map((s, i) => {
        const rank = i + 1;
        const hi = highlightRank === rank;
        return (
          <li
            key={`${s.date}-${i}`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 tnum ${
              hi ? "bg-cyan-400/15 ring-1 ring-cyan-300/60" : "bg-white/5"
            }`}
          >
            <span className={`font-display font-extrabold w-7 text-center ${medals[i] ?? "text-cyan-200/70"}`}>
              {rank <= 3 ? <IconTrophy className="w-5 h-5 mx-auto" /> : rank}
            </span>
            <span className="flex-1 font-display font-bold text-lg text-white">{formatScore(s.score)}</span>
            <span className="text-xs text-cyan-200/70 w-20 text-right">{s.distance} m</span>
            <span className="text-xs text-fuchsia-200/70 w-16 text-right">{s.topSpeed} km/h</span>
          </li>
        );
      })}
    </ol>
  );
}
