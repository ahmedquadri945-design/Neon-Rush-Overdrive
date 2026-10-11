import type { GameResult } from "../game/GameEngine";
import type { HighScore } from "../game/storage";
import { formatScore } from "../game/utils";
import { IconRestart, IconHome, IconTrophy } from "./Icons";
import { HighScoreTable } from "./HighScoreTable";

export function GameOverScreen({
  result,
  rank,
  scores,
  onRestart,
  onMenu,
}: {
  result: GameResult;
  rank: number;
  scores: HighScore[];
  onRestart: () => void;
  onMenu: () => void;
}) {
  const isRecord = rank === 1;
  return (
    <div className="pe z-[40] absolute inset-0 flex flex-col items-center justify-center p-4 screen-enter" style={{ background: "rgba(7,2,26,0.6)", backdropFilter: "blur(7px)" }}>
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {isRecord ? (
          <div className="record-badge mb-1 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 font-display text-xs font-black tracking-[0.2em] text-black shadow-lg shadow-amber-500/40">
            <IconTrophy className="w-4 h-4" /> NEW RECORD
          </div>
        ) : (
          <div className="mb-1 text-xs font-bold tracking-[0.4em] text-rose-400/80 neon-magenta">RUN ENDED</div>
        )}

        <h2 className="font-display text-5xl font-black title-grad leading-none">GAME OVER</h2>

        <div className="mt-4 panel w-full rounded-2xl p-4">
          <div className="text-[10px] tracking-[0.3em] text-cyan-300/70">FINAL SCORE</div>
          <div className="font-display text-5xl font-black tnum neon-text leading-none">{formatScore(result.score)}</div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[9px] tracking-widest text-cyan-200/60">DISTANCE</div>
              <div className="font-display font-bold text-white tnum">{result.distance}m</div>
            </div>
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[9px] tracking-widest text-cyan-200/60">TOP SPEED</div>
              <div className="font-display font-bold text-fuchsia-300 tnum">{result.topSpeed}</div>
            </div>
            <div className="rounded-xl bg-white/5 py-2">
              <div className="text-[9px] tracking-widest text-cyan-200/60">BEST COMBO</div>
              <div className="font-display font-bold text-lime-300 tnum">{result.bestCombo}x</div>
            </div>
          </div>
        </div>

        {rank > 0 && rank <= 5 && (
          <div className="mt-3 text-sm font-bold text-amber-300">Rank #{rank} on the local board</div>
        )}

        <div className="mt-4 flex w-full gap-3">
          <button className="btn btn-primary pe flex-1" onClick={onRestart}>
            <IconRestart className="w-5 h-5" /> Retry
          </button>
          <button className="btn btn-ghost pe flex-1" onClick={onMenu}>
            <IconHome className="w-5 h-5" /> Menu
          </button>
        </div>

        <div className="panel mt-4 w-full rounded-2xl p-3 text-left">
          <div className="mb-2 px-1 font-display text-xs font-bold tracking-[0.2em] text-cyan-300">LOCAL RECORDS</div>
          <HighScoreTable scores={scores.slice(0, 5)} highlightRank={rank > 0 ? rank : undefined} />
        </div>

        <p className="mt-3 text-[11px] text-cyan-200/40">
          <span className="hint-key">R</span> instant retry · <span className="hint-key">Esc</span> menu
        </p>
      </div>
    </div>
  );
}
