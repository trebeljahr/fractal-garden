import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../styles/FractalConstruction.module.css";
import { constructionFrame } from "../utils/constructionFrame";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import type { RendererKind } from "../utils/render/registry";
import { LessonFrame, LessonSteps } from "./lessons/LessonFrame";

export type ConstructionSpec = {
  identity: string;
  kind: RendererKind;
  params: unknown;
  width: number;
  height: number;
  min: number;
  max: number;
  stepDelay?: number;
};

const ConstructionContext = createContext<ConstructionSpec | null>(null);
const RegistrationContext = createContext<Dispatch<SetStateAction<ConstructionSpec | null>>>(
  () => {},
);

export function FractalConstructionProvider({ children }: { children: ReactNode }) {
  const [construction, setConstruction] = useState<ConstructionSpec | null>(null);
  return (
    <RegistrationContext.Provider value={setConstruction}>
      <ConstructionContext.Provider value={construction}>{children}</ConstructionContext.Provider>
    </RegistrationContext.Provider>
  );
}

export function useConstructionRegistration(construction: ConstructionSpec | null) {
  const register = useContext(RegistrationContext);
  useEffect(() => {
    register(construction);
    return () => register(null);
  }, [register, construction]);
}

function ConstructionSurface({ spec, level }: { spec: ConstructionSpec; level: number }) {
  const params = useMemo(
    () => constructionFrame(spec.kind, spec.params, level, spec.width, spec.height),
    [spec.kind, spec.params, spec.width, spec.height, level],
  );
  const { containerRef } = useRenderSurface({
    kind: spec.kind,
    params,
    width: 720,
    height: 480,
    shareView: false,
  });
  return <div ref={containerRef} className={styles.surface} />;
}

function ConstructionSequence({ spec }: { spec: ConstructionSpec }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [compare, setCompare] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const max = Math.max(0, spec.max - spec.min);
  const selected = Math.min(step, max);
  const level = spec.min + selected;

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <LessonFrame title="Watch the construction" kind="full-construction">
      <p>Step forward to see each replacement. Compare it with the level before.</p>
      <div ref={frame} className={compare && selected > 0 ? styles.comparison : styles.single}>
        {compare && selected > 0 && (
          <div key="previous" className={styles.previous}>
            <p>Before · level {level - 1}</p>
            <div
              className={styles.frame}
              role="img"
              aria-label={`Previous construction at level ${level - 1}`}
            >
              {visible && <ConstructionSurface spec={spec} level={level - 1} />}
            </div>
          </div>
        )}
        <div key="current" className={styles.current}>
          <p>
            {selected ? "Now" : "Start"} · level {level}
          </p>
          <div
            className={styles.frame}
            role="img"
            aria-label={`Fractal construction at level ${level}`}
            data-construction-level={level}
          >
            {visible && <ConstructionSurface spec={spec} level={level} />}
          </div>
        </div>
      </div>
      <p aria-live="polite" aria-atomic="true">
        Construction level {level}
      </p>
      <LessonSteps
        label="Fractal construction"
        step={selected}
        max={max}
        onChange={setStep}
        duration={max * Math.max(1500, spec.stepDelay ?? 0)}
      />
      <label className={styles.compareControl}>
        <input
          type="checkbox"
          checked={compare}
          onChange={(event) => setCompare(event.target.checked)}
        />
        Compare with previous level
      </label>
    </LessonFrame>
  );
}

export function FractalConstruction() {
  const spec = useContext(ConstructionContext);
  return spec ? <ConstructionSequence key={spec.identity} spec={spec} /> : null;
}
