import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/ReadoutStage.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  FILL_CELLS_PER_UNIT,
  FILL_DIGITS,
  FRACTION_DIGITS,
  latticeCells,
  MAX_WHOLE_DIGITS,
  numberAt,
  ORIGIN,
  placeStep,
  type Spot,
  spotOf,
} from "../../utils/lessons/twindragonDigits";
import { LessonFrame } from "./LessonFrame";

const BACKGROUND = "#252424";
// Tiles that touch never share their last two whole digits, so these tones keep neighbors apart.
const TILES = ["#4b4640", "#5d564c", "#6e6657", "#3f3b37"].map(rgb);
const CURRENT = rgb("#a9794a");
const WHOLE_STEP = "#7fd8e8";
const FRACTION_STEP = "#f2efde";
const PADDING = 0.06;
const START = 0b101000110011;

function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255] as const;
}

function frameOf(cells: Int32Array) {
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let i = 0; i < cells.length; i += 2) {
    const [x, y] = [-cells[i], -cells[i + 1]];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const [columns, rows] = [maxX - minX + 1, maxY - minY + 1];
  return { minX, maxY, columns, rows, span: Math.max(columns, rows) };
}

export default function TwindragonDigitsLesson() {
  const [wholeDigits, setWholeDigits] = useState(0);
  const [size, setSize] = useState(0);
  const number = useTriedPoint<number>(START);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { cells, frame } = useMemo(() => {
    const found = latticeCells(FILL_DIGITS + wholeDigits);
    return { cells: found, frame: frameOf(found) };
  }, [wholeDigits]);
  const value = number.value;
  const current = value >> FRACTION_DIGITS;

  // Each cell is one pixel of a small sheet, which the stage stretches in one draw.
  const sheet = useMemo(() => {
    if (typeof document === "undefined") return null;
    const image = document.createElement("canvas");
    image.width = frame.columns;
    image.height = frame.rows;
    const context = image.getContext("2d");
    if (!context) return null;
    const pixels = context.createImageData(frame.columns, frame.rows);
    for (let n = 0; n < cells.length / 2; n++) {
      const tile = n >> FILL_DIGITS;
      const color = tile === current ? CURRENT : TILES[tile & 3];
      const at =
        4 * ((frame.maxY + cells[2 * n + 1]) * frame.columns + (-cells[2 * n] - frame.minX));
      pixels.data[at] = color[0];
      pixels.data[at + 1] = color[1];
      pixels.data[at + 2] = color[2];
      pixels.data[at + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return image;
  }, [cells, frame, current]);

  const unit = (size * (1 - 2 * PADDING)) / (frame.span / FILL_CELLS_PER_UNIT);
  const cell = unit / FILL_CELLS_PER_UNIT;
  const left = (size - frame.columns * cell) / 2;
  const top = (size - frame.rows * cell) / 2;
  // A cell's spot is at the center of its pixel.
  const toStage = ([x, y]: Spot): Spot => [
    left + (x - ORIGIN[0]) * unit + (0.5 - frame.minX) * cell,
    top + (ORIGIN[1] - y) * unit + (0.5 + frame.maxY) * cell,
  ];
  const fromStage = (px: number, py: number): Spot => [
    ORIGIN[0] + (px - left - (0.5 - frame.minX) * cell) / unit,
    ORIGIN[1] - (py - top - (0.5 + frame.maxY) * cell) / unit,
  ];

  const picker = usePointPicker<number | null>({
    under: (event: PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return numberAt(fromStage(event.clientX - rect.left, event.clientY - rect.top), wholeDigits);
    },
    onChange: (next) => {
      if (next !== null) number.keep(next);
    },
    onHover: (next) => number.tryOut(next),
  });
  const stage = picker.ref;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: toStage only reads the listed values.
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size || !sheet) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * ratio);
    element.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size, size);
    context.drawImage(sheet, left, top, frame.columns * cell, frame.rows * cell);

    // A dot at each grid point, where a tile's fraction digits are all 0.
    context.fillStyle = FRACTION_STEP;
    for (let tile = 0; tile < 2 ** wholeDigits; tile++) {
      const [x, y] = toStage(spotOf(tile << FRACTION_DIGITS));
      context.beginPath();
      context.arc(x, y, 2, 0, 2 * Math.PI);
      context.fill();
    }

    // One arrow for each digit 1, from the largest place down.
    let [x, y] = toStage(ORIGIN);
    context.lineWidth = 1.8;
    for (let bit = FRACTION_DIGITS + wholeDigits - 1; bit >= 0; bit--) {
      if (!((value >> bit) & 1)) continue;
      const [dx, dy] = placeStep(bit - FRACTION_DIGITS);
      const [endX, endY] = [x + dx * unit, y - dy * unit];
      const head = Math.min(9, Math.hypot(dx, dy) * unit * 0.45);
      const angle = Math.atan2(endY - y, endX - x);
      const color = bit >= FRACTION_DIGITS ? WHOLE_STEP : FRACTION_STEP;
      context.strokeStyle = color;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(endX, endY);
      context.stroke();
      context.beginPath();
      context.moveTo(endX, endY);
      context.lineTo(endX - head * Math.cos(angle - 0.45), endY - head * Math.sin(angle - 0.45));
      context.lineTo(endX - head * Math.cos(angle + 0.45), endY - head * Math.sin(angle + 0.45));
      context.closePath();
      context.fill();
      [x, y] = [endX, endY];
    }
    context.fillStyle = "#ffffff";
    context.strokeStyle = BACKGROUND;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(x, y, 4.5, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
  }, [sheet, frame, unit, cell, left, top, size, wholeDigits, value]);

  const count = FRACTION_DIGITS + wholeDigits;
  const places = Array.from({ length: count }, (_, i) => count - 1 - i);
  const written = value.toString(2).padStart(count, "0");
  return (
    <LessonFrame title="Write a position in binary" kind="twindragon-digits">
      <fieldset className={styles.digitRow} aria-label="Digits">
        {places.map((bit) => {
          const digit = (value >> bit) & 1;
          const place = bit - FRACTION_DIGITS;
          const [dx, dy] = placeStep(place);
          return (
            <span key={bit} className={styles.digitPlace}>
              {place === -1 && <span className={styles.digitPoint}>.</span>}
              <button
                type="button"
                aria-pressed={digit === 1}
                aria-label={`Digit ${digit} at place ${place}`}
                className={place >= 0 ? styles.wholeDigit : undefined}
                onClick={() => number.keep(number.kept ^ (1 << bit))}
              >
                <svg viewBox="-8 -8 16 16" aria-hidden="true">
                  <path
                    d="M-6 0H5M1.5-3.5 5 0 1.5 3.5"
                    transform={`rotate(${(Math.atan2(-dy, dx) * 180) / Math.PI})`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
                {digit}
              </button>
            </span>
          );
        })}
      </fieldset>
      <div className={styles.digitStage}>
        <button
          type="button"
          tabIndex={-1}
          className={`${styles.stage} ${styles.pick}`}
          aria-label={`The digits ${written.slice(0, wholeDigits)}.${written.slice(wholeDigits)} land here. Move the pointer over a tile to read another spot's digits.`}
          {...picker}
        >
          <canvas ref={canvas} />
        </button>
      </div>
      <label className={styles.digitCount}>
        <span>
          Whole digits {wholeDigits}, {2 ** wholeDigits} {wholeDigits ? "tiles" : "tile"}
        </span>
        <input
          type="range"
          min={0}
          max={MAX_WHOLE_DIGITS}
          step={1}
          value={wholeDigits}
          aria-label="Whole digits"
          onChange={(event) => {
            const next = Number(event.target.value);
            setWholeDigits(next);
            number.keep(number.kept % 2 ** (FRACTION_DIGITS + next));
          }}
        />
      </label>
    </LessonFrame>
  );
}
