"use client";
import { useEffect, useRef, useState } from "react";
import {
  checkpoints,
  createGame,
  FINISH,
  step,
  type Game,
  type Input,
  type Mode,
} from "./engine";
import { draw } from "./render";
import { playEffect } from "./sound";
const emptyInput = (): Input => ({
  left: false,
  right: false,
  jump: false,
});
export default function Arcade() {
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<HTMLDivElement>(null);
  const game = useRef(createGame("career")),
    input = useRef(emptyInput());
  const [state, setState] = useState<Game>(game.current),
    [sound, setSound] = useState(false),
    [best, setBest] = useState(0);
  const soundEnabled = useRef(false),
    audio = useRef<AudioContext | null>(null);
  const audioOutput = useRef<GainNode | null>(null);
  const [help, setHelp] = useState(false);
  const helpDialog = useRef<HTMLDialogElement>(null);
  function publish() {
    setState({ ...game.current, collected: [...game.current.collected] });
  }
  function start() {
    if (game.current.status !== "paused")
      game.current = createGame(game.current.mode);
    game.current.status = "playing";
    input.current = emptyInput();
    publish();
    stage.current?.focus();
  }
  function pause() {
    if (game.current.status === "playing") {
      game.current.status = "paused";
      input.current = emptyInput();
      publish();
    }
  }
  function mode(mode: Mode) {
    game.current = createGame(mode);
    input.current = emptyInput();
    publish();
  }
  function toggleSound() {
    const enabled = !soundEnabled.current;
    soundEnabled.current = enabled;
    setSound(enabled);
    if (enabled) {
      if (!audio.current) {
        audio.current = new AudioContext();
        audioOutput.current = audio.current.createGain();
        audioOutput.current.connect(audio.current.destination);
      }
      audioOutput.current!.gain.value = 1;
      void audio.current.resume();
    } else if (audioOutput.current) audioOutput.current.gain.value = 0;
  }
  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("michael-joffe-cv-best-v3")) || 0);
    } catch {}
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0,
      last = 0,
      accumulator = 0,
      ui = 0;
    const beep = (event: Game["event"]) => {
      if (soundEnabled.current && audio.current && audioOutput.current)
        playEffect(audio.current, audioOutput.current, event, game.current);
    };
    const frame = (time: number) => {
      const elapsed = Math.min((time - last) / 1000 || 0, 0.05);
      last = time;
      accumulator += elapsed;
      while (accumulator >= 1 / 60) {
        const previous = game.current.status;
        step(game.current, input.current, 1 / 60);
        if (previous === "playing") beep(game.current.event);
        input.current.jump = false;
        accumulator -= 1 / 60;
        if (previous === "playing" && game.current.status === "finished") {
          try {
            const score = Math.max(
              Number(localStorage.getItem("michael-joffe-cv-best-v3")) || 0,
              game.current.score,
            );
            localStorage.setItem("michael-joffe-cv-best-v3", String(score));
            setBest(score);
          } catch {}
          publish();
        }
      }
      draw(ctx, game.current);
      if (time - ui > 100 && game.current.status === "playing") {
        publish();
        ui = time;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onBlur = () => pause();
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      void audio.current?.close();
      audio.current = null;
      audioOutput.current = null;
    };
  }, []);
  const key = (e: React.KeyboardEvent, down: boolean) => {
    if (
      e.target instanceof HTMLButtonElement ||
      e.target instanceof HTMLAnchorElement ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey
    )
      return;
    const mapped: Record<string, keyof Input> = {
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
      " ": "jump",
      ArrowUp: "jump",
      w: "jump",
    };
    const action = mapped[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (action) {
      e.preventDefault();
      if (action !== "left" && action !== "right" && e.repeat) return;
      if (down || action === "left" || action === "right")
        input.current[action] = down;
    }
    if (
      down &&
      !e.repeat &&
      (e.key === "Escape" || e.key.toLowerCase() === "p")
    ) {
      e.preventDefault();
      if (game.current.status === "playing") pause();
      else if (game.current.status === "paused") start();
    }
    if (down && e.key === "Enter" && game.current.status !== "playing") {
      e.preventDefault();
      start();
    }
  };
  const control = (name: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      stage.current?.focus({ preventScroll: true });
      e.currentTarget.setPointerCapture(e.pointerId);
      input.current[name] = true;
    },
    onPointerUp: () => {
      if (name === "left" || name === "right") input.current[name] = false;
    },
    onPointerCancel: () => {
      input.current[name] = false;
    },
    onLostPointerCapture: () => {
      if (name !== "jump") input.current[name] = false;
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) input.current[name] = true;
      }
    },
    onKeyUp: () => {
      if (name === "left" || name === "right") input.current[name] = false;
    },
  });
  const lastCheckpoint = state.collected.at(-1);
  const careerHighlight = checkpoints[lastCheckpoint ?? 0];
  return (
    <section
      className="arcade-section"
      id="arcade"
      aria-label="Playable résumé"
    >
      <div className="section-top">
        <span>1 PLAYER · 2 MODES</span>
      </div>
      <div className="arcade-layout">
        <div className="cabinet">
          <div className="cabinet-bar">
            <span>MJ</span>
            <div>
              <button
                onPointerDown={(e) => e.preventDefault()}
                onClick={toggleSound}
                aria-pressed={sound}
              >
                {sound ? "♫ SOUND ON" : "♪ SOUND OFF"}
              </button>
              <button
                onClick={() => {
                  pause();
                  setHelp(true);
                }}
                aria-label="How to play"
              >
                ?
              </button>
            </div>
          </div>
          <div className="hud">
            <div>
              <small>SCORE</small>
              <b>{String(state.score).padStart(6, "0")}</b>
            </div>
            <div>
              <small>
                {state.mode === "career" ? "CAREER JAM" : "FREESTYLE"}
              </small>
              <b>
                {state.mode === "career"
                  ? `${state.collected.length} / 6`
                  : `${state.landed} JUMPS`}
              </b>
            </div>
            <div>
              <small>TIME</small>
              <b>{String(Math.ceil(state.time)).padStart(2, "0")}</b>
            </div>
            <div>
              <small>{state.mode === "career" ? "LIVES" : "BEST HEIGHT"}</small>
              <b className={state.mode === "career" ? "hearts" : ""}>
                {state.mode === "career" ? (
                  <span aria-label={`${state.lives} lives`}>
                    {"♥".repeat(state.lives)}
                    {"♡".repeat(3 - state.lives)}
                  </span>
                ) : (
                  Math.round(state.bestHeight)
                )}
              </b>
            </div>
          </div>
          <div
            className={`game-stage game-stage-${state.mode}`}
            ref={stage}
            tabIndex={0}
            onKeyDown={(e) => key(e, true)}
            onKeyUp={(e) => key(e, false)}
            onBlur={(e) => {
              // Touch controls can move focus outside the canvas on mobile.
              // Clear held keys without treating a focus change as a pause.
              if (
                !e.currentTarget.contains(e.relatedTarget) &&
                !(
                  e.relatedTarget instanceof Element &&
                  e.relatedTarget.closest(".touch-controls")
                )
              ) {
                input.current.left = false;
                input.current.right = false;
              }
            }}
            aria-label="Skating game. Enter to start. Left and right to move. Space to jump. Career jam: Left brakes and Right speeds up. Landings are automatic. P to pause."
          >
            <canvas
              ref={canvas}
              width={960}
              height={540}
              role="img"
              aria-label={
                state.mode === "career"
                  ? "Side-scrolling pixel art street with layered buildings and pavement"
                  : "Pixel art half-pipe with timber supports and a cheering crowd"
              }
            >
              All career information is available in the résumé below.
            </canvas>
            {state.mode === "career" &&
              (state.status === "ready" || state.status === "playing") && (
                <div className="in-game-highlight" aria-live="polite">
                  <span>
                    {lastCheckpoint === undefined ? "UP NEXT" : "EXPERIENCE"} ·{" "}
                    {careerHighlight.year}
                  </span>
                  <h3>{careerHighlight.title}</h3>
                  <p>{careerHighlight.detail}</p>
                  <a href={`#role-${careerHighlight.index}`} onClick={pause}>
                    View experience ↗
                  </a>
                </div>
              )}
            {state.status === "ready" && (
              <div className="start-overlay">
                <button className="primary-button" onClick={start}>
                  ▶ START SESSION <span>ENTER ↵</span>
                </button>
              </div>
            )}
            {state.status === "paused" && (
              <div className="game-overlay">
                <h3>PAUSED</h3>
                <button className="primary-button" onClick={start}>
                  ▶ RESUME
                </button>
                <button
                  className="text-button"
                  onClick={() => mode(state.mode)}
                >
                  Back to start
                </button>
              </div>
            )}
            {state.status === "finished" && (
              <div className="game-overlay">
                <span className="eyebrow">
                  {state.mode === "career" && state.x >= FINISH
                    ? "ALL CHECKPOINTS REACHED"
                    : "SESSION COMPLETE"}
                </span>
                <h3>{state.score.toLocaleString()} POINTS</h3>
                <p>
                  {state.mode === "career"
                    ? `${state.collected.length} of 6 career checkpoints`
                    : `${state.landed} jumps completed`}
                </p>
                <button className="primary-button" onClick={start}>
                  ↻ PLAY AGAIN
                </button>
                <a href="#resume" className="text-button">
                  Read the full résumé ↗
                </a>
              </div>
            )}
          </div>
          <div className="game-progress">
            <span
              style={{
                width: `${state.mode === "career" ? Math.max(1, (state.x / FINISH) * 100) : ((60 - state.time) / 60) * 100}%`,
              }}
            />
          </div>
          <div className="control-bar">
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd>{" "}
              {state.mode === "career" ? "BRAKE / SPEED UP" : "MOVE"}
            </span>
            <span>
              <kbd>SPACE</kbd> JUMP
            </span>
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={() =>
                state.status === "playing"
                  ? pause()
                  : state.status === "paused"
                    ? start()
                    : setHelp(true)
              }
            >
              {state.status === "paused"
                ? "▶ RESUME"
                : state.status === "playing"
                  ? "Ⅱ PAUSE"
                  : "HOW TO PLAY ↗"}
            </button>
          </div>
          <div className="touch-controls" aria-label="Touch game controls">
            <button
              {...control("left")}
              aria-label={state.mode === "career" ? "Brake" : "Move left"}
            >
              ←
            </button>
            <button
              {...control("right")}
              aria-label={state.mode === "career" ? "Speed up" : "Move right"}
            >
              →
            </button>
            <button {...control("jump")}>
              JUMP <b>A</b>
            </button>
          </div>
        </div>
        <aside className="game-sidebar">
          <div className="sidebar-label">
            SELECT A MODE <span>↙</span>
          </div>
          <button
            className={`session ${state.mode === "career" ? "selected" : ""}`}
            onClick={() => mode("career")}
            aria-pressed={state.mode === "career"}
          >
            <span className="session-number">01</span>
            <span>
              <strong>Career jam</strong>
              <small>EXPLORE MY EXPERIENCE</small>
            </span>
            <span>↗</span>
          </button>
          <button
            className={`session ${state.mode === "freestyle" ? "selected" : ""}`}
            onClick={() => mode("freestyle")}
            aria-pressed={state.mode === "freestyle"}
          >
            <span className="session-number">02</span>
            <span>
              <strong>Freestyle</strong>
              <small>THE HALF-PIPE</small>
            </span>
            <span>↗</span>
          </button>
          <div className="high-score">
            <span>LOCAL HIGH SCORE</span>
            <b>{String(best).padStart(6, "0")}</b>
          </div>
        </aside>
      </div>
      <p className="game-footnote">
        <span>
          Keyboard and touch controls · High score saved on this device
        </span>
      </p>
      <dialog
        ref={helpDialog}
        onCancel={() => setHelp(false)}
        onClose={() => setHelp(false)}
        className="help-dialog"
      >
        <button
          className="dialog-close"
          aria-label="Close instructions"
          onClick={() => setHelp(false)}
        >
          ×
        </button>
        <span className="eyebrow">CONTROLS</span>
        <h2>How to play</h2>
        <p>
          <b>Career jam:</b> Travel from left to right. Hold Left to brake or
          Right to speed up. Press Space to jump over cones and barriers.
          Collisions cost one life; you recover automatically. Reach six
          checkpoints to explore my experience.
        </p>
        <p>
          <b>Freestyle:</b> Ride the half-pipe for 60 seconds. Use left and
          right to change direction and Space to jump. The skater turns at the
          edges and lands automatically. Higher jumps earn more points.
        </p>
        <dl>
          <dt>← / → or A / D</dt>
          <dd>Career jam: brake / speed up. Freestyle: move left / right.</dd>
          <dt>Space / ↑ / W</dt>
          <dd>Jump. No extra input is needed to land.</dd>
          <dt>P / Escape</dt>
          <dd>Pause or resume. Switching tabs or apps also pauses it.</dd>
        </dl>
        <p>
          On a phone, use the three buttons below the game. Sound is optional.
          Your high score is saved on this device.
        </p>
        <button
          className="primary-button"
          onClick={() => {
            helpDialog.current?.close();
            setHelp(false);
            start();
          }}
        >
          ▶ {state.status === "paused" ? "RESUME" : "START SESSION"}
        </button>
      </dialog>
    </section>
  );
}
