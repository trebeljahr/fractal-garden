import Link from "next/link";
import {
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../styles/Garden.module.css";
import {
  type BuiltPlant,
  buildPlant,
  generationLimit,
  isStoredGarden,
  MAX_PLANTS,
  makePlant,
  type Plant,
  SPECIES,
  type Species,
  starterGarden,
} from "../utils/garden/model";
import {
  DEFAULT_CAMERA,
  drawGarden,
  findPlant,
  type GardenView,
  gardenSummary,
  type Hit,
  projection,
} from "../utils/garden/render";
import type { Dimension } from "../utils/lsystem/spec";

const STORAGE_KEY = "fractal-garden:experimental-bed:v1";

function PlantGlyph({ species }: { species: Species }) {
  const paths: Record<Species, string> = {
    tree: "M24 45V26m0 8L12 23m12 5L35 16M12 23l-3-9m3 9-8-2m20 5-5-12m16 2 2-9m-2 9 8-3m-19 8 5-12M19 14l-6-5",
    fern: "M15 46Q32 19 29 5M20 36l-10-5m13-2L11 22m15 0-10-9m12 2-6-9m-4 28 14 1m-11-9 14 1m-12-9 11-1m-9-7 8-2",
    spire: "M24 46V5m0 6-5 8m5-8 5 8m-5-1-10 9m10-9 10 9m-10-1-15 9m15-9 15 9m-15-1-18 9m18-9 18 9",
    shrub:
      "M24 46V31m0 8L12 28m12 8 13-12m-13 7-4-12m-8 9-5-9m30 5 3-10M7 16v6m-3-3h6m7-4v7m-3-3h6m17-5v7m-3-3h6m-8 13v6m-3-3h6",
    rosette:
      "M24 40Q4 38 8 20q13 0 16 20Zm0 0q-4-26 7-32 12 17-7 32Zm0 0q1-21 19-19 0 19-19 19Zm0 0Q3 17 17 8q12 9 7 32Zm0 0q-12-1-17-8m17 8 10-10",
  };
  return (
    <svg
      viewBox="0 0 48 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={paths[species]} />
    </svg>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.range}>
      <span>
        {label}
        <output>
          {Number(value.toFixed(2))}
          {unit}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function GardenCanvas({
  canvasRef,
  plants,
  view,
  tool,
  onSelect,
  onMove,
  onCamera,
}: {
  canvasRef: RefObject<HTMLCanvasElement>;
  plants: Plant[];
  view: GardenView;
  tool: "arrange" | "orbit";
  onSelect: (id: number | null) => void;
  onMove: (id: number, x: number, z: number) => void;
  onCamera: (yaw: number, pitch: number) => void;
}) {
  const cache = useRef(new Map<number, { key: string; built: BuiltPlant }>());
  const built = useMemo(() => {
    const next = new Map<number, { key: string; built: BuiltPlant }>();
    const result = plants.map((plant) => {
      const key = [
        view.dimension,
        plant.species,
        plant.angle,
        plant.iterations,
        plant.ratio,
        plant.seed,
      ].join(":");
      const previous = cache.current.get(plant.id);
      const geometry = previous?.key === key ? previous.built : buildPlant(plant, view.dimension);
      next.set(plant.id, { key, built: geometry });
      return { ...geometry, plant };
    });
    cache.current = next;
    return result;
  }, [plants, view.dimension]);
  const hits = useRef<Hit[]>([]);
  const size = useRef({ width: 1, height: 1 });
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    id: number | null;
    rootX: number;
    rootY: number;
    z: number;
    yaw: number;
    pitch: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let last = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const render = (time: number) => {
      if (!view.wind || reduced || time - last > 40) {
        hits.current = drawGarden(
          ctx,
          size.current.width,
          size.current.height,
          built,
          { ...view, wind: view.wind && !reduced },
          time,
        );
        last = time;
      }
      if (view.wind && !reduced) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      size.current = { width: rect.width, height: rect.height };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hits.current = drawGarden(
        ctx,
        rect.width,
        rect.height,
        built,
        { ...view, wind: view.wind && !reduced },
        performance.now(),
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (view.wind && !reduced) frame = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [built, canvasRef, view]);

  const localPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      data-tool={tool}
      tabIndex={0}
      aria-label={`${view.dimension === "3d" ? "3D" : "2D"} garden. ${tool === "orbit" ? "Drag to orbit. Arrow keys rotate the camera." : "Select a plant, then drag to move it. Arrow keys move the selected plant."} Plant controls are also available in the inspector.`}
      onPointerDown={(event) => {
        if (drag.current || event.button !== 0) return;
        const p = localPoint(event);
        const id = findPlant(hits.current, p.x, p.y);
        const plant = plants.find((candidate) => candidate.id === id);
        const root = hits.current.find((hit) => hit.id === id);
        drag.current = {
          pointer: event.pointerId,
          ...p,
          id,
          rootX: root?.x ?? p.x,
          rootY: root?.y ?? p.y,
          z: plant?.z ?? 0,
          yaw: view.camera.yaw,
          pitch: view.camera.pitch,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
        if (id !== null) onSelect(id);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || event.pointerId !== start.pointer) return;
        const p = localPoint(event);
        const dx = p.x - start.x,
          dy = p.y - start.y;
        if (Math.hypot(dx, dy) < 4 && !start.moved) return;
        start.moved = true;
        if (tool === "orbit" && view.dimension === "3d")
          onCamera(start.yaw + dx * 0.008, Math.max(0.1, Math.min(1.15, start.pitch + dy * 0.005)));
        else if (start.id !== null) {
          const [x, z] = projection(size.current.width, size.current.height, view).ground(
            start.rootX + dx,
            start.rootY + dy,
            start.z,
          );
          onMove(start.id, x, z);
        }
      }}
      onPointerUp={(event) => {
        const start = drag.current;
        if (!start || start.pointer !== event.pointerId) return;
        if (!start.moved) onSelect(start.id);
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (tool === "orbit" && view.dimension === "3d")
          onCamera(
            view.camera.yaw + dx * 0.1,
            Math.max(0.1, Math.min(1.15, view.camera.pitch + dy * 0.05)),
          );
        else {
          const plant = plants.find((candidate) => candidate.id === view.selected);
          if (plant)
            onMove(
              plant.id,
              Math.max(-4.5, Math.min(4.5, plant.x + dx * 0.15)),
              Math.max(-3, Math.min(3, plant.z + dy * 0.15)),
            );
        }
      }}
    >
      Your garden uses Canvas. Select and edit plants with the controls beside this view.
    </canvas>
  );
}

export default function GardenExplorer() {
  const [plants, setPlants] = useState(starterGarden);
  const [selected, setSelected] = useState<number | null>(1);
  const [dimension, setDimension] = useState<Dimension>("3d");
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const [tool, setTool] = useState<"arrange" | "orbit">("orbit");
  const [growth, setGrowth] = useState(100);
  const [growing, setGrowing] = useState(false);
  const [wind, setWind] = useState(false);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previous, setPrevious] = useState<Plant[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(9);
  const plant = plants.find((candidate) => candidate.id === selected);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (isStoredGarden(stored)) {
        setPlants(stored);
        setSelected(stored[0]?.id ?? null);
        nextId.current = Math.max(0, ...stored.map((item) => item.id)) + 1;
      }
    } catch {
      /* Storage can be disabled; the garden still works. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [plants, ready]);

  useEffect(() => {
    if (!growing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(now - last, 100);
      last = now;
      setGrowth((value) => Math.min(100, value + delta / 45));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [growing]);
  useEffect(() => {
    if (growth >= 100) setGrowing(false);
  }, [growth]);

  const update = useCallback((id: number, patch: Partial<Plant>) => {
    setPlants((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);
  const move = useCallback((id: number, x: number, z: number) => update(id, { x, z }), [update]);
  const orbit = useCallback(
    (yaw: number, pitch: number) => setCamera((current) => ({ ...current, yaw, pitch })),
    [],
  );
  const view = useMemo<GardenView>(
    () => ({ dimension, camera, growth: growth / 100, selected, wind }),
    [dimension, camera, growth, selected, wind],
  );

  const add = (species: Species) => {
    if (plants.length >= MAX_PLANTS) return;
    const id = nextId.current++;
    const angle = id * 2.39996;
    const added = makePlant(species, id, Math.cos(angle) * 2.8, 0.6 + Math.sin(angle) * 1.6);
    setPrevious(plants);
    setPlants([...plants, added]);
    setSelected(id);
    setGrowth(100);
    setGrowing(false);
  };
  const switchDimension = (value: Dimension) => {
    setDimension(value);
    setTool(value === "3d" ? "orbit" : "arrange");
  };
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `fractal-garden-${dimension}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <main className={styles.garden}>
      <header className={styles.header}>
        <Link href="/" className={styles.home} aria-label="Back to Fractal Garden">
          ← <span>Fractal Garden</span>
        </Link>
        <span className={styles.dev}>
          Experimental <span>· development only</span>
        </span>
        <button type="button" onClick={saveImage} className={styles.save}>
          Save image
        </button>
      </header>
      <div className={styles.workspace}>
        <section className={styles.stage} aria-label="Garden workspace">
          <GardenCanvas
            canvasRef={canvasRef}
            plants={plants}
            view={view}
            tool={tool}
            onSelect={setSelected}
            onMove={move}
            onCamera={orbit}
          />
          <div className={styles.stageTitle}>
            <p className={styles.eyebrow}>A study in growing forms</p>
            <h1>The garden</h1>
            <p>Plant a rule. See what grows.</p>
          </div>
          <fieldset className={styles.viewControls} aria-label="Garden view">
            <div className={styles.segmented}>
              <button
                type="button"
                aria-pressed={dimension === "2d"}
                onClick={() => switchDimension("2d")}
              >
                2D
              </button>
              <button
                type="button"
                aria-pressed={dimension === "3d"}
                onClick={() => switchDimension("3d")}
              >
                3D
              </button>
            </div>
            {dimension === "3d" && (
              <div className={styles.segmented}>
                <button
                  type="button"
                  aria-pressed={tool === "orbit"}
                  onClick={() => setTool("orbit")}
                >
                  Orbit
                </button>
                <button
                  type="button"
                  aria-pressed={tool === "arrange"}
                  onClick={() => setTool("arrange")}
                >
                  Arrange
                </button>
              </div>
            )}
          </fieldset>
          <div className={styles.stageBottom}>
            <span>
              {tool === "orbit"
                ? "Drag to orbit · select a plant to edit"
                : "Drag a plant to move it"}
            </span>
            <div>
              <button
                type="button"
                aria-label="Zoom out"
                disabled={camera.zoom <= 0.65}
                onClick={() => setCamera({ ...camera, zoom: Math.max(0.65, camera.zoom - 0.15) })}
              >
                −
              </button>
              <button type="button" onClick={() => setCamera(DEFAULT_CAMERA)}>
                Reset view
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={camera.zoom >= 1.8}
                onClick={() => setCamera({ ...camera, zoom: Math.min(1.8, camera.zoom + 0.15) })}
              >
                +
              </button>
            </div>
          </div>
          {plants.length === 0 && (
            <div className={styles.empty}>
              An empty bed.<span>Choose a plant from the seed library.</span>
            </div>
          )}
        </section>
        <aside className={styles.inspector} aria-label="Garden controls">
          <section className={styles.library}>
            <div className={styles.sectionHeading}>
              <h2>Seed library</h2>
              <span>01 — 05</span>
            </div>
            <p>Add a form to your garden.</p>
            <div className={styles.seeds}>
              {(Object.keys(SPECIES) as Species[]).map((species) => (
                <button
                  key={species}
                  type="button"
                  onClick={() => add(species)}
                  disabled={plants.length >= MAX_PLANTS}
                  aria-label={`Plant ${SPECIES[species].name.toLowerCase()}`}
                  title={SPECIES[species].detail}
                  style={{ color: SPECIES[species].color }}
                >
                  <PlantGlyph species={species} />
                  <span>
                    {species === "tree"
                      ? "Tree"
                      : species === "shrub"
                        ? "Shrub"
                        : SPECIES[species].name}
                  </span>
                  <span className={styles.addMark} aria-hidden="true">
                    +
                  </span>
                </button>
              ))}
            </div>
            {plants.length >= MAX_PLANTS && (
              <p role="status">Bed full. Remove a plant to add another.</p>
            )}
          </section>
          <section className={styles.specimen}>
            <div className={styles.sectionHeading}>
              <h2>Specimen</h2>
              <span>{plant ? String(plant.id).padStart(2, "0") : "—"}</span>
            </div>
            <label className={styles.selectLabel}>
              <span className="screen-reader-only">Selected plant</span>
              <select
                value={selected ?? ""}
                onChange={(event) => setSelected(Number(event.target.value))}
              >
                <option value="" disabled>
                  Select a plant
                </option>
                {plants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {String(item.id).padStart(2, "0")} / {SPECIES[item.species].name}
                  </option>
                ))}
              </select>
            </label>
            {plant ? (
              <>
                <p className={styles.plantDetail}>{SPECIES[plant.species].detail}</p>
                <Range
                  label="Height"
                  min={0.4}
                  max={5}
                  step={0.05}
                  value={plant.size}
                  unit="×"
                  onChange={(size) => update(plant.id, { size })}
                />
                <Range
                  label={plant.species === "rosette" ? "Divergence" : "Branch angle"}
                  min={10}
                  max={plant.species === "rosette" ? 160 : 65}
                  step={0.5}
                  value={plant.angle}
                  unit="°"
                  onChange={(angle) => update(plant.id, { angle })}
                />
                <Range
                  label={plant.species === "rosette" ? "Leaf whorls" : "Generations"}
                  min={2}
                  max={generationLimit(plant.species)}
                  value={plant.iterations}
                  onChange={(iterations) => update(plant.id, { iterations })}
                />
                {plant.species !== "rosette" && (
                  <Range
                    label="Branch ratio"
                    min={0.5}
                    max={0.88}
                    step={0.01}
                    value={plant.ratio}
                    onChange={(ratio) => update(plant.id, { ratio })}
                  />
                )}
                <Range
                  label={dimension === "3d" ? "Rotation" : "Lean"}
                  min={-180}
                  max={180}
                  value={plant.rotation}
                  unit="°"
                  onChange={(rotation) => update(plant.id, { rotation })}
                />
                <div className={styles.pair}>
                  <Range
                    label="Across"
                    min={-4.5}
                    max={4.5}
                    step={0.05}
                    value={plant.x}
                    onChange={(x) => update(plant.id, { x })}
                  />
                  <Range
                    label="Depth"
                    min={-3}
                    max={3}
                    step={0.05}
                    value={plant.z}
                    onChange={(z) => update(plant.id, { z })}
                  />
                </div>
                <div className={styles.colorRow}>
                  <label>
                    Leaf color{" "}
                    <input
                      aria-label="Leaf color"
                      type="color"
                      value={plant.color}
                      onChange={(event) => update(plant.id, { color: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => update(plant.id, { seed: plant.seed + 1 })}
                    disabled={plant.species === "rosette"}
                  >
                    New variation ↻
                  </button>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={plants.length >= MAX_PLANTS}
                    onClick={() => {
                      const id = nextId.current++;
                      setPrevious(plants);
                      setPlants([
                        ...plants,
                        {
                          ...plant,
                          id,
                          x: Math.min(4.5, plant.x + 0.6),
                          z: Math.min(3, plant.z + 0.3),
                        },
                      ]);
                      setSelected(id);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrevious(plants);
                      const remaining = plants.filter((item) => item.id !== plant.id);
                      setPlants(remaining);
                      setSelected(remaining[0]?.id ?? null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.noSelection}>
                Select a plant in the garden, or add one from the seed library.
              </p>
            )}
          </section>
          <section className={styles.growth}>
            <div className={styles.sectionHeading}>
              <h2>Growth</h2>
              <button
                type="button"
                onClick={() => {
                  if (growth >= 100) setGrowth(0);
                  setGrowing(!growing);
                }}
              >
                {growing ? "Pause Ⅱ" : growth >= 100 ? "Replay ↻" : "Grow ▷"}
              </button>
            </div>
            <Range
              label="Development"
              min={0}
              max={100}
              value={growth}
              unit="%"
              onChange={(value) => {
                setGrowing(false);
                setGrowth(value);
              }}
            />
            <label className={styles.breeze}>
              <input
                type="checkbox"
                checked={wind}
                onChange={(event) => setWind(event.target.checked)}
              />{" "}
              Gentle breeze
            </label>
          </section>
          <section className={styles.bedActions}>
            <div>
              <button
                type="button"
                onClick={() => {
                  setPrevious(plants);
                  setPlants(starterGarden());
                  setSelected(1);
                  nextId.current = 9;
                  setGrowth(100);
                  setGrowing(false);
                }}
              >
                Starter garden
              </button>
              <button
                type="button"
                disabled={!plants.length}
                onClick={() => {
                  setPrevious(plants);
                  setPlants([]);
                  setSelected(null);
                }}
              >
                Empty bed
              </button>
              <button
                type="button"
                disabled={!previous}
                onClick={() => {
                  if (!previous) return;
                  setPlants(previous);
                  setSelected(previous[0]?.id ?? null);
                  nextId.current = Math.max(nextId.current, ...previous.map((item) => item.id + 1));
                  setPrevious(null);
                }}
              >
                Undo
              </button>
            </div>
            <p aria-live="polite">
              {gardenSummary(plants)}
              <br />
              {saved ? "Saved on this device" : "Changes stay in this tab"}
            </p>
          </section>
          <details className={styles.about}>
            <summary>About the garden</summary>
            <p>
              Branching forms use L-systems: repeated rules draw smaller branches. Rosettes use
              golden-angle phyllotaxis. These are plant studies, not botanical simulations.
            </p>
            <a href="https://algorithmicbotany.org/papers/#abop" target="_blank" rel="noreferrer">
              The Algorithmic Beauty of Plants
            </a>
            <a
              href="https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/"
              target="_blank"
              rel="noreferrer"
            >
              Fractals to Forests, Codrops
            </a>
            <Link href="/l-system/explorer">Explore the L-system rules</Link>
          </details>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>
          Fractal Garden <span aria-hidden="true">/</span> Garden laboratory
        </span>
        <span>
          {dimension === "3d" ? "Perspective study" : "Botanical elevation"}{" "}
          <span aria-hidden="true">·</span> {plants.length} / {MAX_PLANTS} plants
        </span>
      </footer>
    </main>
  );
}
