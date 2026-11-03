// biome-ignore-all lint/suspicious/noArrayIndexKey: Histogram indices identify fixed spatial cells.
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/lessons/BuddhabrotAccumulation.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import layout from "../../styles/lessons/LinkedExperiments.module.css";
import { usePointPicker, useTriedPoint } from "../../utils/hooks/usePointPicker";
import {
  accumulateOrbits,
  BINS_PER_UNIT,
  HISTOGRAM_WIDTH,
  insideMap,
  type OrbitPoint,
  PICTURE,
  PICTURE_HEIGHT,
  PICTURE_WIDTH,
  paintStarts,
  paintVisits,
  ROUTE_BANDS,
  ROUTE_LIMIT,
  type Route,
  RouteRun,
  routeVisits,
  traceRoute,
  visitOpacity,
} from "../../utils/lessons/buddhabrotAccumulation";
import { LessonFrame } from "./LessonFrame";

const FIRST_NUMBER = { x: 0.3, y: 0.6 };
const BANDS = [{ label: "All routes", band: null as number | null }].concat(
  ROUTE_BANDS.map(({ label }, band) => ({ label, band })),
);
const MS_PER_FRAME = 8;
const MS_PER_PAINT = 120;
const ARROW_STEP = 0.02;
const SQUARE = PICTURE_WIDTH / HISTOGRAM_WIDTH;
const VIEW_BOX = `0 0 ${PICTURE_WIDTH} ${PICTURE_HEIGHT}`;
type Status = "idle" | "running" | "paused" | "done";

let cachedInside: Uint8Array | undefined;

const count = (value: number) => value.toLocaleString("en-US");
const counted = (value: number, noun: string) => `${count(value)} ${noun}${value === 1 ? "" : "s"}`;
const decimal = (value: number) => Math.abs(value).toFixed(3);
const describe = ({ x, y }: OrbitPoint) =>
  `${x < 0 ? "−" : ""}${decimal(x)} ${y < 0 ? "−" : "+"} ${decimal(y)}i`;
const place = ({ x, y }: OrbitPoint) =>
  `${(y - PICTURE.left) * BINS_PER_UNIT} ${(x - PICTURE.top) * BINS_PER_UNIT}`;

// Each dot is a saved position. The line's last piece runs to the position outside the circle.
function RouteMarks({ route }: { route: Route }) {
  const line = `M${route.points.map(place).join("L")}`;
  const positions = route.escaped ? routeVisits(route) : route.points;
  return (
    <>
      <path d={line} className={styles.route} />
      <path d={positions.map((point) => `M${place(point)}h.01`).join("")} className={styles.dots} />
    </>
  );
}

export default function BuddhabrotAccumulation() {
  const spot = useTriedPoint<OrbitPoint | null>(FIRST_NUMBER);
  const [band, setBand] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [recordings, setRecordings] = useState<Route[]>([]);
  const startsCanvas = useRef<HTMLCanvasElement>(null);
  const visitsCanvas = useRef<HTMLCanvasElement>(null);
  const tally = useRef<HTMLParagraphElement>(null);
  const run = useRef<RouteRun | null>(null);
  const images = useRef<{ starts: ImageData; visits: ImageData } | null>(null);
  const shownBand = useRef(band);
  shownBand.current = band;

  const route = useMemo(() => (spot.value ? traceRoute(spot.value) : null), [spot.value]);
  const added = useMemo(() => (route ? accumulateOrbits([route]).visits : 0), [route]);
  const recorded = useMemo(() => accumulateOrbits(recordings), [recordings]);

  const paint = useRef(() => {});
  paint.current = () => {
    const inside = cachedInside;
    const starts = startsCanvas.current?.getContext("2d");
    const visits = visitsCanvas.current?.getContext("2d");
    if (!inside || !starts || !visits) return;
    const shown = shownBand.current;
    images.current ??= {
      starts: starts.createImageData(PICTURE_WIDTH, PICTURE_HEIGHT),
      visits: visits.createImageData(PICTURE_WIDTH, PICTURE_HEIGHT),
    };
    const image = images.current;
    paintStarts(new Uint32Array(image.starts.data.buffer), run.current, shown, inside);
    starts.putImageData(image.starts, 0, 0);
    if (!run.current) return;
    paintVisits(new Uint32Array(image.visits.data.buffer), run.current, shown);
    visits.putImageData(image.visits, 0, 0);
    const { routes, dots } = run.current.tally(shown);
    if (tally.current) {
      tally.current.textContent = `${count(run.current.tested)} numbers tested · ${counted(routes, "route")} · ${counted(dots, "visit")}`;
      tally.current.dataset.tested = String(run.current.tested);
      tally.current.dataset.routes = String(routes);
      tally.current.dataset.visits = String(dots);
    }
  };

  // Work out the shape only when the reader approaches it.
  useEffect(() => {
    const element = startsCanvas.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        cachedInside ??= insideMap();
        paint.current();
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A band can change while the run goes on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the band is read through a ref
  useEffect(() => paint.current(), [band]);

  // The run is finite and keeps going while the reader scrolls. A hidden tab holds its frames.
  useEffect(() => {
    if (status !== "running") return;
    let frame = 0;
    let painted = 0;
    const tick = (now: number) => {
      const current = run.current;
      if (!current) return;
      current.run(performance.now() + MS_PER_FRAME);
      if (current.finished) {
        paint.current();
        setStatus("done");
        return;
      }
      if (now - painted >= MS_PER_PAINT) {
        paint.current();
        painted = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  const under = (event: PointerEvent<HTMLButtonElement>): OrbitPoint => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: PICTURE.top + ((event.clientY - box.top) / box.height) * PICTURE.height,
      y: PICTURE.left + ((event.clientX - box.left) / box.width) * PICTURE.width,
    };
  };
  const picker = usePointPicker<OrbitPoint>({
    under,
    onChange: spot.keep,
    onHover: spot.tryOut,
  });
  const nudge = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = {
      ArrowLeft: [0, -ARROW_STEP],
      ArrowRight: [0, ARROW_STEP],
      ArrowUp: [-ARROW_STEP, 0],
      ArrowDown: [ARROW_STEP, 0],
    }[event.key];
    if (!step) return;
    event.preventDefault();
    const { x, y } = spot.kept ?? FIRST_NUMBER;
    spot.keep({
      x: Math.min(PICTURE.top + PICTURE.height, Math.max(PICTURE.top, x + step[0])),
      y: Math.min(PICTURE.left + PICTURE.width, Math.max(PICTURE.left, y + step[1])),
    });
  };

  const record = () => {
    if (!spot.value || !route?.escaped) return;
    run.current ??= new RouteRun();
    run.current.addRoute(spot.value, route);
    setRecordings((old) => [...old, route]);
    paint.current();
  };
  const toggleRun = () => {
    if (status === "running") {
      setStatus("paused");
      return;
    }
    // From here the picture holds so many dots that one route's own dots can't be told apart.
    if (status === "idle") {
      setRecordings([]);
      spot.keep(null);
    }
    run.current ??= new RouteRun();
    setStatus("running");
  };
  const clear = () => {
    run.current = new RouteRun();
    setRecordings([]);
    setStatus("idle");
    spot.keep(FIRST_NUMBER);
    paint.current();
  };

  return (
    <LessonFrame title="From one route to a picture" kind="buddhabrot">
      <div className={layout.pair}>
        <div>
          <h3>Chosen numbers</h3>
          <button
            type="button"
            className={layout.map}
            aria-label={`Chosen number ${spot.value ? describe(spot.value) : "none"}. Move the pointer to try another, click or tap to keep it, or use the arrow keys.`}
            {...picker}
            onKeyDown={nudge}
          >
            <canvas
              ref={startsCanvas}
              className={styles.picture}
              width={PICTURE_WIDTH}
              height={PICTURE_HEIGHT}
            />
            <svg viewBox={VIEW_BOX} aria-hidden="true">
              {route && <RouteMarks route={route} />}
            </svg>
          </button>
        </div>
        <div>
          <h3>Visits</h3>
          <div className={`${layout.map} ${styles.visits}`}>
            <canvas
              ref={visitsCanvas}
              className={styles.picture}
              width={PICTURE_WIDTH}
              height={PICTURE_HEIGHT}
            />
            <svg
              viewBox={VIEW_BOX}
              role="img"
              aria-label={`${count(recorded.visits)} visits from ${count(recorded.escaped)} recorded routes`}
              data-recorded-visits={recorded.visits}
              data-recorded-routes={recorded.escaped}
            >
              {Array.from(recorded.cells, (visits, index) =>
                visits > 0 ? (
                  <rect
                    key={index}
                    x={(index % HISTOGRAM_WIDTH) * SQUARE}
                    y={Math.floor(index / HISTOGRAM_WIDTH) * SQUARE}
                    width={SQUARE}
                    height={SQUARE}
                    fill="#f5c56d"
                    opacity={visitOpacity(visits)}
                    data-count={visits}
                  />
                ) : null,
              )}
              {route && <RouteMarks route={route} />}
            </svg>
          </div>
        </div>
      </div>
      <p className={styles.readout} data-route-readout>
        {!spot.value || !route
          ? "Choose a number"
          : route.escaped
            ? `${describe(spot.value)} · escapes after ${counted(route.points.length, "step")} · adds ${counted(added, "visit")}`
            : `${describe(spot.value)} · no escape in ${count(ROUTE_LIMIT)} steps · adds nothing`}
      </p>
      <div className={common.options}>
        <button type="button" disabled={added === 0} onClick={record}>
          Record this route
        </button>
        <button
          type="button"
          disabled={status === "done"}
          onClick={toggleRun}
          data-run-state={status}
        >
          {status === "running"
            ? "Pause"
            : status === "paused"
              ? "Keep testing"
              : "Test 100 million numbers"}
        </button>
        <button type="button" onClick={clear}>
          Clear
        </button>
      </div>
      <fieldset className={common.options} aria-label="Route length">
        {BANDS.map(({ label, band: value }) => (
          <button
            type="button"
            key={label}
            aria-pressed={band === value}
            onClick={() => setBand(value)}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <p ref={tally} className={styles.readout} data-tally />
    </LessonFrame>
  );
}
