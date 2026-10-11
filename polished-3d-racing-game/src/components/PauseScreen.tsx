import { IconPlay, IconRestart, IconHome, IconVolume, IconMute } from "./Icons";

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
  muted,
  onToggleMute,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="pe z-[40] absolute inset-0 flex flex-col items-center justify-center p-4 screen-enter" style={{ background: "rgba(7,2,26,0.55)", backdropFilter: "blur(6px)" }}>
      <div className="panel w-full max-w-xs rounded-3xl p-6 text-center">
        <h2 className="font-display text-4xl font-black tracking-wide title-grad">PAUSED</h2>
        <p className="mt-1 text-xs tracking-[0.3em] text-cyan-200/60">TAKE A BREATH</p>

        <div className="mt-6 flex flex-col gap-3">
          <button className="btn btn-primary pe w-full" onClick={onResume}>
            <IconPlay className="w-5 h-5" /> Resume
          </button>
          <button className="btn btn-ghost pe w-full" onClick={onRestart}>
            <IconRestart className="w-5 h-5" /> Restart
          </button>
          <button className="btn btn-ghost pe w-full" onClick={onMenu}>
            <IconHome className="w-5 h-5" /> Main Menu
          </button>
        </div>

        <button className="icon-btn pe mx-auto mt-5" onClick={onToggleMute} aria-label="Toggle sound">
          {muted ? <IconMute /> : <IconVolume />}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-cyan-200/50">
          <span className="hint-key">P</span> resume · <span className="hint-key">R</span> restart
        </div>
      </div>
    </div>
  );
}
