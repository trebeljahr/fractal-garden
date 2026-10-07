import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../styles/LSystemExplorer.module.css";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { isStochastic, MAX_SEGMENTS } from "../utils/lsystem/engine";
import {
  type Camera,
  createRenderer,
  DEFAULT_CAMERA,
  FLAT_CAMERA,
  flatFit,
  type Renderer,
  type Viewport,
  viewFor,
} from "../utils/lsystem/render";
import { decodeSpec, encodeSpec, githubSubmitUrl, presetJson } from "../utils/lsystem/share";
import { dimensionOf, LIMITS, type LSystemSpec, type Rule, slugify } from "../utils/lsystem/spec";
import type { WorkerRequest, WorkerResult, ZoomRequest, ZoomResult } from "../utils/lsystem/worker";
import { MAX_ZOOM, type ZoomDetail, type ZoomView } from "../utils/lsystem/zoom";
import { scrollToDescription } from "../utils/scrollToDescription";
import { WebGLCanvas } from "./Canvas";
import { Listbox, ToggleSwitch } from "./PanelPickers";

export type Preset = { slug: string; spec: LSystemSpec };

type Props = { presets: Preset[] };

type Field = { kind: "axiom" } | { kind: "rule"; index: number };

const COLOR_MODES: { value: LSystemSpec["colorMode"]; label: string }[] = [
  { value: "gradient", label: "Along the path" },
  { value: "depth", label: "By branch depth" },
  { value: "solid", label: "Single color" },
];

type SymbolHelp = { symbol: string; text: (spec: LSystemSpec) => string };

// A negative angle swaps each pair of directions, so the text names the
// way the turtle actually turns: "turn left by 25°", not "right by -25°".
const turn = (spec: LSystemSpec, verb: string, positive: string, negative: string) =>
  `${verb} ${spec.angle < 0 ? negative : positive} by ${Math.abs(spec.angle)}°`;

// The turtle's alphabet, grouped the way people tend to learn it. Texts use
// the current values, so "turn by the angle" reads as "turn by 25.7°".
const SYMBOL_GROUPS: { title: string; symbols: SymbolHelp[] }[] = [
  {
    title: "Move",
    symbols: [
      { symbol: "F", text: () => "Draw a line one step forward." },
      { symbol: "G", text: () => "Also draws a step, so rules can grow F and G differently." },
      { symbol: "f", text: () => "Move one step forward without drawing." },
    ],
  },
  {
    title: "Turn",
    symbols: [
      { symbol: "+", text: (spec) => `${turn(spec, "Turn", "right", "left")}.` },
      { symbol: "-", text: (spec) => `${turn(spec, "Turn", "left", "right")}.` },
      { symbol: "|", text: () => "Turn around." },
    ],
  },
  {
    title: "Branch",
    symbols: [
      { symbol: "[", text: () => "Start a branch. The turtle remembers where it is." },
      { symbol: "]", text: () => "End the branch. The turtle jumps back to where [ was." },
    ],
  },
  {
    title: "3D (any of these makes the system 3D)",
    symbols: [
      { symbol: "&", text: (spec) => `${turn(spec, "Tip the nose", "down", "up")}.` },
      { symbol: "^", text: (spec) => `${turn(spec, "Tip the nose", "up", "down")}.` },
      {
        symbol: "\\",
        text: (spec) => `${turn(spec, "Roll", "left", "right")}, around the heading.`,
      },
      {
        symbol: "/",
        text: (spec) => `${turn(spec, "Roll", "right", "left")}, around the heading.`,
      },
      { symbol: "$", text: () => "Roll back level, so the turtle's top faces the sky." },
    ],
  },
  {
    title: "Size",
    symbols: [
      { symbol: ">", text: (spec) => `Make later steps shorter (× ${spec.lengthFactor}).` },
      { symbol: "<", text: (spec) => `Make later steps longer (÷ ${spec.lengthFactor}).` },
      { symbol: "!", text: (spec) => `Make later lines thinner (× ${spec.widthFactor}).` },
      { symbol: "#", text: (spec) => `Make later lines thicker (÷ ${spec.widthFactor}).` },
    ],
  },
];

const PANEL_WIDTH = 392;
const GROWTH_DELAY = 900;

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function download(filename: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

// Without endless zoom, past this the lines would only get blurry.
const PLAIN_ZOOM_LIMIT = 500;

function clampZoom(zoom: number, limit = PLAIN_ZOOM_LIMIT) {
  return Math.min(Math.max(zoom, 0.05), limit);
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function sameSpec(a: LSystemSpec, b: LSystemSpec) {
  return encodeSpec(a) === encodeSpec(b);
}

export const LSystemExplorer = ({ presets }: Props) => {
  const [spec, setSpec] = useState<LSystemSpec>(presets[0].spec);
  const [presetSlug, setPresetSlug] = useState(presets[0].slug);
  const [linkErrors, setLinkErrors] = useState<string[]>([]);
  const [shownIterations, setShownIterations] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [computing, setComputing] = useState(true);
  const [failed, setFailed] = useState(false);
  const { width, height } = useWindowSize();

  const jobSpecRef = useRef<LSystemSpec | null>(null);
  // The system the current drawing was made from.
  const resultSpecRef = useRef<LSystemSpec | null>(null);
  const cameraRef = useRef<Camera>(
    presets[0].spec.dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA },
  );
  const frameRef = useRef(0);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const activeField = useRef<Field>({ kind: "axiom" });
  const hydrated = useRef(false);

  // Load a shared system from the URL hash once on mount.
  useEffect(() => {
    const match = window.location.hash.match(/[#&]s=([^&]+)/);
    const presetMatch = window.location.hash.match(/[#&]preset=([^&]+)/);
    if (match) {
      const decoded = decodeSpec(match[1]);
      if (decoded) {
        setSpec(decoded.spec);
        setLinkErrors(decoded.errors);
        const preset = presets.find((p) => sameSpec(p.spec, decoded.spec));
        setPresetSlug(preset?.slug ?? "");
        cameraRef.current =
          decoded.spec.dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA };
      } else {
        setLinkErrors(["This share link could not be read."]);
      }
    } else if (presetMatch) {
      const preset = presets.find((p) => p.slug === presetMatch[1]);
      if (preset) {
        setSpec(preset.spec);
        setPresetSlug(preset.slug);
        cameraRef.current =
          preset.spec.dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA };
      }
    }
    hydrated.current = true;
  }, [presets]);

  // Keep the URL shareable while editing, without adding history entries.
  const debouncedSpec = useDebounced(spec, 120);
  useEffect(() => {
    if (!hydrated.current) return;
    const id = setTimeout(() => {
      const hash = presetSlug ? `#preset=${presetSlug}` : `#s=${encodeSpec(debouncedSpec)}`;
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }, 250);
    return () => clearTimeout(id);
  }, [debouncedSpec, presetSlug]);

  const iterations = shownIterations ?? debouncedSpec.iterations;

  // Rewriting and the turtle run in a worker so typing never waits for them.
  // A worker cannot be interrupted mid-job, so a busy one is replaced, and
  // only the answer to the latest request is kept.
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const jobRef = useRef(0);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const id = ++jobRef.current;
    if (busyRef.current) {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    let worker = workerRef.current;
    if (!worker) {
      worker = new Worker(new URL("../utils/lsystem/worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        busyRef.current = false;
        if (event.data.id !== jobRef.current) return;
        resultSpecRef.current = jobSpecRef.current;
        setResult(event.data);
        setFailed(false);
        setComputing(false);
      };
      worker.onerror = () => {
        busyRef.current = false;
        setFailed(true);
        setComputing(false);
      };
      workerRef.current = worker;
    }
    busyRef.current = true;
    setComputing(true);
    const request: WorkerRequest = { id, spec: debouncedSpec, iterations };
    jobSpecRef.current = debouncedSpec;
    worker.postMessage(request);
  }, [debouncedSpec, iterations]);

  const style = useMemo(
    () => ({
      color: debouncedSpec.color,
      colorEnd: debouncedSpec.colorEnd,
      colorMode: debouncedSpec.colorMode,
      background: debouncedSpec.background,
      lineWidth: debouncedSpec.lineWidth,
    }),
    [
      debouncedSpec.color,
      debouncedSpec.colorEnd,
      debouncedSpec.colorMode,
      debouncedSpec.background,
      debouncedSpec.lineWidth,
    ],
  );

  useEffect(() => {
    if (!gl) return;
    const created = createRenderer(gl);
    setRenderer(created);
    setUnsupported(!created);
    return () => created?.dispose();
  }, [gl]);

  const viewport = useMemo<Viewport | null>(() => {
    if (!width || !height) return null;
    // On wide screens fit the drawing into the space beside the open panel.
    const offset = panelOpen && width > 900 ? PANEL_WIDTH + 24 : 0;
    return { x: offset, y: 0, width: width - offset, height };
  }, [width, height, panelOpen]);

  // Endless zoom for 2D systems. A second worker redraws only the visible
  // part, at a generation deep enough for the zoom, whenever the view
  // changes. Until its answer arrives the last one is stretched into place.
  const zoomWorkerRef = useRef<Worker | null>(null);
  const zoomBusyRef = useRef(false);
  const zoomPendingRef = useRef<ZoomRequest | null>(null);
  const zoomJobRef = useRef(0);
  // Answers to requests made before the drawing last changed are dropped.
  const zoomValidFromRef = useRef(1);
  const detailRef = useRef<ZoomDetail | null>(null);
  const zoomLimitRef = useRef(PLAIN_ZOOM_LIMIT);
  const requestDrawRef = useRef<() => void>(() => {});
  const [zoomInfo, setZoomInfo] = useState<{ generation: number; lines: number } | null>(null);
  const [zoomReason, setZoomReason] = useState<string | null>(null);

  useEffect(
    () => () => {
      zoomWorkerRef.current?.terminate();
      zoomWorkerRef.current = null;
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new drawing invalidates the detail
  useEffect(() => {
    zoomValidFromRef.current = zoomJobRef.current + 1;
    detailRef.current = null;
    setZoomInfo(null);
    setZoomReason(null);
  }, [result]);

  const sendZoom = useCallback((request: ZoomRequest) => {
    if (zoomBusyRef.current) {
      zoomPendingRef.current = request;
      return;
    }
    let worker = zoomWorkerRef.current;
    if (!worker) {
      worker = new Worker(new URL("../utils/lsystem/worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<ZoomResult>) => {
        zoomBusyRef.current = false;
        const pending = zoomPendingRef.current;
        zoomPendingRef.current = null;
        if (pending) sendZoom(pending);
        const { id, detail, reason } = event.data;
        if (id < zoomValidFromRef.current) return;
        if (!detail) {
          zoomLimitRef.current = PLAIN_ZOOM_LIMIT;
          setZoomReason(reason);
          return;
        }
        zoomLimitRef.current = MAX_ZOOM;
        if (cameraRef.current.zoom <= 1) return;
        detailRef.current = detail;
        setZoomInfo({ generation: detail.generation, lines: detail.count });
        requestDrawRef.current();
      };
      worker.onerror = () => {
        zoomBusyRef.current = false;
      };
      zoomWorkerRef.current = worker;
    }
    zoomBusyRef.current = true;
    worker.postMessage(request);
  }, []);

  const scheduleZoom = useCallback(() => {
    const spec = resultSpecRef.current;
    const camera = cameraRef.current;
    if (!result || !viewport || !spec || spec.dimension !== "2d" || camera.zoom <= 1) {
      if (detailRef.current) {
        detailRef.current = null;
        setZoomInfo(null);
      }
      return;
    }
    const scale = camera.zoom * flatFit(result.geometry, viewport);
    // A margin around the view, so short drags show finished detail.
    const view: ZoomView = {
      centerX: result.center[0] - camera.panX / scale,
      centerY: result.center[1] + camera.panY / scale,
      scale,
      halfWidth: viewport.width * 0.65,
      halfHeight: viewport.height * 0.65,
      zoom: camera.zoom,
    };
    sendZoom({ id: ++zoomJobRef.current, spec, iterations: result.expansion.iterations, view });
  }, [result, viewport, sendZoom]);

  const draw = useCallback(() => {
    if (!renderer || !viewport) return;
    renderer.draw(
      result,
      style,
      debouncedSpec.dimension,
      cameraRef.current,
      viewport,
      debouncedSpec.dimension === "2d" ? detailRef.current : null,
    );
  }, [renderer, viewport, result, style, debouncedSpec.dimension]);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
    scheduleZoom();
  }, [draw, scheduleZoom]);
  requestDrawRef.current = requestDraw;

  useEffect(() => {
    requestDraw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [requestDraw]);

  useEffect(() => {
    if (!autoRotate || debouncedSpec.dimension !== "3d") return;
    let id = 0;
    const tick = () => {
      cameraRef.current.yaw += 0.005;
      draw();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [autoRotate, debouncedSpec.dimension, draw]);

  // "Play growth" steps through every generation up to the chosen one.
  useEffect(() => {
    if (shownIterations === null) return;
    const id = setTimeout(() => {
      setShownIterations((current) =>
        current === null || current >= spec.iterations ? null : current + 1,
      );
    }, GROWTH_DELAY);
    return () => clearTimeout(id);
  }, [shownIterations, spec.iterations]);

  // The first edit to a preset turns it into the visitor's own system, so the
  // preset's name and credits do not travel along into share links or submissions.
  const detach = (old: LSystemSpec): LSystemSpec =>
    presetSlug
      ? { ...old, name: `My ${old.name}`, author: undefined, description: undefined }
      : old;

  // The dimension follows the symbols: typing the first & ^ \ / or $ turns
  // the view 3D, removing the last one flattens it again.
  const withDimension = (next: LSystemSpec): LSystemSpec => {
    const dimension = dimensionOf(next);
    if (dimension === next.dimension) return next;
    cameraRef.current = dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA };
    return { ...next, dimension };
  };

  const update = (patch: Partial<LSystemSpec>) => {
    setSpec((old) => withDimension({ ...detach(old), ...patch }));
    setPresetSlug("");
    setShownIterations(null);
  };

  const updateRule = (index: number, patch: Partial<Rule>) => {
    setSpec((old) =>
      withDimension({
        ...detach(old),
        rules: old.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
      }),
    );
    setPresetSlug("");
  };

  const loadPreset = (slug: string) => {
    const preset = presets.find((p) => p.slug === slug);
    if (!preset) return;
    setSpec(preset.spec);
    setPresetSlug(slug);
    setLinkErrors([]);
    setShownIterations(null);
    cameraRef.current = preset.spec.dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA };
  };

  const resetView = () => {
    cameraRef.current = spec.dimension === "3d" ? { ...DEFAULT_CAMERA } : { ...FLAT_CAMERA };
    requestDraw();
  };

  const fieldKey = (field: Field) => (field.kind === "axiom" ? "axiom" : `rule-${field.index}`);

  // Symbol buttons type into whichever text field was focused last.
  const insertSymbol = (symbol: string) => {
    const field = activeField.current;
    const input = inputs.current.get(fieldKey(field));
    const current = field.kind === "axiom" ? spec.axiom : spec.rules[field.index]?.replacement;
    if (current === undefined) return;

    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + symbol + current.slice(end);

    if (field.kind === "axiom") update({ axiom: next });
    else updateRule(field.index, { replacement: next });

    requestAnimationFrame(() => {
      const target = inputs.current.get(fieldKey(field));
      if (!target) return;
      target.focus();
      target.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };

  const registerInput = (field: Field) => (element: HTMLInputElement | null) => {
    if (element) inputs.current.set(fieldKey(field), element);
    else inputs.current.delete(fieldKey(field));
  };

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(message);
    } catch {
      flash("Copying is blocked in this browser.");
    }
  };

  const shareLink = () =>
    `${window.location.origin}${window.location.pathname}#s=${encodeSpec(spec)}`;

  const savePng = () => {
    if (!canvas) return;
    // The drawing buffer is only guaranteed until the frame is shown, so draw
    // and read it in the same task.
    draw();
    download(`${slugify(spec.name)}.png`, canvas.toDataURL("image/png"));
  };

  // Pointer handling: drag to orbit (3D) or pan (2D), shift-drag or right-drag
  // to pan in 3D, wheel or pinch to zoom, double click to reset.
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // Moves the drawing with the cursor. In 3D this shifts the orbit center in
  // the screen plane, so later orbits turn around the new spot.
  const pan = (dx: number, dy: number) => {
    const camera = cameraRef.current;
    if (debouncedSpec.dimension === "2d" || !result || !viewport) {
      camera.panX += dx;
      camera.panY += dy;
      return;
    }
    const view = viewFor(camera, result.radius, viewport);
    const k = view.distance / view.focal;
    camera.targetX += (-view.right[0] * dx + view.up[0] * dy) * k;
    camera.targetY += (-view.right[1] * dx + view.up[1] * dy) * k;
    camera.targetZ += (-view.right[2] * dx + view.up[2] * dy) * k;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const camera = cameraRef.current;

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const other = a === previous ? b : a;
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      // Pan with the midpoint, then zoom around where it is now, so the spot
      // between the fingers stays under them.
      pan(dx / 2, dy / 2);
      if (before > 0) {
        zoomAt((event.clientX + other.x) / 2, (event.clientY + other.y) / 2, after / before);
      }
    } else if (debouncedSpec.dimension === "2d" || event.shiftKey || event.buttons === 2) {
      pan(dx, dy);
    } else {
      // Orbit freely, over the top and underneath. Upside down, a sideways
      // drag still turns the drawing the way the cursor moves.
      camera.yaw += dx * 0.008 * (Math.cos(camera.pitch) < 0 ? -1 : 1);
      camera.pitch = wrapAngle(camera.pitch + dy * 0.008);
    }

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    requestDraw();
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
  };

  const stageRef = useRef<HTMLDivElement | null>(null);

  // Scales the view by `factor` while the drawing point under the given
  // screen position stays where it is.
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const stage = stageRef.current;
    if (!stage || !viewport) return;
    const camera = cameraRef.current;
    const zoom = clampZoom(
      camera.zoom * factor,
      debouncedSpec.dimension === "2d" ? zoomLimitRef.current : PLAIN_ZOOM_LIMIT,
    );
    const k = zoom / camera.zoom;
    const rect = stage.getBoundingClientRect();
    const cx = clientX - rect.left - (viewport.x + viewport.width / 2);
    const cy = clientY - rect.top - (viewport.y + viewport.height / 2);
    if (debouncedSpec.dimension === "3d" && result) {
      // Move the eye towards the spot under the cursor, at the orbit
      // center's depth.
      const view = viewFor(camera, result.radius, viewport);
      const step = (view.distance / view.focal) * (1 - 1 / k);
      camera.targetX += (view.right[0] * cx - view.up[0] * cy) * step;
      camera.targetY += (view.right[1] * cx - view.up[1] * cy) * step;
      camera.targetZ += (view.right[2] * cx - view.up[2] * cy) * step;
    } else {
      camera.panX = cx - (cx - camera.panX) * k;
      camera.panY = cy - (cy - camera.panY) * k;
    }
    camera.zoom = zoom;
    requestDraw();
  };
  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Registered natively because React's wheel listener is passive.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Some mice report lines or pages instead of pixels.
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? stage.clientHeight
            : 1;
      // Trackpad pinches arrive as wheel events with ctrlKey and small deltas.
      const speed = event.ctrlKey ? 0.01 : 0.0015;
      zoomAtRef.current(event.clientX, event.clientY, Math.exp(-event.deltaY * unit * speed));
    };
    // Safari reports trackpad pinches as gesture events instead, and zooms
    // the whole page unless they are cancelled.
    let gestureScale = 1;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale: number; clientX: number; clientY: number };
      zoomAtRef.current(gesture.clientX, gesture.clientY, gesture.scale / gestureScale);
      gestureScale = gesture.scale;
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("gesturestart", onGestureStart);
    stage.addEventListener("gesturechange", onGestureChange);
    return () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("gesturestart", onGestureStart);
      stage.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  const expansion = result?.expansion ?? { length: 0, iterations: 0, limited: false };
  const geometry = result?.geometry ?? { count: 0, limited: false, warnings: [] as string[] };
  const stochastic = isStochastic(spec.rules);
  const ruleCounts = spec.rules.reduce<Record<string, number>>((counts, rule) => {
    counts[rule.symbol] = (counts[rule.symbol] ?? 0) + 1;
    return counts;
  }, {});
  const weightTotals = spec.rules.reduce<Record<string, number>>((totals, rule) => {
    totals[rule.symbol] = (totals[rule.symbol] ?? 0) + (rule.weight ?? 1);
    return totals;
  }, {});
  const chance = (rule: Rule) => {
    const percent = ((rule.weight ?? 1) / weightTotals[rule.symbol]) * 100;
    return `${percent < 1 && percent > 0 ? percent.toFixed(1) : Math.round(percent)}%`;
  };
  const missingSymbols = spec.rules.filter((rule) => !rule.symbol).length;
  const drawsNothing = geometry.count === 0;
  const pending = spec !== debouncedSpec || computing;

  const presets2d = presets.filter((p) => p.spec.dimension === "2d");
  const presets3d = presets.filter((p) => p.spec.dimension === "3d");

  return (
    <>
      <div
        className={styles.stage}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={resetView}
        onContextMenu={(event) => event.preventDefault()}
      >
        <WebGLCanvas setGl={setGl} setCnv={setCanvas} width={width} height={height} />
      </div>

      {!panelOpen && (
        <button className={styles.reopen} onClick={() => setPanelOpen(true)} type="button">
          Edit rules
        </button>
      )}

      <aside className={styles.panel} hidden={!panelOpen} aria-label="L-system editor">
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>L-System Explorer</h1>
            <p className={styles.subtitle}>Write rewriting rules and watch them grow.</p>
          </div>
          <button className={styles.ghost} onClick={() => setPanelOpen(false)} type="button">
            Hide
          </button>
        </header>

        {linkErrors.length > 0 && (
          <ul className={styles.errors}>
            {linkErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <section className={styles.section}>
          <span className={styles.label} id="lsystem-preset-label">
            Preset
          </span>
          <Listbox
            className={styles.picker}
            labelledBy="lsystem-preset-label"
            value={presetSlug}
            onChange={loadPreset}
            groups={[
              ...(presetSlug
                ? []
                : [{ options: [{ value: "", label: `Your edit: ${spec.name}` }] }]),
              {
                label: "2D",
                options: presets2d.map((p) => ({ value: p.slug, label: p.spec.name })),
              },
              {
                label: "3D",
                options: presets3d.map((p) => ({ value: p.slug, label: p.spec.name })),
              },
            ]}
          />
          {spec.description && <p className={styles.hint}>{spec.description}</p>}
        </section>

        <section className={styles.section}>
          <label className={styles.label} htmlFor="lsystem-axiom">
            Axiom <span className={styles.labelHint}>generation 0, before any rule runs</span>
          </label>
          <input
            id="lsystem-axiom"
            className={styles.code}
            value={spec.axiom}
            maxLength={LIMITS.axiomLength}
            spellCheck={false}
            autoComplete="off"
            ref={registerInput({ kind: "axiom" })}
            onFocus={() => {
              activeField.current = { kind: "axiom" };
            }}
            onChange={(event) => update({ axiom: event.target.value })}
          />

          <div className={styles.label}>
            Rules{" "}
            <span className={styles.labelHint}>
              each generation, every left symbol becomes its right side
            </span>
          </div>
          <div className={styles.rules}>
            {spec.rules.map((rule, index) => (
              <div className={styles.rule} key={`${index}-${spec.rules.length}`}>
                <input
                  aria-label={`Symbol for rule ${index + 1}`}
                  className={`${styles.code} ${styles.symbol}`}
                  value={rule.symbol}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => {
                    const chars = Array.from(event.target.value.replace(/\s/g, ""));
                    updateRule(index, { symbol: chars[chars.length - 1] ?? "" });
                  }}
                />
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
                <input
                  aria-label={`Replacement for rule ${index + 1}`}
                  className={styles.code}
                  value={rule.replacement}
                  maxLength={LIMITS.replacementLength}
                  spellCheck={false}
                  autoComplete="off"
                  ref={registerInput({ kind: "rule", index })}
                  onFocus={() => {
                    activeField.current = { kind: "rule", index };
                  }}
                  onChange={(event) => updateRule(index, { replacement: event.target.value })}
                />
                {ruleCounts[rule.symbol] > 1 && (
                  <label className={styles.weight}>
                    <input
                      aria-label={`Weight for rule ${index + 1}`}
                      title="Weight: compared with the other rules for the same symbol"
                      className={styles.code}
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={rule.weight ?? 1}
                      onChange={(event) =>
                        updateRule(index, {
                          weight: Math.max(Number(event.target.value) || 0.01, 0.01),
                        })
                      }
                    />
                    <span className={styles.chance}>{chance(rule)}</span>
                  </label>
                )}
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove rule ${index + 1}`}
                  onClick={() => update({ rules: spec.rules.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.ghost}
            disabled={spec.rules.length >= LIMITS.rules}
            onClick={() => {
              update({ rules: [...spec.rules, { symbol: "", replacement: "" }] });
            }}
          >
            + Add rule
          </button>
          {stochastic && (
            <p className={styles.hint}>
              When a symbol has several rules, each copy of it picks one at random every generation.
              The number is the rule's weight, and the percentage below it is the chance that
              results: its weight divided by the total for that symbol. Change the random seed under
              Advanced to grow a different variant.
            </p>
          )}
        </section>

        <details className={styles.section} open>
          <summary className={styles.summary}>Symbols</summary>
          <p className={styles.hint}>
            The turtle reads the final string from left to right. Click a symbol to type it into the
            field you last used.
          </p>
          {SYMBOL_GROUPS.map((group) => (
            <div key={group.title} className={styles.symbolGroup}>
              <span className={styles.symbolGroupTitle}>{group.title}</span>
              {group.symbols.map((help) => (
                <div key={help.symbol} className={styles.symbolRow}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-label={`Insert ${help.symbol}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertSymbol(help.symbol)}
                  >
                    {help.symbol}
                  </button>
                  <span className={styles.hint}>{help.text(spec)}</span>
                </div>
              ))}
            </div>
          ))}
          <p className={styles.hint}>
            Any other letter, like X or A, draws nothing. It marks a spot where a rule can grow
            something in the next generation.
          </p>
        </details>

        <section className={styles.section}>
          <Slider
            label="Iterations"
            min={0}
            max={LIMITS.iterations}
            step={1}
            value={spec.iterations}
            onChange={(iterations) => update({ iterations })}
          />
          <Slider
            label="Angle"
            min={-180}
            max={180}
            step={0.5}
            value={spec.angle}
            unit="°"
            onChange={(angle) => update({ angle })}
          />
          <div className={styles.row}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setShownIterations(shownIterations === null ? 0 : null)}
            >
              {shownIterations === null ? "Play growth" : `Growing… ${shownIterations}`}
            </button>
            {spec.dimension === "3d" && (
              <div className={styles.check}>
                <ToggleSwitch
                  checked={autoRotate}
                  labelledBy="lsystem-auto-rotate-label"
                  onChange={setAutoRotate}
                />
                <span id="lsystem-auto-rotate-label">Auto rotate</span>
              </div>
            )}
          </div>
        </section>

        <details className={styles.section}>
          <summary className={styles.summary}>Look</summary>
          <div className={styles.colors}>
            <ColorInput label="Color" value={spec.color} onChange={(color) => update({ color })} />
            <ColorInput
              label="Color end"
              value={spec.colorEnd}
              onChange={(colorEnd) => update({ colorEnd })}
            />
            <ColorInput
              label="Backdrop"
              value={spec.background}
              onChange={(background) => update({ background })}
            />
          </div>
          <span className={styles.label} id="lsystem-color-mode-label">
            Coloring
          </span>
          <Listbox
            className={styles.picker}
            labelledBy="lsystem-color-mode-label"
            value={spec.colorMode}
            onChange={(colorMode) => update({ colorMode: colorMode as LSystemSpec["colorMode"] })}
            options={COLOR_MODES}
          />
          <Slider
            label="Line width"
            min={0.25}
            max={12}
            step={0.25}
            value={spec.lineWidth}
            onChange={(lineWidth) => update({ lineWidth })}
          />
          <Slider
            label="Start direction"
            min={-180}
            max={180}
            step={1}
            unit="°"
            value={spec.startAngle}
            onChange={(startAngle) => update({ startAngle })}
          />
        </details>

        <details className={styles.section}>
          <summary className={styles.summary}>Advanced</summary>
          <Slider
            label="Length factor (> <)"
            min={0.05}
            max={2}
            step={0.01}
            value={spec.lengthFactor}
            onChange={(lengthFactor) => update({ lengthFactor })}
          />
          <Slider
            label="Width factor (! #)"
            min={0.05}
            max={2}
            step={0.01}
            value={spec.widthFactor}
            onChange={(widthFactor) => update({ widthFactor })}
          />
          <TextField
            label="Drawing symbols"
            value={spec.drawSymbols}
            onChange={(drawSymbols) => update({ drawSymbols })}
          />
          <TextField
            label="Moving symbols"
            value={spec.moveSymbols}
            onChange={(moveSymbols) => update({ moveSymbols })}
          />
          <div className={styles.row}>
            <Slider
              label="Random seed"
              min={0}
              max={9999}
              step={1}
              value={spec.seed}
              onChange={(seed) => update({ seed })}
            />
          </div>
          <p className={styles.hint}>The seed only matters when a symbol has several rules.</p>
        </details>

        <section className={styles.stats} aria-live="polite">
          <span>
            {pending ? "Drawing…" : `Generation ${expansion.iterations}`} ·{" "}
            {expansion.length.toLocaleString("en-US")} symbols ·{" "}
            {(result?.lines ?? 0).toLocaleString("en-US")} lines
          </span>
          {spec.dimension === "2d" && zoomInfo && (
            <span>
              Zoomed in: generation {zoomInfo.generation} · {zoomInfo.lines.toLocaleString("en-US")}{" "}
              lines in view
            </span>
          )}
          {spec.dimension === "2d" && zoomReason && (
            <span className={styles.warning}>Zooming in cannot add detail here: {zoomReason}.</span>
          )}
          {expansion.limited && (
            <span className={styles.warning}>
              Stopped at generation {expansion.iterations}: the next one is too long to draw.
            </span>
          )}
          {geometry.limited && (
            <span className={styles.warning}>
              Showing the first {MAX_SEGMENTS.toLocaleString("en-US")} lines.
            </span>
          )}
          {unsupported && (
            <span className={styles.warning}>This browser cannot draw with WebGL.</span>
          )}
          {failed && !pending && (
            <span className={styles.warning}>Drawing failed. Try fewer iterations.</span>
          )}
          {missingSymbols > 0 && (
            <span className={styles.warning}>A rule has no symbol and is ignored.</span>
          )}
          {drawsNothing && !pending && (
            <span className={styles.warning}>
              Nothing to draw yet. Use a drawing symbol ({spec.drawSymbols || "none set"}) in the
              axiom or a rule.
            </span>
          )}
          {geometry.warnings.map((warning) => (
            <span className={styles.warning} key={warning}>
              {warning}
            </span>
          ))}
        </section>

        <section className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => setSubmitOpen(true)}>
            Submit as preset
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => copy(shareLink(), "Link copied.")}
          >
            Copy link
          </button>
          <button type="button" className={styles.ghost} onClick={savePng}>
            Save PNG
          </button>
          <button type="button" className={styles.ghost} onClick={resetView}>
            Reset view
          </button>
          <button type="button" className={styles.ghost} onClick={scrollToDescription}>
            How it works
          </button>
        </section>
        <p className={styles.hint}>
          {spec.dimension === "3d"
            ? "Drag to orbit, shift-drag to pan, scroll to zoom, double-click to reset."
            : "Drag to pan, scroll to zoom, double-click to reset. Zooming in grows later generations where you look."}
        </p>
        {notice && <p className={styles.notice}>{notice}</p>}
      </aside>

      {submitOpen && (
        <SubmitDialog
          spec={spec}
          onChange={(patch) => {
            setSpec((old) => ({ ...old, ...patch }));
            setPresetSlug("");
          }}
          onClose={() => setSubmitOpen(false)}
          onCopy={() => copy(presetJson(spec), "JSON copied.")}
          taken={presets.some((p) => p.slug === slugify(spec.name))}
        />
      )}
    </>
  );
};

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
};

const Slider = ({ label, min, max, step, value, unit = "", onChange }: SliderProps) => {
  const id = `lsystem-${slugify(label)}`;
  return (
    <div className={styles.slider}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.valueBox}>
        <input
          aria-label={`${label} value`}
          className={styles.number}
          type="number"
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
        {unit}
      </span>
    </div>
  );
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className={styles.color}>
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    <span>{label}</span>
  </label>
);

const TextField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const id = `lsystem-${slugify(label)}`;
  return (
    <div>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.code}
        value={value}
        maxLength={40}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

type SubmitProps = {
  spec: LSystemSpec;
  taken: boolean;
  onChange: (patch: Partial<LSystemSpec>) => void;
  onClose: () => void;
  onCopy: () => void;
};

const SubmitDialog = ({ spec, taken, onChange, onClose, onCopy }: SubmitProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const filename = `${slugify(spec.name)}.json`;

  return (
    <dialog className={styles.dialog} ref={dialogRef} onClose={onClose}>
      <h2 className={styles.title}>Submit as preset</h2>
      <p className={styles.hint}>
        Presets live as JSON files in the <code>lsystem-presets</code> folder of the Fractal Garden
        repository. The button below opens GitHub with your file filled in. Click{" "}
        <em>Commit changes</em> there. GitHub then forks the repository and opens a pull request for
        you. You need a GitHub account.
      </p>

      <label className={styles.label} htmlFor="lsystem-submit-name">
        Name
      </label>
      <input
        id="lsystem-submit-name"
        className={styles.code}
        value={spec.name}
        maxLength={LIMITS.nameLength}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      {taken && (
        <p className={styles.warning}>A preset named {filename} already exists. Pick a new name.</p>
      )}

      <label className={styles.label} htmlFor="lsystem-submit-author">
        Your name <span className={styles.labelHint}>optional</span>
      </label>
      <input
        id="lsystem-submit-author"
        className={styles.code}
        value={spec.author ?? ""}
        maxLength={LIMITS.nameLength}
        onChange={(event) => onChange({ author: event.target.value || undefined })}
      />

      <label className={styles.label} htmlFor="lsystem-submit-description">
        Description <span className={styles.labelHint}>optional</span>
      </label>
      <textarea
        id="lsystem-submit-description"
        className={styles.code}
        rows={3}
        value={spec.description ?? ""}
        maxLength={LIMITS.textLength}
        onChange={(event) => onChange({ description: event.target.value || undefined })}
      />

      <pre className={styles.preview}>{presetJson(spec)}</pre>

      <div className={styles.actions}>
        <a
          className={styles.primary}
          href={githubSubmitUrl(spec)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={taken || !spec.name.trim()}
          onClick={(event) => {
            if (taken || !spec.name.trim()) event.preventDefault();
          }}
        >
          Open pull request on GitHub
        </a>
        <button type="button" className={styles.ghost} onClick={onCopy}>
          Copy JSON
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() =>
            download(
              filename,
              `data:application/json;charset=utf-8,${encodeURIComponent(presetJson(spec))}`,
            )
          }
        >
          Download JSON
        </button>
        <button type="button" className={styles.ghost} onClick={() => dialogRef.current?.close()}>
          Close
        </button>
      </div>
    </dialog>
  );
};
