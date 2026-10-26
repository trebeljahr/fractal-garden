import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/SierpinskiConnections.module.css";
import {
  chaosPoints,
  elementaryRows,
  MAX_CHAOS_POINTS,
  pascalResidues,
  pascalRows,
} from "../../utils/lessons/sierpinskiConnections";
import { SEED_ANCHORS, type SeedPoint } from "../../utils/lessons/sierpinskiSeeds";
import { LessonFrame, LessonSteps } from "./LessonFrame";

const INK = "#eee8ce";
const ACCENT = "#f5c56d";
const BACKGROUND = "#10151a";
const STARTS: { label: string; point: SeedPoint }[] = [
  { label: "Center", point: [0.5, Math.sqrt(3) / 3] },
  { label: "Left corner", point: [0, Math.sqrt(3) / 2] },
  { label: "Outside the triangle", point: [0.06, 0.08] },
];

function Drawing({
  draw,
  label,
  height = 440,
}: {
  draw: (ctx: CanvasRenderingContext2D) => void;
  label: string;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const render = () => {
      const width = canvas.getBoundingClientRect().width;
      if (!width) return;
      const scale = (width * (window.devicePixelRatio || 1)) / 600;
      canvas.width = Math.round(600 * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, 600, height);
      draw(ctx);
    };
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [draw, height]);
  return <canvas ref={ref} width={600} height={height} role="img" aria-label={label} />;
}

const position = ([x, y]: SeedPoint): SeedPoint => [80 + 440 * x, 32 + 440 * y];

export function ChaosGameLesson() {
  const [startIndex, setStartIndex] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const start = STARTS[startIndex].point;
  const dots = useMemo(() => chaosPoints(start, choices), [start, choices]);
  const current = dots.at(-1) ?? start;
  const previous = dots.at(-2) ?? start;
  const corner = choices.length ? SEED_ANCHORS[choices[choices.length - 1]] : null;
  const [x, y] = position(current);
  const [px, py] = position(previous);
  const target = corner ? position(corner) : null;
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = INK;
      for (const dot of dots) {
        const [dx, dy] = position(dot);
        ctx.fillRect(dx - 0.7, dy - 0.7, 1.4, 1.4);
      }
    },
    [dots],
  );
  const add = (count: number) => {
    const additions = Array.from(
      { length: Math.min(count, MAX_CHAOS_POINTS - choices.length) },
      () => Math.floor(Math.random() * 3),
    );
    setChoices((old) => [...old, ...additions]);
  };
  return (
    <LessonFrame title="Move halfway to a corner" kind="sierpinski-chaos">
      <div className={styles.controls} role="group" aria-label="Starting dot">
        {STARTS.map((option, index) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={startIndex === index}
            onClick={() => {
              setStartIndex(index);
              setChoices([]);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.drawing}>
        <Drawing
          draw={draw}
          label={`${dots.length} random halfway moves from ${STARTS[startIndex].label.toLowerCase()}`}
        />
        <svg viewBox="0 0 600 440" aria-hidden="true">
          <path d="M80 413.05L520 413.05L300 32Z" fill="none" stroke="#eee8ce33" />
          {SEED_ANCHORS.map((point, index) => {
            const [cx, cy] = position(point);
            return (
              <g key={String.fromCharCode(65 + index)}>
                <circle cx={cx} cy={cy} r="5" fill={INK} />
                <text
                  x={cx + (index === 0 ? -20 : 20)}
                  y={cy + 6}
                  fill={INK}
                  fontSize="17"
                  textAnchor="middle"
                >
                  {String.fromCharCode(65 + index)}
                </text>
              </g>
            );
          })}
          {target && (
            <g key={choices.length} className={shared.reveal}>
              <line
                x1={px}
                y1={py}
                x2={target[0]}
                y2={target[1]}
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <line x1={px} y1={py} x2={x} y2={y} stroke={ACCENT} strokeWidth="3" />
              <circle cx={px} cy={py} r="4" fill={BACKGROUND} stroke={ACCENT} strokeWidth="2" />
            </g>
          )}
          <circle cx={x} cy={y} r="5" fill={ACCENT} stroke={BACKGROUND} strokeWidth="1.5" />
        </svg>
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={() => add(1)} disabled={dots.length >= MAX_CHAOS_POINTS}>
          One random move
        </button>
        <button type="button" onClick={() => add(1000)} disabled={dots.length >= MAX_CHAOS_POINTS}>
          Add 1,000 dots
        </button>
        <button type="button" onClick={() => setChoices([])} disabled={!dots.length}>
          Start again
        </button>
      </div>
      <p role="status" className={styles.caption}>
        {dots.length === 0
          ? "The filled dot is your start. Make one move to see where halfway lands."
          : `${dots.length.toLocaleString("en-US")} ${dots.length === 1 ? "dot" : "dots"}. The last move chose corner ${String.fromCharCode(65 + choices[choices.length - 1])}. The hollow dot marks the previous position; the filled dot is halfway to that corner.`}
        {dots.length === MAX_CHAOS_POINTS && " Start again to try another path."}
      </p>
    </LessonFrame>
  );
}

export function PascalTriangleLesson() {
  const [rows, setRows] = useState(8);
  const [odd, setOdd] = useState(false);
  const [selected, setSelected] = useState<[number, number]>([4, 2]);
  const numbers = useMemo(() => pascalRows(8), []);
  const residues = useMemo(() => pascalResidues(rows), [rows]);
  const [r, c] = selected;
  const left = numbers[r - 1]?.[c - 1] ?? 0;
  const right = numbers[r - 1]?.[c] ?? 0;
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const size = 540 / rows;
      residues.forEach((row, rowIndex) =>
        row.forEach((value, column) => {
          if (odd && value === 0) return;
          ctx.fillStyle = odd ? ACCENT : INK;
          const x = 300 + (column - rowIndex / 2) * size;
          const y = 20 + (rowIndex * size * Math.sqrt(3)) / 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - size * 0.48, y + size * 0.83);
          ctx.lineTo(x + size * 0.48, y + size * 0.83);
          ctx.closePath();
          ctx.fill();
        }),
      );
    },
    [residues, rows, odd],
  );
  return (
    <LessonFrame title="Find the triangle in the numbers" kind="sierpinski-pascal">
      <div className={styles.controls}>
        <button type="button" aria-pressed={odd} onClick={() => setOdd(!odd)}>
          Color odd numbers
        </button>
        <label>
          Rows{" "}
          <select
            aria-label="Pascal rows"
            value={rows}
            onChange={(event) => setRows(Number(event.target.value))}
          >
            {[8, 16, 32, 64].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      </div>
      {rows === 8 ? (
        <>
          <div className={styles.pascal} role="group" aria-label="Pascal triangle numbers">
            {numbers.map((row, rowIndex) => (
              <div className={styles.pascalRow} key={`row-${rowIndex}`}>
                {row.map((value, column) => {
                  const active = rowIndex === r && column === c;
                  const parent = rowIndex === r - 1 && (column === c || column === c - 1);
                  return (
                    <button
                      key={`${rowIndex}-${column}`}
                      type="button"
                      className={[
                        styles.number,
                        odd && value % 2 === 1 && styles.odd,
                        active && styles.selected,
                        parent && styles.parent,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={active}
                      aria-label={`Row ${rowIndex + 1}, position ${column + 1}: ${value}, ${value % 2 ? "odd" : "even"}`}
                      onClick={() => setSelected([rowIndex, column])}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={styles.sum} role="status">
            {r === 0 ? (
              "Start with 1."
            ) : (
              <>
                <span>{left}</span>
                <span>+</span>
                <span>{right}</span>
                <span>=</span>
                <strong>{numbers[r][c]}</strong>
              </>
            )}
          </div>
          <p>Choose a number to see the two numbers added above it. Beyond the edges, use zero.</p>
        </>
      ) : (
        <>
          <div className={styles.drawing}>
            <Drawing
              draw={draw}
              height={510}
              label={`${rows} rows of Pascal's triangle, ${odd ? "odd entries filled and even entries blank" : "all entries filled"}`}
            />
          </div>
          <p role="status">
            {odd
              ? "Only odd numbers are filled. Add more rows to find larger copies of the triangle."
              : "Each small triangle stands for a number. Color the odd numbers to reveal the gaps."}
          </p>
        </>
      )}
    </LessonFrame>
  );
}

export function CellularTriangleLesson() {
  const [rule, setRule] = useState(90);
  const [step, setStep] = useState(7);
  const cells = useMemo(() => elementaryRows(rule, 64), [rule]);
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const count = step + 1;
      const size = Math.min(28, 560 / (count * 2 - 1));
      const left = 300 - size * 63.5;
      ctx.fillStyle = ACCENT;
      for (let row = 0; row <= step; row++) {
        cells[row].forEach((value, column) => {
          if (!value) return;
          const x = left + column * size;
          if (x >= 15 && x + size <= 585) ctx.fillRect(x, 20 + row * size, size * 0.9, size * 0.9);
        });
      }
    },
    [cells, step],
  );
  return (
    <LessonFrame title="Draw it with a rule for cells" kind="sierpinski-cells">
      <p>
        Each group shows three cells above and the result below. Flip a result to change the rule.
      </p>
      <div className={styles.rules} role="group" aria-label="Cell rule results">
        {Array.from({ length: 8 }, (_, index) => 7 - index).map((pattern) => {
          const filled = Boolean((rule >> pattern) & 1);
          const bits = [2, 1, 0].map((shift) => (pattern >> shift) & 1);
          return (
            <button
              type="button"
              key={pattern}
              className={styles.rule}
              aria-pressed={filled}
              aria-label={`${bits.map((bit) => (bit ? "filled" : "blank")).join(", ")} gives ${filled ? "filled" : "blank"}`}
              onClick={() => setRule(rule ^ (1 << pattern))}
            >
              <span className={styles.neighbours} aria-hidden="true">
                {bits.map((bit, index) => (
                  <span
                    key={`${pattern}-${index}`}
                    className={`${styles.cell} ${bit ? styles.filled : ""}`}
                  />
                ))}
              </span>
              <span aria-hidden="true">↓</span>
              <span
                aria-hidden="true"
                className={`${styles.cell} ${filled ? styles.filled : ""}`}
              />
            </button>
          );
        })}
      </div>
      <div className={styles.controls} role="group" aria-label="Cell rule presets">
        {[90, 30, 110].map((preset) => (
          <button
            type="button"
            key={preset}
            aria-pressed={rule === preset}
            onClick={() => setRule(preset)}
          >
            Rule {preset}
          </button>
        ))}
        <output>Current rule: {rule}</output>
      </div>
      <div className={styles.drawing}>
        <Drawing
          draw={draw}
          height={320}
          label={`Rule ${rule}, ${step + 1} rows, starting with one filled cell`}
        />
      </div>
      <LessonSteps
        step={step}
        max={63}
        onChange={setStep}
        label="Cell rows"
        stepDescription={`${step + 1} rows`}
      />
      <p role="status">
        {rule === 90
          ? "Rule 90 fills a cell when its left and right neighbors above differ. The middle neighbor makes no difference."
          : `Rule ${rule} uses the eight results above. Choose Rule 90 to return to the triangle.`}
      </p>
    </LessonFrame>
  );
}
