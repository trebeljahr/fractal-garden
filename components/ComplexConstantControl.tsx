import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import styles from "../styles/ComplexConstantControl.module.css";

export type ComplexConstant = { cReal: number; cImag: number };

type Props = {
  value: ComplexConstant;
  onChange: (value: ComplexConstant) => void;
};

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const snap = (value: number) => Number(clamp(value).toFixed(3));

function CoordinateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const labelId = useId();
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = draft.trim() === "" ? NaN : Number(draft);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(String(next));
    onChange(next);
  };

  return (
    <div className={styles.coordinate}>
      <span id={labelId}>{label}</span>
      <input
        aria-labelledby={labelId}
        type="text"
        inputMode="decimal"
        spellCheck={false}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = next.trim() === "" ? NaN : Number(next);
          if (Number.isFinite(parsed) && parsed >= -1 && parsed <= 1) onChange(parsed);
        }}
        onFocus={() => {
          editing.current = true;
        }}
        onBlur={() => {
          editing.current = false;
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const next = snap(value + (event.key === "ArrowUp" ? 1 : -1) * 0.001);
            setDraft(String(next));
            onChange(next);
          }
        }}
      />
    </div>
  );
}

export function ComplexConstantControl({ value, onChange }: Props) {
  const hintId = useId();
  const valueId = useId();
  const pointerId = useRef<number | null>(null);
  const pointX = ((clamp(value.cReal) + 1) / 2) * 100;
  const pointY = ((1 - clamp(value.cImag)) / 2) * 100;

  const movePoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onChange({
      cReal: snap(((event.clientX - rect.left) / rect.width) * 2 - 1),
      cImag: snap(1 - ((event.clientY - rect.top) / rect.height) * 2),
    });
  };

  const moveWithKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.01 : 0.001;
    let { cReal, cImag } = value;
    switch (event.key) {
      case "ArrowLeft":
        cReal = snap(cReal - step);
        break;
      case "ArrowRight":
        cReal = snap(cReal + step);
        break;
      case "ArrowUp":
        cImag = snap(cImag + step);
        break;
      case "ArrowDown":
        cImag = snap(cImag - step);
        break;
      case "Home":
        cReal = 0;
        cImag = 0;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange({ cReal, cImag });
  };

  return (
    <li className={`cr ${styles.control}`}>
      <div className={styles.chart}>
        <span className={styles.imaginaryLabel}>Imaginary (y)</span>
        <div className={styles.planeWrap}>
          <div
            className={styles.plane}
            role="application"
            aria-label="Complex constant plane"
            aria-roledescription="2D point control"
            aria-describedby={`${hintId} ${valueId}`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: Custom 2D input handles arrow keys; labeled text inputs provide an alternative.
            tabIndex={0}
            onKeyDown={moveWithKeys}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0 || pointerId.current !== null) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              pointerId.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              movePoint(event);
            }}
            onPointerMove={(event) => {
              if (pointerId.current === event.pointerId) movePoint(event);
            }}
            onPointerUp={(event) => {
              if (pointerId.current !== event.pointerId) return;
              movePoint(event);
              pointerId.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              pointerId.current = null;
            }}
            onLostPointerCapture={() => {
              pointerId.current = null;
            }}
          >
            <span className={styles.horizontalGuide} style={{ top: `${pointY}%` }} />
            <span className={styles.verticalGuide} style={{ left: `${pointX}%` }} />
            <span className={styles.origin} aria-hidden="true">
              0
            </span>
            <span className={styles.point} style={{ left: `${pointX}%`, top: `${pointY}%` }} />
          </div>
          <span className={styles.topTick} aria-hidden="true">
            +1
          </span>
          <span className={styles.bottomTick} aria-hidden="true">
            −1
          </span>
          <div className={styles.realAxis} aria-hidden="true">
            <span>−1</span>
            <span>Real (x)</span>
            <span>+1</span>
          </div>
        </div>
      </div>
      <div className={styles.coordinates}>
        <CoordinateInput
          label="Real (x)"
          value={value.cReal}
          onChange={(cReal) => onChange({ cReal, cImag: value.cImag })}
        />
        <CoordinateInput
          label="Imaginary (y)"
          value={value.cImag}
          onChange={(cImag) => onChange({ cReal: value.cReal, cImag })}
        />
      </div>
      <p className={styles.hint} id={hintId}>
        Drag the point or use arrow keys. Shift moves faster.
      </p>
      <span className={styles.srOnly} id={valueId} aria-live="polite" aria-atomic="true">
        Real {value.cReal}, imaginary {value.cImag}. Range −1 to +1 on each axis. Home resets to
        zero.
      </span>
    </li>
  );
}
