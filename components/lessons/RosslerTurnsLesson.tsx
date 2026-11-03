import { useDeferredValue, useId, useMemo, useState } from "react";
import shared from "../../styles/lessons/Lesson.module.css";
import styles from "../../styles/lessons/RosslerTurns.module.css";
import { measureRosslerTurns } from "../../utils/lessons/attractorLesson";
import { LessonFrame } from "./LessonFrame";

const CHOICES = [4, 6, 8.5, 8.7, 9, 11, 12];
const LOWEST_C = 2;
const HIGHEST_C = 18;
const SIZE = 320;
const ROUTE_MARGIN = 14;
const MAP_LEFT = 40;
const MAP_RIGHT = 12;
const MAP_TOP = 12;
const MAP_BOTTOM = 44;
const NARROWEST_MAP = 2;

const outcome = (repeat: number | null, peaks: number) =>
  repeat === null
    ? `No repeat in ${peaks} turns`
    : repeat === 1
      ? "Repeats every turn"
      : `Repeats every ${repeat} turns`;

export default function RosslerTurnsLesson() {
  const [c, setC] = useState(CHOICES[0]);
  const measured = useDeferredValue(c);
  const id = useId();
  const { peaks, repeat, route, routePeaks } = useMemo(
    () => measureRosslerTurns(measured),
    [measured],
  );

  const routeView = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of route) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const scale = (SIZE - 2 * ROUTE_MARGIN) / Math.max(maxX - minX, maxY - minY);
    return {
      at: (x: number, y: number) => ({
        x: SIZE / 2 + (x - (minX + maxX) / 2) * scale,
        y: SIZE / 2 - (y - (minY + maxY) / 2) * scale,
      }),
    };
  }, [route]);
  const routePath = useMemo(
    () =>
      route
        .map(([x, y], order) => {
          const point = routeView.at(x, y);
          return `${order ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
        })
        .join(""),
    [route, routeView],
  );

  const { low, high, mapX, mapY } = useMemo(() => {
    const smallest = Math.min(...peaks);
    const largest = Math.max(...peaks);
    const middle = (smallest + largest) / 2;
    const span = Math.max(NARROWEST_MAP, (largest - smallest) * 1.1);
    const low = middle - span / 2;
    const high = middle + span / 2;
    return {
      low,
      high,
      mapX: (value: number) =>
        MAP_LEFT + ((value - low) / (high - low)) * (SIZE - MAP_LEFT - MAP_RIGHT),
      mapY: (value: number) =>
        SIZE - MAP_BOTTOM - ((value - low) / (high - low)) * (SIZE - MAP_TOP - MAP_BOTTOM),
    };
  }, [peaks]);
  const dotSize = repeat === null ? 1.6 : 3.5;
  const readout = outcome(repeat, peaks.length);

  return (
    <LessonFrame title="How many turns before the route repeats?" kind="rossler-turns">
      <fieldset className={shared.options} aria-label="Choose c">
        {CHOICES.map((choice) => (
          <button
            type="button"
            key={choice}
            aria-pressed={c === choice}
            onClick={() => setC(choice)}
          >
            c = {choice}
          </button>
        ))}
      </fieldset>
      <label className={shared.parameter}>
        <span>
          c <b>{c.toFixed(2)}</b>
        </span>
        <input
          type="range"
          min={LOWEST_C}
          max={HIGHEST_C}
          step={0.01}
          value={c}
          onChange={(event) => setC(Number(event.target.value))}
        />
      </label>
      <p className={styles.readout} aria-live="polite" aria-atomic="true" data-turns-readout>
        {readout}
      </p>
      <div className={styles.panels}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={`${id}-route`}>
          <title
            id={`${id}-route`}
          >{`The settled route seen from above, x across and y up, with c at ${measured.toFixed(2)}. ${readout}.`}</title>
          <path d={routePath} className={styles.route} />
          <text x={SIZE - 6} y={SIZE - 8} textAnchor="end" className={styles.axisName}>
            x
          </text>
          <text x={6} y={20} className={styles.axisName}>
            y
          </text>
          {routePeaks.map(([x, y]) => {
            const point = routeView.at(x, y);
            return (
              <circle
                key={`${x} ${y}`}
                cx={point.x}
                cy={point.y}
                r={dotSize}
                className={styles.peak}
              />
            );
          })}
        </svg>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={`${id}-map`}>
          <title
            id={`${id}-map`}
          >{`Each peak of x against the next peak of x, with c at ${measured.toFixed(2)}. ${readout}.`}</title>
          <path
            d={`M${mapX(low)},${mapY(low)}L${mapX(high)},${mapY(high)}`}
            className={styles.same}
          />
          <path
            d={`M${mapX(low)},${mapY(high)}V${mapY(low)}H${mapX(high)}`}
            className={shared.axis}
          />
          {peaks.slice(0, -1).map((peak, order) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: The order of the peaks is fixed for each reading.
              key={order}
              cx={mapX(peak)}
              cy={mapY(peaks[order + 1])}
              r={dotSize}
              className={styles.peak}
            />
          ))}
          <text
            x={(MAP_LEFT + SIZE - MAP_RIGHT) / 2}
            y={SIZE - 8}
            textAnchor="middle"
            className={styles.axisName}
          >
            this peak of x
          </text>
          <text
            transform={`translate(16 ${(MAP_TOP + SIZE - MAP_BOTTOM) / 2}) rotate(-90)`}
            textAnchor="middle"
            className={styles.axisName}
          >
            next peak of x
          </text>
          <text x={mapX(low)} y={SIZE - 26} className={styles.tick}>
            {low.toFixed(1)}
          </text>
          <text x={mapX(high)} y={SIZE - 26} textAnchor="end" className={styles.tick}>
            {high.toFixed(1)}
          </text>
        </svg>
      </div>
    </LessonFrame>
  );
}
