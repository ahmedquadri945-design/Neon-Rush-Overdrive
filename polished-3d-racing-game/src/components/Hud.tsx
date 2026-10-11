import type { HudRefs } from "../game/GameEngine";
import { IconPause, IconVolume, IconMute, IconHeart, IconBolt } from "./Icons";

export function Hud({
  hud,
  onPause,
  muted,
  onToggleMute,
}: {
  hud: HudRefs;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <>
      {/* full-screen effect overlays */}
      <div ref={(el) => { hud.boostOverlay = el; }} className="boost-overlay" style={{ zIndex: 5 }} />

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 sm:p-4" style={{ zIndex: 10 }}>
        <div>
          <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/70">SCORE</div>
          <div ref={(el) => { hud.score = el; }} className="font-display text-3xl sm:text-4xl font-black tnum neon-text leading-none">
            0
          </div>
          <div ref={(el) => { hud.distance = el; }} className="text-xs text-cyan-200/60 tnum">0 m</div>
        </div>

        {/* combo / multiplier */}
        <div className="absolute left-1/2 top-3 sm:top-4 -translate-x-1/2 flex flex-col items-center">
          <div
            ref={(el) => { hud.combo = el; }}
            className="combo font-display text-2xl sm:text-3xl font-black text-cyan-200 neon-text leading-none"
            style={{ opacity: 0 }}
          >
            0x
          </div>
          <div ref={(el) => { hud.multiplier = el; }} className="multiplier font-display text-sm font-bold text-fuchsia-300/80 tnum">
            x1.0
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="icon-btn pe" onClick={onToggleMute} aria-label="Toggle sound">
            {muted ? <IconMute className="w-5 h-5" /> : <IconVolume className="w-5 h-5" />}
          </button>
          <button className="icon-btn pe" onClick={onPause} aria-label="Pause">
            <IconPause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* bottom-left stack */}
      <div className="absolute bottom-0 left-0 p-3 sm:p-4 flex flex-col gap-2 max-w-[64%]" style={{ zIndex: 10 }}>
        {/* speed */}
        <div className="flex items-end gap-2">
          <div ref={(el) => { hud.speed = el; }} className="font-display text-4xl sm:text-5xl font-black tnum leading-none text-white" style={{ textShadow: "0 0 14px rgba(255,45,149,0.7)" }}>
            0
          </div>
          <div className="text-xs font-bold text-fuchsia-300/80 mb-1">km/h</div>
        </div>
        <div className="bar-track w-36 sm:w-44">
          <div ref={(el) => { hud.speedFill = el; }} className="bar-fill speed-fill" style={{ width: "0%" }} />
        </div>

        {/* health */}
        <div className="flex items-center gap-2 mt-1">
          <IconHeart className="w-4 h-4 text-rose-400" />
          <div className="bar-track flex-1">
            <div ref={(el) => { hud.healthFill = el; }} className="bar-fill health-fill" style={{ width: "100%" }} />
          </div>
        </div>

        {/* nitro */}
        <div ref={(el) => { hud.nitroWrap = el; }} className="nitro-wrap flex items-center gap-2">
          <IconBolt className="w-4 h-4 text-lime-300" />
          <div className="bar-track flex-1">
            <div ref={(el) => { hud.nitroFill = el; }} className="bar-fill nitro-fill" style={{ width: "40%" }} />
          </div>
        </div>
      </div>

      {/* damage flash + popups + scanlines */}
      <div ref={(el) => { hud.damageFlash = el; }} className="damage-flash" style={{ zIndex: 14 }} />
      <div ref={(el) => { hud.popupLayer = el; }} className="absolute inset-0 overflow-hidden" style={{ zIndex: 18 }} />
      <div className="scanlines" />
    </>
  );
}
