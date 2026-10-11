import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, type Phase, type HudRefs, type GameResult } from "./game/GameEngine";
import { loadHighScores, submitScore, type HighScore } from "./game/storage";
import { StartScreen } from "./components/StartScreen";
import { Hud } from "./components/Hud";
import { PauseScreen } from "./components/PauseScreen";
import { GameOverScreen } from "./components/GameOverScreen";
import { TouchControls } from "./components/TouchControls";

const detectTouch = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hud = useRef<HudRefs>({});

  const [phase, setPhase] = useState<Phase>("menu");
  const [scores, setScores] = useState<HighScore[]>(() => loadHighScores());
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<{ result: GameResult; rank: number } | null>(null);
  const [isTouch] = useState(detectTouch);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Create the engine once.
  useEffect(() => {
    const engine = new GameEngine(canvasRef.current!, {
      onGameOver: (r) => {
        const { table, rank } = submitScore(r);
        setScores(table);
        setResult({ result: r, rank });
      },
      onPhaseChange: (p) => setPhase(p),
    });
    engine.hud = hud.current;
    engine.setMuted(mutedRef.current);
    engineRef.current = engine;
    return () => engine.dispose();
  }, []);

  const startGame = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.audio.init();
    eng.audio.setMuted(mutedRef.current);
    setResult(null);
    eng.start();
  }, []);
  const goMenu = useCallback(() => engineRef.current?.toMenu(), []);
  const togglePause = useCallback(() => engineRef.current?.togglePause(), []);
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Global keyboard shortcuts for menus / pause / restart.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      const code = e.code;
      if (code === "KeyP" || code === "Escape") {
        if (phase === "running" || phase === "paused") {
          e.preventDefault();
          eng.togglePause();
        } else if (phase === "over" && code === "Escape") {
          eng.toMenu();
        }
        return;
      }
      if (phase === "menu") {
        if (code === "Enter" || code === "Space") {
          e.preventDefault();
          startGame();
        }
      } else if (phase === "over") {
        if (code === "Enter" || code === "Space" || code === "KeyR") {
          e.preventDefault();
          startGame();
        }
      } else if (code === "KeyR") {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame]);

  const best = scores.length > 0 ? scores[0].score : 0;

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="overlay">
        {phase !== "menu" && (
          <Hud hud={hud.current} onPause={togglePause} muted={muted} onToggleMute={toggleMute} />
        )}

        {phase === "running" && isTouch && <TouchControls engine={engineRef.current} />}

        {phase === "menu" && (
          <StartScreen
            scores={scores}
            best={best}
            onPlay={startGame}
            muted={muted}
            onToggleMute={toggleMute}
            isTouch={isTouch}
          />
        )}

        {phase === "paused" && (
          <PauseScreen
            onResume={togglePause}
            onRestart={startGame}
            onMenu={goMenu}
            muted={muted}
            onToggleMute={toggleMute}
          />
        )}

        {phase === "over" && result && (
          <GameOverScreen
            result={result.result}
            rank={result.rank}
            scores={scores}
            onRestart={startGame}
            onMenu={goMenu}
          />
        )}
      </div>
    </div>
  );
}
