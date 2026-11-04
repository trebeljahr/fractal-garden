import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../../styles/lessons/HolomorphicFamilies.module.css";
import common from "../../styles/lessons/Lesson.module.css";
import { useReducedMotion } from "../../utils/hooks/useReducedMotion";
import {
  COPY_GALLERY,
  FAMILY_RULES,
  familyStart,
  flightView,
  type PlaneView,
  startOutcome,
  zoomViewAbout,
} from "../../utils/lessons/holomorphicFamilies";
import type { ComplexPoint } from "../../utils/orbitLesson";
import { createFamilyRenderer, type FamilyFrame } from "../../utils/shaders/familyRenderer";
import { isSidewaysSlide } from "../../utils/touchSlide";
import { LessonFrame } from "./LessonFrame";

const SELECT_PLACE = "family-explorer-place";
const REST_MS = 150;
const MOVING_SCALE = 1.25;
const LARGEST_CANVAS = 2000;
const RING_GRAB_PX = 18;
const CLICK_PX = 4;
const BUTTON_ZOOM = 0.5;

function usePicture(frame: FamilyFrame) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(frame);
  latest.current = frame;
  const redraw = useRef(() => {});
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let stop = () => {};
    const start = () => {
      let renderer = createFamilyRenderer(element);
      let raf = 0;
      let rest = 0;
      const draw = (sharp: boolean) => {
        if (!renderer) return;
        const scale = sharp
          ? window.devicePixelRatio || 1
          : Math.min(window.devicePixelRatio || 1, MOVING_SCALE);
        const size = Math.min(LARGEST_CANVAS, Math.max(1, Math.round(element.clientWidth * scale)));
        renderer.draw({ ...latest.current, sharp }, size);
      };
      const moved = () => {
        window.clearTimeout(rest);
        rest = window.setTimeout(() => draw(true), REST_MS);
        if (!raf)
          raf = requestAnimationFrame(() => {
            raf = 0;
            draw(false);
          });
      };
      draw(true);
      const resized = new ResizeObserver(() => moved());
      resized.observe(element);
      const lost = (event: Event) => {
        event.preventDefault();
        renderer = null;
      };
      const restored = () => {
        renderer = createFamilyRenderer(element);
        draw(true);
      };
      element.addEventListener("webglcontextlost", lost);
      element.addEventListener("webglcontextrestored", restored);
      redraw.current = moved;
      stop = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(rest);
        resized.disconnect();
        element.removeEventListener("webglcontextlost", lost);
        element.removeEventListener("webglcontextrestored", restored);
        renderer?.dispose();
        redraw.current = () => {};
      };
    };
    // Lessons sit far below the explorer. Compile only when one comes near the screen.
    const nearby = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        nearby.disconnect();
        start();
      },
      { rootMargin: "100% 0px" },
    );
    nearby.observe(element);
    return () => {
      nearby.disconnect();
      stop();
    };
  }, []);
  const { rule, family, half } = frame;
  const { real, imaginary } = frame.center;
  const { real: paramReal, imaginary: paramImaginary } = frame.param;
  // biome-ignore lint/correctness/useExhaustiveDependencies: each of these changes the picture
  useEffect(() => {
    redraw.current();
  }, [rule, family, half, real, imaginary, paramReal, paramImaginary]);
  return canvas;
}

type Press = {
  id: number;
  x: number;
  y: number;
  mouse: boolean;
  mode: "ring" | "pan" | "waiting";
  view: PlaneView;
};

function FamilyStage({
  frame,
  widest,
  view,
  onView,
  onPick,
  ring,
  label,
  children,
}: {
  frame: FamilyFrame;
  widest: number;
  view: PlaneView;
  onView: (view: PlaneView) => void;
  onPick?: (point: ComplexPoint) => void;
  ring?: ComplexPoint;
  label: string;
  children?: React.ReactNode;
}) {
  const canvas = usePicture(frame);
  const stage = useRef<HTMLButtonElement>(null);
  const press = useRef<Press | null>(null);
  const armed = useRef(false);
  const current = useRef({ view, onView, widest });
  current.current = { view, onView, widest };

  // Where a screen position falls in a view.
  const toPlane = (clientX: number, clientY: number, seen: PlaneView): ComplexPoint => {
    const box = (stage.current as HTMLButtonElement).getBoundingClientRect();
    return {
      real: seen.center.real + (((clientX - box.left) / box.width) * 2 - 1) * seen.half,
      imaginary: seen.center.imaginary + (1 - ((clientY - box.top) / box.height) * 2) * seen.half,
    };
  };

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const zoomAt = (clientX: number, clientY: number, factor: number) => {
      const { view: seen, onView: send, widest: most } = current.current;
      send(zoomViewAbout(seen, toPlane(clientX, clientY, seen), factor, most));
    };
    // Scrolling past the demo keeps scrolling the page. A pinch always zooms, and a plain
    // scroll zooms once the reader has pressed on the picture and not left it.
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !armed.current) return;
      event.preventDefault();
      zoomAt(
        event.clientX,
        event.clientY,
        Math.exp(event.deltaY * (event.ctrlKey ? 0.012 : 0.003)),
      );
    };
    let pinch: { distance: number } | null = null;
    const fingers = (event: TouchEvent) => {
      const [a, b] = [event.touches[0], event.touches[1]];
      return {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      };
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      press.current = null;
      pinch = { distance: fingers(event).distance };
      if (event.cancelable) event.preventDefault();
    };
    const touchMove = (event: TouchEvent) => {
      if (pinch && event.touches.length === 2) {
        if (event.cancelable) event.preventDefault();
        const now = fingers(event);
        zoomAt(now.x, now.y, pinch.distance / now.distance);
        pinch.distance = now.distance;
      } else if (press.current && press.current.mode !== "waiting" && event.cancelable) {
        event.preventDefault();
      }
    };
    const touchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", touchStart, { passive: false });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", touchEnd);
    return () => {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", touchEnd);
    };
  });

  const nearRing = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!ring) return false;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((ring.real - view.center.real) / view.half + 1) * 0.5 * box.width + box.left;
    const y =
      ((view.center.imaginary - ring.imaginary) / view.half + 1) * 0.5 * box.height + box.top;
    return Math.hypot(event.clientX - x, event.clientY - y) < RING_GRAB_PX;
  };
  const percent = (value: number, center: number, flip = false) =>
    `${(((flip ? center - value : value - center) / view.half + 1) / 2) * 100}%`;

  return (
    <div className={styles.stageBox}>
      <button
        ref={stage}
        type="button"
        className={styles.stage}
        aria-label={label}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          const mouse = event.pointerType === "mouse";
          if (mouse) armed.current = true;
          press.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            mouse,
            mode: nearRing(event) && onPick ? "ring" : mouse ? "pan" : "waiting",
            view,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const held = press.current;
          if (!held || held.id !== event.pointerId) return;
          const dx = event.clientX - held.x;
          const dy = event.clientY - held.y;
          if (!held.mouse && held.mode !== "pan" && !isSidewaysSlide(dx, dy)) return;
          if (held.mode === "ring") {
            onPick?.(toPlane(event.clientX, event.clientY, view));
            return;
          }
          held.mode = "pan";
          const box = event.currentTarget.getBoundingClientRect();
          onView({
            half: held.view.half,
            center: {
              real: held.view.center.real - (dx / box.width) * 2 * held.view.half,
              imaginary: held.view.center.imaginary + (dy / box.height) * 2 * held.view.half,
            },
          });
        }}
        onPointerUp={(event) => {
          const held = press.current;
          if (!held || held.id !== event.pointerId) return;
          const moved = Math.hypot(event.clientX - held.x, event.clientY - held.y);
          if (moved < CLICK_PX) onPick?.(toPlane(event.clientX, event.clientY, view));
          press.current = null;
        }}
        onPointerCancel={() => {
          press.current = null;
        }}
        onLostPointerCapture={() => {
          press.current = null;
        }}
        onPointerLeave={() => {
          if (!press.current) armed.current = false;
        }}
        onKeyDown={(event) => {
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
          };
          const move = moves[event.key];
          if (event.key === "+" || event.key === "=") {
            onView(zoomViewAbout(view, view.center, BUTTON_ZOOM, widest));
          } else if (event.key === "-") {
            onView(zoomViewAbout(view, view.center, 1 / BUTTON_ZOOM, widest));
          } else if (move) {
            event.preventDefault();
            const size = view.half * (event.shiftKey ? 0.1 : 0.02);
            if (onPick && ring) {
              onPick({
                real: ring.real + move[0] * size,
                imaginary: ring.imaginary + move[1] * size,
              });
            } else {
              onView({
                half: view.half,
                center: {
                  real: view.center.real + move[0] * size,
                  imaginary: view.center.imaginary + move[1] * size,
                },
              });
            }
          }
        }}
      >
        <canvas ref={canvas} width={360} height={360} />
        {ring && (
          <span
            className={styles.ring}
            style={{
              left: percent(ring.real, view.center.real),
              top: percent(ring.imaginary, view.center.imaginary, true),
            }}
          />
        )}
        {children}
      </button>
      <div className={styles.zoomButtons}>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => onView(zoomViewAbout(view, view.center, BUTTON_ZOOM, widest))}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => onView(zoomViewAbout(view, view.center, 1 / BUTTON_ZOOM, widest))}
        >
          −
        </button>
      </div>
    </div>
  );
}

const written = (value: number, digits: number) =>
  String(Number(value.toFixed(digits)) + 0).replace("-", "−");
const pair = (p: ComplexPoint, digits: number) =>
  `(${written(p.real, digits)}, ${written(p.imaginary, digits)})`;
const ROOT_NAMES = ["−1", "1", "the third root"];
const ROOT_INK = ["#6fa4ee", "#f0ad58", "#e874ad"];
const NEWTON = 0;

export function FamilyExplorerLesson() {
  const [ruleIndex, setRuleIndex] = useState(NEWTON);
  const rule = FAMILY_RULES[ruleIndex];
  const [param, setParam] = useState<ComplexPoint>(rule.places[0].at);
  const [left, setLeft] = useState<PlaneView>(rule.whole);
  const [right, setRight] = useState<PlaneView>({
    center: { real: 0, imaginary: 0 },
    half: rule.startsHalf,
  });
  const [activePlace, setActivePlace] = useState<number | null>(null);
  const flight = useRef(0);
  const views = useRef({ left, right });
  views.current = { left, right };
  const reduced = useReducedMotion();
  const figure = useRef<HTMLDivElement>(null);

  const stopFlight = () => cancelAnimationFrame(flight.current);
  const flyTo = (toLeft: PlaneView, toRight: PlaneView) => {
    stopFlight();
    if (reduced) {
      setLeft(toLeft);
      setRight(toRight);
      return;
    }
    const fromLeft = views.current.left;
    const fromRight = views.current.right;
    const steps = Math.abs(Math.log(toLeft.half / fromLeft.half));
    const duration = Math.max(600, Math.min(3500, 450 * steps));
    const begun = performance.now();
    flight.current = requestAnimationFrame(function fly(now) {
      const raw = Math.min(1, (now - begun) / duration);
      const t = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
      setLeft(flightView(fromLeft, toLeft, t));
      setRight(flightView(fromRight, toRight, t));
      if (raw < 1) flight.current = requestAnimationFrame(fly);
    });
  };
  const startsCenter = (index: number, c: ComplexPoint) =>
    FAMILY_RULES[index].startsCloseHalf < FAMILY_RULES[index].startsHalf
      ? familyStart(index, c)
      : { real: 0, imaginary: 0 };
  const goToPlace = (index: number, placeIndex: number, startWide: boolean) => {
    const chosen = FAMILY_RULES[index];
    const place = chosen.places[placeIndex];
    if (startWide) {
      setRuleIndex(index);
      setLeft(chosen.whole);
      setRight({ center: { real: 0, imaginary: 0 }, half: chosen.startsHalf });
      views.current = {
        left: chosen.whole,
        right: { center: { real: 0, imaginary: 0 }, half: chosen.startsHalf },
      };
    }
    setParam(place.at);
    setActivePlace(placeIndex);
    flyTo(
      { center: place.at, half: place.half },
      { center: startsCenter(index, place.at), half: chosen.startsCloseHalf },
    );
  };
  const goWhole = () => {
    setActivePlace(null);
    flyTo(rule.whole, { center: { real: 0, imaginary: 0 }, half: rule.startsHalf });
  };
  const chooseRule = (index: number) => {
    stopFlight();
    const chosen = FAMILY_RULES[index];
    setRuleIndex(index);
    setActivePlace(null);
    setParam(chosen.places[0].at);
    setLeft(chosen.whole);
    setRight({ center: { real: 0, imaginary: 0 }, half: chosen.startsHalf });
  };
  // The gallery further down the page opens its pictures here.
  const openPlace = useRef(goToPlace);
  openPlace.current = goToPlace;
  useEffect(() => {
    const open = (event: Event) => {
      const { rule: index, place } = (event as CustomEvent).detail;
      figure.current?.scrollIntoView({ block: "center" });
      openPlace.current(index, place, true);
    };
    window.addEventListener(SELECT_PLACE, open);
    return () => {
      window.removeEventListener(SELECT_PLACE, open);
      cancelAnimationFrame(flight.current);
    };
  }, []);

  const leftFrame: FamilyFrame = {
    rule: rule.shader,
    family: true,
    center: left.center,
    half: left.half,
    param,
    sharp: true,
  };
  const rightFrame: FamilyFrame = {
    rule: rule.shader,
    family: false,
    center: right.center,
    half: right.half,
    param,
    sharp: true,
  };
  const outcome = useMemo(() => startOutcome(ruleIndex, param), [ruleIndex, param]);
  const start = familyStart(ruleIndex, param);
  const digits = left.half < 0.2 ? 4 : 2;
  const zoom = Number((rule.whole.half / left.half).toPrecision(2));
  const pick = (next: ComplexPoint) => {
    stopFlight();
    setActivePlace(null);
    setParam(next);
  };
  const percent = (value: number, center: number, flip = false) =>
    `${(((flip ? center - value : value - center) / right.half + 1) / 2) * 100}%`;
  const inRight = (p: ComplexPoint) => ({
    left: percent(p.real, right.center.real),
    top: percent(p.imaginary, right.center.imaginary, true),
  });
  const roots =
    ruleIndex === NEWTON
      ? [
          { name: "minus", at: { real: -1, imaginary: 0 } },
          { name: "plus", at: { real: 1, imaginary: 0 } },
          { name: "third", at: param },
        ]
      : [];
  const movedLeft = (view: PlaneView) => {
    stopFlight();
    setActivePlace(null);
    setLeft(view);
  };
  const movedRight = (view: PlaneView) => {
    stopFlight();
    setRight(view);
  };
  const said =
    outcome.kind === "root" ? (
      <>
        reaches <span style={{ color: ROOT_INK[outcome.root] }}>{ROOT_NAMES[outcome.root]}</span>
      </>
    ) : outcome.kind === "escape" ? (
      "flies off"
    ) : outcome.kind === "repeat" ? (
      outcome.length === 1 ? (
        "settles on one place"
      ) : (
        `gets trapped in a repeat of ${outcome.length} places`
      )
    ) : (
      "does nothing the demo can name"
    );
  return (
    <LessonFrame title="The whole family, and one member of it" kind="family-explorer">
      <div ref={figure}>
        <div className={common.options}>
          {FAMILY_RULES.map((option, index) => (
            <button
              type="button"
              key={option.name}
              aria-pressed={index === ruleIndex}
              onClick={() => chooseRule(index)}
            >
              {option.name}
            </button>
          ))}
        </div>
        <div className={common.options}>
          <button type="button" aria-pressed={left.half === rule.whole.half} onClick={goWhole}>
            Whole plane
          </button>
          {rule.places.map((place, index) => (
            <button
              type="button"
              key={place.name}
              aria-pressed={index === activePlace}
              onClick={() => goToPlace(ruleIndex, index, false)}
            >
              Copy {place.name}
            </button>
          ))}
        </div>
        <div className={styles.pair}>
          <div>
            <h3>{rule.allTitle}</h3>
            <FamilyStage
              frame={leftFrame}
              widest={rule.whole.half * 1.5}
              view={left}
              onView={movedLeft}
              onPick={pick}
              ring={param}
              label={`Every ${rule.free} for ${rule.name}. The ring is at ${pair(param, 4)}. Click to move the ring, drag to pan, pinch to zoom, or use the arrow keys and plus and minus.`}
            />
          </div>
          <div>
            <h3>{rule.oneTitle}</h3>
            <FamilyStage
              frame={rightFrame}
              widest={rule.startsHalf * 1.5}
              view={right}
              onView={movedRight}
              label={`Every ${rule.start} for ${rule.name} with ${pair(param, 4)}. Black if it never settles or flies off. Drag to pan, pinch to zoom.`}
            >
              {roots.map(({ name, at }) => (
                <span key={name} className={styles.root} style={inRight(at)} />
              ))}
              <span className={styles.start} style={inRight(start)} />
            </FamilyStage>
          </div>
        </div>
        <p data-family-readout>
          {pair(param, digits)}, zoom ×{zoom}. From the white dot, the route {said}.
        </p>
        <p className={styles.hint}>
          Click to move the ring, drag to pan, pinch or click and scroll to zoom.
        </p>
      </div>
    </LessonFrame>
  );
}

const TILE_PX = 420;

export function FamilyCopiesLesson() {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = grid.current;
    if (!box) return;
    let frame = 0;
    let cancelled = false;
    const nearby = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        nearby.disconnect();
        const scratch = document.createElement("canvas");
        const renderer = createFamilyRenderer(scratch);
        if (!renderer) return;
        const tiles = Array.from(box.querySelectorAll("canvas"));
        // One picture per frame, so a large gallery never holds up the page.
        let next = 0;
        const paintNext = () => {
          if (cancelled || next >= tiles.length) {
            renderer.dispose();
            return;
          }
          const [ruleIndex, placeIndex] = COPY_GALLERY[next];
          const rule = FAMILY_RULES[ruleIndex];
          const place = rule.places[placeIndex];
          const size = Math.min(TILE_PX, Math.round(tiles[next].clientWidth * 2) || TILE_PX);
          renderer.draw(
            {
              rule: rule.shader,
              family: true,
              center: place.at,
              half: place.half,
              param: place.at,
              sharp: true,
            },
            size,
          );
          tiles[next].width = size;
          tiles[next].height = size;
          tiles[next].getContext("2d")?.drawImage(scratch, 0, 0);
          next++;
          frame = requestAnimationFrame(paintNext);
        };
        frame = requestAnimationFrame(paintNext);
      },
      { rootMargin: "100% 0px" },
    );
    nearby.observe(box);
    return () => {
      cancelled = true;
      nearby.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <LessonFrame title="The same shape, in different rules" kind="family-copies">
      <div ref={grid} className={styles.gallery}>
        {COPY_GALLERY.map(([ruleIndex, placeIndex]) => {
          const rule = FAMILY_RULES[ruleIndex];
          const place = rule.places[placeIndex];
          return (
            <button
              type="button"
              key={`${ruleIndex}:${placeIndex}`}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(SELECT_PLACE, {
                    detail: { rule: ruleIndex, place: placeIndex },
                  }),
                )
              }
            >
              <span className={styles.caption}>
                {rule.name}
                <br />
                near {pair(place.at, 3)}
              </span>
              <canvas width={TILE_PX} height={TILE_PX} />
            </button>
          );
        })}
      </div>
    </LessonFrame>
  );
}
