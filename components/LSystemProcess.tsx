// biome-ignore-all lint/suspicious/noArrayIndexKey: Symbol offsets are fixed positions in a string.
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/LSystemProcess.module.css";
import type { ConstructionView } from "../utils/constructionView";
import { useConstructionNavigation } from "../utils/hooks/useConstructionNavigation";
import { useReducedMotion } from "../utils/hooks/useReducedMotion";
import {
  buildPlayback,
  playbackPace,
  playbackSource,
  symbolWindow,
  turtleAction,
} from "../utils/lsystem/playback";
import { preparePlaybackDrawing } from "../utils/lsystem/playbackDrawing";

function Word({
  word,
  active = -1,
  end = active + 1,
  built = word.length,
  label,
  width,
}: {
  word: string;
  active?: number;
  end?: number;
  built?: number;
  label: string;
  width?: number;
}) {
  const window = symbolWindow(word, Math.max(0, active), width);
  return (
    <fieldset className={styles.word} aria-label={label}>
      {window.before && <span title="Earlier symbols">…</span>}
      {Array.from(window.text).map((symbol, i) => {
        const index = window.start + i;
        return (
          <code
            key={index}
            data-symbol-index={index}
            aria-current={index === active ? "step" : undefined}
            className={
              index >= built
                ? styles.pending
                : index >= active && index < end
                  ? styles.active
                  : undefined
            }
          >
            {symbol}
          </code>
        );
      })}
      {window.after && <span title="Later symbols">…</span>}
      {!word.length && <span className={styles.empty}>Empty string</span>}
    </fieldset>
  );
}

export default function LSystemProcess({
  kind,
  params,
  level,
  playing,
  speed,
  onSpeedChange,
  view,
  setView,
  onInteract,
  onReset,
  onReady,
  onComplete,
}: {
  kind: string;
  params: unknown;
  level: number;
  playing: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  view: ConstructionView;
  setView: Dispatch<SetStateAction<ConstructionView>>;
  onInteract: () => void;
  onReset: () => void;
  onReady: (level: number) => void;
  onComplete: (complete: boolean) => void;
}) {
  const source = playbackSource(kind, params)!;
  const requested = Math.max(0, level - (source.legacy ? 1 : 0));
  const key = JSON.stringify([
    source.spec.axiom,
    source.spec.rules,
    source.spec.seed,
    source.spec.angle,
    source.spec.startAngle,
    source.spec.drawSymbols,
    source.spec.moveSymbols,
    source.spec.lengthFactor,
    source.spec.widthFactor,
    requested,
    source.legacy,
    source.turns,
    source.repeat,
    source.fibonacci,
    source.copies,
  ]);
  // Paint and camera edits do not rebuild the rewriting or turtle trace.
  // biome-ignore lint/correctness/useExhaustiveDependencies: key contains every geometry input.
  const model = useMemo(
    () =>
      buildPlayback(
        source.spec,
        requested,
        source.legacy,
        source.turns,
        source.repeat,
        source.fibonacci,
        source.copies,
      ),
    [key],
  );
  // A level picked by hand shows finished. Only playback walks through it.
  const [cursor, setCursor] = useState(() =>
    playing ? 0 : model.rewriteLength + model.instructionLength,
  );
  const startPlaying = useRef(playing);
  startPlaying.current = playing;
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 320 });
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const max = model.rewriteLength + model.instructionLength;
  const step = Math.min(cursor, max);
  const finished = step >= max;
  const drawing = step >= model.rewriteLength;
  const consumed = drawing ? step - model.rewriteLength : 0;
  const rewritten = drawing ? model.rewriteLength : step;
  const outputEnd = model.offsets[rewritten] ?? 0;
  const outputStart = model.offsets[Math.max(0, rewritten - 1)] ?? 0;
  const { delay, advance } = playbackPace(
    drawing ? model.instructionLength : model.rewriteLength,
    speed,
  );
  const change = (value: number) => {
    onInteract();
    setCursor(Math.max(0, Math.min(max, value)));
  };
  useConstructionNavigation(canvas, source.spec.dimension === "3d", view, setView, onReset);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new model starts a new rewrite.
  useEffect(() => {
    setCursor(startPlaying.current ? 0 : max);
  }, [model]);
  useEffect(() => {
    onReady(level);
  }, [onReady, level]);
  useEffect(() => {
    onComplete(step >= max);
  }, [step, max, onComplete]);
  useEffect(() => {
    if (!playing || step >= max) return;
    const boundary = drawing ? max : model.rewriteLength;
    const timer = window.setTimeout(() => setCursor(Math.min(boundary, step + advance)), delay);
    return () => clearTimeout(timer);
  }, [playing, step, max, drawing, advance, delay, model.rewriteLength]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const paint = useMemo(
    () =>
      preparePlaybackDrawing(size.width, size.height, model, source.spec.dimension === "3d", view),
    [size.width, size.height, model, source.spec.dimension, view],
  );
  useEffect(() => {
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * ratio;
    canvas.height = size.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const animate = (time: number) => {
      const progress =
        reduced || !playing || advance > 1 ? 1 : Math.min(1, (time - start) / (delay * 0.75));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(ctx, consumed, progress, drawing);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canvas, size, consumed, drawing, reduced, playing, advance, delay, paint]);
  const symbolWidth = view.symbolWidth as number | undefined;
  const symbolIndex = consumed > 0 ? (consumed - 1) % model.word.length : -1;
  const current = model.word[symbolIndex] ?? "";
  // Text can't be read while it changes many times a second.
  const readable = drawing && !finished && (!playing || delay >= 200);
  return (
    <div
      className={styles.process}
      data-lsystem-phase={drawing ? "draw" : "rewrite"}
      data-lsystem-consumed={consumed}
      data-lsystem-rewritten={rewritten}
    >
      <div className={styles.strings}>
        {model.rewriteLength > 0 && (
          <div className={styles.row}>
            <span>From iteration {level - 1}</span>
            <Word
              word={model.previous}
              active={drawing ? -1 : rewritten - 1}
              label="Previous iteration string"
              width={symbolWidth}
            />
          </div>
        )}
        <p className={styles.rule} aria-live={playing ? "off" : "polite"}>
          {!drawing && rewritten > 0 ? (
            <>
              <code>{model.previous[rewritten - 1]}</code> →{" "}
              <code key={rewritten} className={styles.replacement}>
                {model.word.slice(outputStart, outputEnd) || "∅"}
              </code>
            </>
          ) : (
            <span className={styles.rules}>
              {source.spec.rules.map(({ symbol, replacement }, index) => (
                <code key={index}>
                  {symbol} → {replacement || "∅"}
                </code>
              ))}
            </span>
          )}
        </p>
        <div className={styles.row}>
          <span>
            Iteration {level} · {model.word.length.toLocaleString("en-US")} symbols
          </span>
          <Word
            word={model.word}
            active={finished ? -1 : drawing ? symbolIndex : outputStart}
            end={finished ? 0 : drawing ? symbolIndex + 1 : outputEnd}
            built={drawing ? model.word.length : outputEnd}
            label="Current iteration string"
            width={symbolWidth}
          />
        </div>
      </div>
      <div className={styles.canvas} ref={container}>
        <canvas
          ref={setCanvas}
          tabIndex={0}
          aria-label={`Drawing, iteration ${level}. Drag to ${source.spec.dimension === "3d" ? "rotate" : "pan"}; scroll to zoom.`}
        />
        {!finished && (
          <span className={styles.phase}>
            {drawing
              ? model.repeat === 2
                ? consumed > model.word.length
                  ? "Second dragon · the same string, turned around"
                  : "First dragon · both copies read the same string"
                : "Draw the string"
              : "Build the next string"}
          </span>
        )}
      </div>
      <div className={styles.footer}>
        <p aria-live={playing ? "off" : "polite"}>
          {readable &&
            (source.fibonacci !== undefined && current === "0"
              ? `0: draw forward, then turn ${consumed % 2 === 0 ? "left" : "right"} by ${Math.abs(source.fibonacci)}°.`
              : source.turns?.[current] !== undefined
                ? `${current}: turn ${Math.abs(source.turns[current])}°. Stay in place.`
                : turtleAction(current, source.spec, source.legacy))}
        </p>
        <fieldset className={styles.controls} aria-label="L-system symbol controls">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => change(step - 1)}
            aria-label="Previous L-system symbol"
          >
            Previous
          </button>
          <label>
            <span>
              {drawing
                ? `Draw ${consumed} / ${model.instructionLength}`
                : `Rewrite ${rewritten} / ${model.rewriteLength}`}
            </span>
            <input
              type="range"
              min={0}
              max={max}
              value={step}
              aria-label="L-system symbol step"
              onChange={(event) => change(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={step === max}
            onClick={() => change(step + 1)}
            aria-label="Next L-system symbol"
          >
            Next symbol
          </button>
          <label className={styles.speed}>
            <span>Speed</span>
            <select
              aria-label="L-system animation speed"
              value={speed}
              onChange={(event) => onSpeedChange(Number(event.target.value))}
            >
              <option value={0.5}>½×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
        </fieldset>
        {model.limited && (
          <p className={styles.note}>
            This rule reached the drawing limit at iteration{" "}
            {model.generation + (source.legacy ? 1 : 0)}.
          </p>
        )}
        <details className={styles.history}>
          <summary>Strings for every iteration · {model.history.length}</summary>
          <ol start={source.legacy ? 1 : 0}>
            {model.history.map((word, index) => (
              <li key={index}>
                <span>Iteration {index + (source.legacy ? 1 : 0)}</span>
                <code>
                  {word}
                  {word.length === 160 && "…"}
                </code>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </div>
  );
}
