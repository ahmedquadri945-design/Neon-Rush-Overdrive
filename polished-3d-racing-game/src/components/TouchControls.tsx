import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../game/GameEngine";
import { IconBolt } from "./Icons";

export function TouchControls({ engine }: { engine: GameEngine | null }) {
  const activeId = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    return () => engine?.setTouchNitro(false);
  }, [engine]);

  return (
    <>
      {/* full-screen drag-to-steer surface (sits under HUD buttons & nitro) */}
      <div
        className="steer-layer"
        style={{ zIndex: 8 }}
        onPointerDown={(e) => {
          if (activeId.current !== null) return;
          activeId.current = e.pointerId;
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          engine?.steerStart(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.pointerId === activeId.current) engine?.steerMove(e.clientX);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === activeId.current) {
            activeId.current = null;
            engine?.steerEnd();
          }
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === activeId.current) {
            activeId.current = null;
            engine?.steerEnd();
          }
        }}
      />

      <button
        className={`nitro-btn ${pressed ? "pressed" : ""}`}
        aria-label="Nitro boost"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          setPressed(true);
          engine?.setTouchNitro(true);
        }}
        onPointerUp={() => {
          setPressed(false);
          engine?.setTouchNitro(false);
        }}
        onPointerCancel={() => {
          setPressed(false);
          engine?.setTouchNitro(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <IconBolt className="w-8 h-8" />
      </button>
    </>
  );
}
