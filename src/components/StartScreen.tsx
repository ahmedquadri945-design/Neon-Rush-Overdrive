import type { HighScore } from "../game/storage";
import { formatScore } from "../game/utils";
import { IconPlay, IconBolt, IconVolume, IconMute } from "./Icons";
import { HighScoreTable } from "./HighScoreTable";

export function StartScreen({
  scores,
  best,
  onPlay,
  muted,
  onToggleMute,
  isTouch,
}: {
  scores: HighScore[];
  best: number;
  onPlay: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isTouch: boolean;
}) {
  return (
    <div className="pe z-[40] absolute inset-0 flex flex-col items-center justify-center p-4 screen-enter">
      {/* mute */}
      <button className="icon-btn pe absolute top-4 right-4 z-20" onClick={onToggleMute} aria-label="Toggle sound">
        {muted ? <IconMute /> : <IconVolume />}
      </button>

      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="float-y mb-1 flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-bold tracking-[0.25em] text-cyan-200">
          <IconBolt className="w-4 h-4" /> ARCADE RACER
        </div>

        <h1 className="font-display title-grad title-flicker text-6xl sm:text-7xl font-black leading-none tracking-tight">
          NEON
          <br />
          RUSH
        </h1>
        <p className="mt-1 font-display text-sm sm:text-base font-bold tracking-[0.5em] text-fuchsia-300/90 neon-magenta">
          OVERDRIVE
        </p>

        <button className="btn btn-primary mt-7 px-10 py-4 text-xl pe" onClick={onPlay}>
          <IconPlay className="w-6 h-6" /> Play
        </button>
        <p className="mt-2 text-xs text-cyan-200/60">
          or press <span className="hint-key">Enter</span>
        </p>

        <div className="mt-6 flex items-center gap-3 text-sm">
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-cyan-100/80">
            BEST <span className="font-display font-bold text-amber-300 tnum">{formatScore(best)}</span>
          </span>
        </div>

        {/* high scores */}
        <div className="panel mt-5 w-full rounded-2xl p-3 text-left">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-display text-xs font-bold tracking-[0.2em] text-cyan-300">LOCAL RECORDS</span>
            <span className="text-[10px] text-cyan-200/50">SCORE · DIST · TOP</span>
          </div>
          <HighScoreTable scores={scores.slice(0, 5)} />
        </div>

        {/* controls */}
        <div className="mt-5 text-cyan-100/70 text-sm">
          {isTouch ? (
            <p>
              <span className="font-bold text-cyan-200">Drag</span> anywhere to steer · hold{" "}
              <span className="font-bold text-lime-300">NITRO</span> to boost
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <span className="flex items-center gap-1"><span className="hint-key">A</span><span className="hint-key">D</span> / <span className="hint-key">←</span><span className="hint-key">→</span> steer</span>
              <span className="flex items-center gap-1"><span className="hint-key">Space</span> nitro</span>
              <span className="flex items-center gap-1"><span className="hint-key">P</span> pause</span>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-cyan-200/40">
          Weave through traffic, graze cars for combo multipliers, grab <span className="text-lime-300">nitro</span> cells and ride the boost. Three hits and you're out.
        </p>
      </div>
    </div>
  );
}
